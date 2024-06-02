import { Application } from "./application";
import { Entity } from "./entity";
import { CameraComponent, RenderComponent, TransformComponent } from "./components";
import { UserError } from "./usererror";
import { clamp } from "../math";
import { Mat4, MatMut4 } from "../math/mat";
import { Material } from "../material";
import { Mesh } from "./mesh";
import { Color } from "../math/color";

interface InstanceData {
  modelMatrix: Mat4,
  color: Color,
}

interface InstanceRenderBuffers {
  capacity: number,

  bindgroup: GPUBindGroup,
  dataArray: Float32Array,
  dataBuffer: GPUBuffer,
}

export class InstanceGroup {
  #members: Set<Entity> = new Set();
  #anyDataChange: boolean = false;
  #datas: Map<Entity, InstanceData> = new Map();

  public static readonly INSTANCE_DATA_SIZE = (4 * 16) + (4 * 4);

  public readonly renderer: Renderer;

  public readonly mesh: Mesh;
  public readonly material: Material;

  public buffers: InstanceRenderBuffers | null = null;

  public get members(): Readonly<Set<Entity>> {
    return this.#members;
  }

  constructor (
    mesh: Mesh,
    material: Material,
  ) {
    this.mesh = mesh;
    this.material = material;

    if (mesh.renderer !== material.renderer)
      throw new Error("wrong");

    this.renderer = mesh.renderer;
  }

