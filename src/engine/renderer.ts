import { Application } from "./application";
import { Entity } from "./entity";
import { CameraComponent, MeshComponent, TransformComponent } from "./components";
import { UserError } from "./usererror";
import { clamp } from "../math";

export class Renderer {
  public application: Application;
  public canvas: HTMLCanvasElement;

  public ctx: GPUCanvasContext;
  public adapter: GPUAdapter;
  public device: GPUDevice;

  public sampleCount: number = 1;
  public renderTarget: GPUTexture | null = null;
  public renderTargetView: GPUTextureView | null = null;
  public depthTexture: GPUTexture | null = null;
  public depthTextureView: GPUTextureView | null = null;

  public mainCamera: Entity | null = null;

  public presentationFormat: GPUTextureFormat;

  public static async create(
    application: Application,
    canvas: HTMLCanvasElement,
  ): Promise<Renderer> {
    const adapter = await navigator.gpu?.requestAdapter()
    const device = await adapter?.requestDevice();
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

    this.presentationFormat = navigator.gpu.getPreferredCanvasFormat();

    ctx.configure({
      device,
      format: this.presentationFormat,
    });
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
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });
    this.depthTextureView = this.depthTexture.createView();
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

    const commandEncoder = device.createCommandEncoder();
    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);


    for (const entity of this.application.entities) {
      const meshComp = entity.components.get(MeshComponent);
      if (!meshComp)
        continue;
      const mesh = meshComp.mesh;
      const material = mesh.material;

      const transform = entity.components.get(TransformComponent);
      if (!transform)
        continue;

      const modelMatrix = transform.modelToWorld();
      const mvpMatrix = viewProjMatrix.mul(modelMatrix);

      device.queue.writeBuffer(meshComp.uniformBuffer, 0, new Float32Array([
        ...modelMatrix.transpose().vals,
        ...mvpMatrix.transpose().vals,
      ]));

      passEncoder.setPipeline(material.pipeline);

      passEncoder.setBindGroup(0, meshComp.bindGroup);

      passEncoder.setVertexBuffer(0, mesh.positionsBuffer);
      passEncoder.setVertexBuffer(1, mesh.normalsBuffer);
      passEncoder.setVertexBuffer(2, mesh.uvsBuffer);

      const vc = mesh.positionsBuffer.size / (3*4);
      passEncoder.draw(vc);
    }

    passEncoder.end();
    device.queue.submit([commandEncoder.finish()]);
  }
}