  private reallocIfNeeded(): InstanceRenderBuffers {
    const targetCapacity = 2 ** Math.ceil(Math.log2(this.#members.size));
    const device = this.renderer.device;

    if (this.buffers === null || this.buffers.capacity !== targetCapacity) {
      const buffer = this.renderer.device.createBuffer({
        label: "instance buffer",
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        size: InstanceGroup.INSTANCE_DATA_SIZE * targetCapacity,
      });
      this.buffers = {
        capacity: targetCapacity,

        bindgroup: device.createBindGroup({
          layout: this.material.pipeline.getBindGroupLayout(0),
          entries: [
            { binding: 0, resource: { buffer: this.renderer.sceneUniformsBuffer } },
            { binding: 1, resource: { buffer: buffer } },
          ],
        }),
        dataArray: new Float32Array(targetCapacity * InstanceGroup.INSTANCE_DATA_SIZE / 4),
        dataBuffer: buffer,
      };
    }

    return this.buffers;
  }

  public prune() {
    this.#members = new Set([...this.#members].filter(member => {
      if (!member.isSpawned)
        return false;
      return member.isSpawned && member.components.has(TransformComponent) &&
        member.components.has(RenderComponent);
    }));
  }

  public push(entity: Entity) {
    if (this.#members.has(entity))
      throw new Error("Entity already inside instance group");
    this.#members.add(entity);
  }

  public setEntityData(entity: Entity, data: InstanceData) {
    this.#datas.set(entity, data);
    this.#anyDataChange = true;
  }

  public upload() {
    if (this.buffers && !this.#anyDataChange)
      return;
    this.#anyDataChange = false;

    const { dataArray, dataBuffer, } = this.reallocIfNeeded();

    let index = 0;
    for (const member of this.#members) {
      const start = index * (InstanceGroup.INSTANCE_DATA_SIZE/4);
      const data = this.#datas.get(member);
      if (!data)
        continue;

      dataArray.set(data.modelMatrix.transpose().vals, start);
      dataArray.set(data.color.vals, start + 16);

      index += 1;
    }

    const size = this.#members.size * InstanceGroup.INSTANCE_DATA_SIZE;
    this.renderer.device.queue.writeBuffer(
      dataBuffer, 0,
      dataArray, 0,
      // only copy what's actually used
      size / 4
    );
  }

  public draw(encoder: GPURenderPassEncoder | GPURenderBundleEncoder) {
    if (this.buffers === null)
      throw new Error("cannot draw if never uploaded");

    encoder.setPipeline(this.material.pipeline);

    encoder.setBindGroup(0, this.buffers.bindgroup);
    for (const bg of this.material.customBindGroups) {
      encoder.setBindGroup(bg.target, bg.bg);
    }

    encoder.setVertexBuffer(0, this.mesh.positionsBuffer);
    encoder.setVertexBuffer(1, this.mesh.normalsBuffer);
    encoder.setVertexBuffer(2, this.mesh.uvsBuffer);

    const vc = this.mesh.positionsBuffer.size / (3*4);
    encoder.draw(vc, this.#members.size);
  }
}

export class Renderer {
  public application: Application;
  public canvas: HTMLCanvasElement;

  public ctx: GPUCanvasContext;
  public adapter: GPUAdapter;
  public device: GPUDevice;

  public sampleCount: number = 4;
  public renderTarget: GPUTexture | null = null;
  public renderTargetView: GPUTextureView | null = null;
  public depthTexture: GPUTexture | null = null;
  public depthTextureView: GPUTextureView | null = null;

  public sceneUniformsBuffer: GPUBuffer;
  public instanceGroups: InstanceGroup[] = [];

  public mainCamera: Entity | null = null;

  public presentationFormat: GPUTextureFormat;

  public static async create(
    application: Application,
    canvas: HTMLCanvasElement,
  ): Promise<Renderer> {
    const adapter = await navigator.gpu?.requestAdapter();
    const device = await adapter?.requestDevice({
      requiredFeatures: [
        "float32-filterable",
      ]
    });
    if (!adapter || !device) {
      throw new UserError("Could not request adapter");
    }

    return new Renderer(application, canvas, adapter, device);
  }

  private constructor(
    application: Application,
    canvas: HTMLCanvasElement,
    adapter: GPUAdapter,
    device: GPUDevice,
  ) {
    const ctx = canvas.getContext("webgpu");
    if (!ctx) {
      throw new UserError("Could not get webgpu context");
    }

    this.application = application;
    this.canvas = canvas;

    this.ctx = ctx;
    this.adapter = adapter;
    this.device = device;

    this.sceneUniformsBuffer = device.createBuffer({
      size: 16 * 4,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM,
    });
    this.presentationFormat = navigator.gpu.getPreferredCanvasFormat();

    ctx.configure({
      device,
      format: this.presentationFormat,
    });
  }

  public drawCallCount(): number {
    return this.instanceGroups.length;
  }

  public resize() {
    const device = this.device;

    const width = clamp(this.canvas.width, 1, device.limits.maxTextureDimension2D);
    const height = clamp(this.canvas.height, 1, device.limits.maxTextureDimension2D);

    if (this.depthTexture?.width === this.canvas.width
      && this.depthTexture?.height === this.canvas.height)
      return;

    this.renderTarget?.destroy();
    this.depthTexture?.destroy();

    if (this.sampleCount > 1) {
      this.renderTarget = device.createTexture({
        size: [width, height],
        format: this.presentationFormat,
        sampleCount: this.sampleCount,
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
      });
      this.renderTargetView = this.renderTarget.createView();
    }
    else {
      this.renderTarget = null;
      this.renderTargetView = null;
    }

    this.depthTexture = device.createTexture({
      size: [width, height],
      format: "depth24plus",
      sampleCount: this.sampleCount,
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });
    this.depthTextureView = this.depthTexture.createView();
  }

  private findOrCreateInstanceGroup(mesh: Mesh, material: Material): InstanceGroup {
    for (const ig of this.instanceGroups) {
      if (ig.mesh === mesh && ig.material === material)
        return ig;
    }
    const ig = new InstanceGroup(mesh, material);
    this.instanceGroups.push(ig);
    return ig;
  }
  
  private updateInstanceGroups() {
    for (const ig of this.instanceGroups)
      ig.prune();

    const outMat1 = new MatMut4();
    const outMat2 = new MatMut4();

    const update = (entity: Entity, worldTransform: MatMut4 | null) => {
      const renderComp = entity.components.get(RenderComponent);
      if (!renderComp)
        return;
      const transform = entity.components.get(TransformComponent);
      if (!transform)
        return;
      const mesh = renderComp.mesh;
      const material = renderComp.material;

      const modelMatrix = worldTransform === null
        ? transform.modelToWorld(outMat1)
        : worldTransform.mul(transform.modelToWorld(outMat1), outMat2);

      if (renderComp.instanceGroup === null) {
        renderComp.instanceGroup = this.findOrCreateInstanceGroup(mesh, material);
        renderComp.instanceGroup.push(entity);
      }

      renderComp.instanceGroup.setEntityData(entity, {
        color: renderComp.color,
        modelMatrix: modelMatrix.clone().freeze(),
      });
    };
    const updateRec = (entity: Entity, worldTransform: MatMut4 | null, forceUpdate: boolean) => {
      const require = entity.components.get(RenderComponent)?.requireUpdate ?? false;
      if (forceUpdate || require)
        update(entity, worldTransform);

      if (entity.children.size === 0)
        return;
        
      const transform = entity.components.get(TransformComponent);
      if (transform) {
        worldTransform = worldTransform 
          ? worldTransform.mul(transform.modelToWorld())
          : transform.modelToWorld();
      }
      for (const child of entity.children) {
        updateRec(child, worldTransform, forceUpdate || require);
      }
    };
    for (const entity of this.application.entities) {
      updateRec(entity, null, false);
    }

    for (const ig of this.instanceGroups)
      ig.upload();
  }

  public render() {
    const cameraEntity = this.mainCamera;
    if (!cameraEntity)
      return;
    const device = this.device;

    this.resize();

    const cameraComponent = cameraEntity.components.unwrap_get(CameraComponent);
    const clearColor = cameraComponent.clearColor;

    cameraComponent.aspect = this.canvas.width / this.canvas.height;

    const viewMatrix = cameraComponent.view();
    const projectionMatrix = cameraComponent.projection();

    const viewProjMatrix = projectionMatrix.mul(viewMatrix);

    this.device.queue.writeBuffer(
      this.sceneUniformsBuffer, 0,
      new Float32Array([...viewProjMatrix.transpose().vals]),
    );

    const renderPassDescriptor: GPURenderPassDescriptor = {
      colorAttachments: [
        {
          view: this.renderTargetView ?? this.ctx.getCurrentTexture().createView(),
          resolveTarget: this.renderTargetView !== null ? this.ctx.getCurrentTexture().createView() : undefined,
          clearValue: clearColor ? {
            r: clearColor.r, g: clearColor.g, b: clearColor.b, a: clearColor.a,
          } : undefined,
          loadOp: clearColor === null ? "load" : "clear",
          storeOp: 'store',
        },
      ],
      depthStencilAttachment: this.depthTextureView === null ? undefined : {
        view: this.depthTextureView,
        depthClearValue: 1,
        depthLoadOp: 'clear',
        depthStoreOp: 'store',
      },
    };

    this.updateInstanceGroups();
    
    const commandEncoder = device.createCommandEncoder();
    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);

    for (const ig of this.instanceGroups)
      ig.draw(passEncoder);

    passEncoder.end();
    device.queue.submit([commandEncoder.finish()]);
  }
}
