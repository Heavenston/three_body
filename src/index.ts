import { Application } from "~/src/engine/application";
import { UserError } from "~/src/engine/usererror";
import { Component, Entity } from "./engine/entity";
import { CameraComponent, RenderComponent, TransformComponent } from "./engine/components";
import { Vec3 } from "./math/vec";
import { Color } from "./math/color";

import shaderSource from "bundle-text:./shaders/basic.wgsl";
import computeShaderSource from "bundle-text:./shaders/compute.wgsl";
import sheetBallsShaderSource from "bundle-text:./shaders/basic_plane_balls.wgsl";
import { Mat3 } from "./math/mat";
import { Material } from "./material";
import { Mesh } from "./engine/mesh";
import { Renderer } from "./engine/renderer";

export class MassiveComponent extends Component {
  public mass: number = 1;

  public withMass(mass: number): this {
    this.mass = mass;
    return this;
  }
}

export class ParticleComponent extends Component {
  public position: Vec3 = Vec3.ZERO;
  public velocity: Vec3 = Vec3.ZERO;
  public radius: number = 0.5;

  public withVelocity(vel: Vec3): this {
    this.velocity = vel;
    return this;
  }

  public override start() {
    super.start();
    const transform = this.entity.components.unwrap_get(TransformComponent);
    this.position = transform.translation;
  }

  public override update() {
    super.update();
    const dt = this.application.dt;

    const transform = this.entity.components.unwrap_get(TransformComponent);

    let force = Vec3.ZERO;

    for (const entity of this.application.entities) {
      if (entity === this.entity)
        continue;
      const other_particle = entity.components.get(ParticleComponent);
      if (!other_particle)
        continue;
      const other_mass = entity.components.get(MassiveComponent);
      if (!other_mass)
        continue;
      const diff = other_particle.position
        .sub(this.position);
      const dist = diff.norm();
      const dir = diff.div(dist);

      // let actualDist = clamp(dist, this.radius/2, null);

      force = force.add(dir.mul(other_mass.mass / (dist * dist)))
        .as_vec3();
    }

    this.velocity = this.velocity.add(force.mul(dt))
      .as_vec3();

    transform.globalRotateZ(-(this.velocity.x / this.radius) * dt);
    transform.globalRotateX((this.velocity.z / this.radius) * dt);

    transform.translation = this.position;
  }

  public override afterUpdate(): void {
    const dt = this.application.dt;
    this.position = this.position.add(this.velocity.mul(dt).as_vec3())
      .as_vec3();
  }
}

export class LookAroundComponent extends Component {
  public override update() {
    super.update();
    const dt = this.application.dt;

    const transform = this.entity.components.unwrap_get(TransformComponent);
    
    transform.translation = Mat3.rotateY(dt).mul(transform.translation);
    transform.affine = Mat3.looking_at(transform.translation, Vec3.ZERO, Vec3.UP);
  }
}

export class SheetComponent extends Component {
  public readonly renderer: Renderer;
  public mesh: Mesh;

  public ballMaterial: Material;

  public uniform: GPUBuffer;
  public particlesBuffer: GPUBuffer;
  public particlesArray: Float32Array;
  
  public pressPipeline: GPUComputePipeline;
  public pressBindgroup: GPUBindGroup;
  
  public postPipeline: GPUComputePipeline;
  public postBindgroup: GPUBindGroup;

  public displacePipeline: GPUComputePipeline;
  public displaceBindgroup: GPUBindGroup;

  public heightmapPre: GPUTexture;
  public heightmapPost: GPUTexture;
  public heightmapSampler: GPUSampler;

  private readonly particleDataSize: number = 4 * 4;

  constructor(
    entity: Entity,
    public readonly planeSize: number,
    public readonly planeSubdivs: number,
  ) {
    super(entity);
    this.mesh = entity.components.unwrap_get(RenderComponent).mesh;
    this.renderer = entity.application.renderer;
    const device = this.renderer.device;

    const shaderModule = device.createShaderModule({
      code: computeShaderSource,
    });

    this.uniform = device.createBuffer({
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      size: 12,
    });

    const w = planeSubdivs;

    this.heightmapPre = device.createTexture({
      label: "heightMap pre",
      format: "r32float",
      size: [w,w],
      usage:
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.STORAGE_BINDING |
        GPUTextureUsage.TEXTURE_BINDING
      ,
    });
    this.heightmapPost = device.createTexture({
      label: "heightMap post",
      format: "r32float",
      size: [w,w],
      usage:
        GPUTextureUsage.COPY_SRC |
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.STORAGE_BINDING |
        GPUTextureUsage.TEXTURE_BINDING
      ,
    });
    this.heightmapSampler = device.createSampler({
      label: "heightMapSamper",
      minFilter: "linear",
      magFilter: "linear",
      // minFilter: "nearest",
      // magFilter: "nearest",
      addressModeU: "clamp-to-edge",
      addressModeV: "clamp-to-edge",
    });

    device.queue.writeTexture(
      { texture: this.heightmapPost, },
      new Float32Array(w**2).fill(Infinity),
      { bytesPerRow: w * 4 },
      [w,w]
    );

    const particleCapacity = 100;
    this.particlesArray = new Float32Array(particleCapacity * (this.particleDataSize / 4));
    this.particlesBuffer = device.createBuffer({
      size: this.particleDataSize * particleCapacity,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.STORAGE,
    });

    this.pressPipeline = device.createComputePipeline({
      layout: "auto",
      label: "sheet press compute pipeline",
      compute: {
        module: shaderModule,
        entryPoint: "press",
      }
    });

    this.pressBindgroup = device.createBindGroup({
      layout: this.pressPipeline.getBindGroupLayout(0),
      label: "press sheet bind group",
      entries: [
        // { binding: 0, resource: { buffer: this.mesh.positionsBuffer } },
        // { binding: 1, resource: { buffer: this.mesh.normalsBuffer } },
        // { binding: 2, resource: { buffer: this.mesh.uvsBuffer } },
        { binding: 3, resource: { buffer: this.uniform } },
        { binding: 4, resource: this.heightmapPre.createView() },
        // { binding: 5, resource: this.heightmapPost.createView() },
        { binding: 6, resource: { buffer: this.particlesBuffer } },
        // { binding: 7, resource: this.heightmapSampler },
      ],
    });

    this.postPipeline = device.createComputePipeline({
      layout: "auto",
      label: "sheet post compute pipeline",
      compute: {
        module: shaderModule,
        entryPoint: "post",
      }
    });

    this.postBindgroup = device.createBindGroup({
      layout: this.postPipeline.getBindGroupLayout(0),
      label: "post sheet bind group",
      entries: [
        // { binding: 0, resource: { buffer: this.mesh.positionsBuffer } },
        // { binding: 1, resource: { buffer: this.mesh.normalsBuffer } },
        // { binding: 2, resource: { buffer: this.mesh.uvsBuffer } },
        { binding: 3, resource: { buffer: this.uniform } },
        { binding: 4, resource: this.heightmapPost.createView() },
        { binding: 5, resource: this.heightmapPre.createView() },
        // { binding: 6, resource: { buffer: this.particlesBuffer } },
        { binding: 7, resource: this.heightmapSampler },
      ],
    });

    this.displacePipeline = device.createComputePipeline({
      layout: "auto",
      label: "sheet displace compute pipeline",
      compute: {
        module: shaderModule,
        entryPoint: "displace",
      }
    });

    this.displaceBindgroup = device.createBindGroup({
      layout: this.displacePipeline.getBindGroupLayout(0),
      label: "displace sheet bind group",
      entries: [
        { binding: 0, resource: { buffer: this.mesh.positionsBuffer } },
        { binding: 1, resource: { buffer: this.mesh.normalsBuffer } },
        { binding: 2, resource: { buffer: this.mesh.uvsBuffer } },
        // { binding: 3, resource: { buffer: this.uniform } },
        // { binding: 4, resource: this.heightmapPre.createView() },
        { binding: 5, resource: this.heightmapPost.createView() },
        // { binding: 6, resource: { buffer: this.particlesBuffer } },
        { binding: 7, resource: this.heightmapSampler },
      ],
    });

    this.ballMaterial = Material.fromSource(this.renderer, sheetBallsShaderSource, {
      properties: [
        { name: "modelMatrix", type: "mat4f" },
        { name: "color", type: "vec4f" },
      ]
    });
    this.ballMaterial.customBindGroups.push({
      bg: device.createBindGroup({
        layout: this.ballMaterial.pipeline.getBindGroupLayout(1),
        entries: [
          { binding: 0, resource: this.heightmapPost.createView() },
          { binding: 1, resource: this.heightmapSampler },
        ]
      }),
      target: 1,
    });
  }

  public override update(): void {
    const device = this.renderer.device;

    let particleCount = 0;
    for (const entity of this.application.entities) {
      const particle = entity.components.get(ParticleComponent);
      if (!particle)
        continue;
      const transform = entity.components.unwrap_get(TransformComponent);
      this.particlesArray.set(
        [...transform.translation.vals, particle.radius],
        particleCount * (this.particleDataSize/4),
      );
      particleCount += 1;
    }

    device.queue.writeBuffer(this.particlesBuffer, 0, this.particlesArray);

    device.queue.writeBuffer(this.uniform, 0, new Float32Array([
      this.application.totalTime,
      this.planeSize,
    ]));
    device.queue.writeBuffer(this.uniform, 8, new Uint32Array([
      particleCount,
    ]));

    const commandEncoder = device.createCommandEncoder();

    commandEncoder.copyTextureToTexture(
      {
        texture: this.heightmapPost,
      },
      {
        texture: this.heightmapPre,
      },
      [this.heightmapPre.width, this.heightmapPre.height],
    );

    const passEncoder = commandEncoder.beginComputePass();

    passEncoder.setPipeline(this.pressPipeline);
    passEncoder.setBindGroup(0, this.pressBindgroup);
    passEncoder.dispatchWorkgroups(this.heightmapPre.width/16, this.heightmapPre.height/16, 1);

    passEncoder.setPipeline(this.postPipeline);
    passEncoder.setBindGroup(0, this.postBindgroup);
    passEncoder.dispatchWorkgroups(this.heightmapPre.width/16, this.heightmapPre.height/16, 1);

    const count = this.mesh.positionsBuffer.size / (4 * 3);

    passEncoder.setPipeline(this.displacePipeline);
    passEncoder.setBindGroup(0, this.displaceBindgroup);
    passEncoder.dispatchWorkgroups((count / 3) / 64, 1, 1);

    passEncoder.end();
    device.queue.submit([commandEncoder.finish()]);
  }
}

const run = async () => {
  const canvas = document.getElementById("canvas");
  if (!canvas || !(canvas instanceof HTMLCanvasElement))
    throw new Error("no");
  const app = await Application.create(canvas);

  const camera = new Entity(app);
  camera.addComponent(new TransformComponent(camera)
    .rotateX(-0.2)
    .translate(new Vec3(0, 8, 10))
    .lookAt(Vec3.ZERO)
  );
  camera.addComponent(new CameraComponent(camera)
    .withClearColor(new Color(0., 0., 0., 1))
  );
  // camera.addComponent(new LookAroundComponent(camera));
  app.spawn(camera);
  app.renderer.mainCamera = camera;

  const material = Material.fromSource(app.renderer, shaderSource, {
    properties: [
      { name: "modelMatrix", type: "mat4f" },
      { name: "color", type: "vec4f" },
    ]
  });

  let sphereMesh: Mesh;
  {
    console.log("CREATING SPHERE");
    console.time("vertices");
    const vertices = Mesh.cubeVertices(10);
    console.timeEnd("vertices");
    console.log("vertex count:", vertices.positions.length / 3);

    console.time("normalize");
    Mesh.normalizeVertices(vertices, 0.5);
    console.timeEnd("normalize");

    console.time("computeNormals");
    Mesh.computeNormals(vertices);
    console.timeEnd("computeNormals");

    sphereMesh = Mesh.fromVertices(
      app.renderer,
      vertices,
    );
  }
  let smallSphereMesh: Mesh;
  {
    console.log("CREATING SPHERE");
    console.time("vertices");
    const vertices = Mesh.cubeVertices(3);
    console.timeEnd("vertices");
    console.log("vertex count:", vertices.positions.length / 3);

    console.time("normalize");
    Mesh.normalizeVertices(vertices, 0.03);
    console.timeEnd("normalize");

    console.time("computeNormals");
    Mesh.computeNormals(vertices);
    console.timeEnd("computeNormals");

    smallSphereMesh = Mesh.fromVertices(
      app.renderer,
      vertices,
    );
  }

  const ballMass = 70;
  const ballDistance = 4;
  const ballSpeed = 2;

  const spawnBall = (
    pos: Vec3,
    velocity: Vec3,
  ) => {
    const sphereEntity = new Entity(app);
    sphereEntity.addComponent(new TransformComponent(sphereEntity)
      .translate(pos)
    );
    sphereEntity.addComponent(new RenderComponent(sphereEntity, sphereMesh, material)
      .withInstanceData("color", Color.BLACK)
    );
    sphereEntity.addComponent(new ParticleComponent(sphereEntity)
      .withVelocity(velocity)
    );
    sphereEntity.addComponent(new MassiveComponent(sphereEntity)
      .withMass(ballMass)
    );

    const radius = 0.5;
    const n = 150;

    // Function to convert spherical coordinates to Cartesian coordinates
    const sphericalToCartesian = (r: number, theta: number, phi: number) => {
      return new Vec3(
        r * Math.sin(theta) * Math.cos(phi),
        r * Math.sin(theta) * Math.sin(phi),
        r * Math.cos(theta)
      );
    };

    // Add n evenly spaced small balls on the surface
    for (let i = 0; i < n; i++) {
      // Calculate theta and phi for evenly distributed points
      const theta = Math.acos(1 - 2 * (i + 0.5) / n); // θ is the polar angle
      const phi = Math.PI * (1 + Math.sqrt(5)) * (i + 0.5); // φ is the azimuthal angle

      const smallBallPos = sphericalToCartesian(radius, theta, phi)
        .as_vec3();

      const smallBall = new Entity(app);
      smallBall.addComponent(new TransformComponent(smallBall)
        .translate(smallBallPos));
      smallBall.addComponent(new RenderComponent(smallBall, smallSphereMesh, material)
        .withInstanceData("color", Color.WHITE));

      sphereEntity.children.add(smallBall);
    }
    
    app.spawn(sphereEntity);
  };

  const ballCount = 3;
  for (let balli = 0; balli < ballCount; balli++) {
    const rotate = Mat3.rotateY((balli / ballCount) * Math.PI * 2);
    spawnBall(rotate.mul(new Vec3(0,0,ballDistance)), rotate.mul(new Vec3(ballSpeed,0,0)));
  }

  const planeSize = 20;
  const planeSubdivs = 400;

  let planeMesh: Mesh;
  {
    console.log("CREATING PLANE");
    console.time("vertices");
    const vertices = Mesh.planeVertices(planeSubdivs, planeSize);
    console.timeEnd("vertices");
    console.log("vertex count:", vertices.positions.length / 3);

    console.time("computeNormals");
    Mesh.computeNormals(vertices);
    console.timeEnd("computeNormals");

    planeMesh = Mesh.fromVertices(
      app.renderer,
      vertices,
    );
  }

  const planeEntity = new Entity(app);
  planeEntity.addComponent(new TransformComponent(planeEntity));
  planeEntity.addComponent(new RenderComponent(planeEntity, planeMesh, material)
    .withInstanceData("color", new Color(0.,0.,0.,1.))
  );
  const sheetComp = new SheetComponent(planeEntity, planeSize, planeSubdivs);
  planeEntity.addComponent(sheetComp);

  const ballSep = 0.18;
  for (let x = -planeSize/2; x < planeSize/2; x += ballSep) {
    for (let y = -planeSize/2; y < planeSize/2; y += ballSep) {
      const smallBallPos = new Vec3(x, 0, y);

      const smallBall = new Entity(app);
      smallBall.addComponent(new TransformComponent(smallBall)
        .translate(smallBallPos));
      smallBall.addComponent(new RenderComponent(smallBall, smallSphereMesh, sheetComp.ballMaterial)
        .withInstanceData("color", Color.WHITE));

      planeEntity.children.add(smallBall);
    }
  }

  app.spawn(planeEntity);
  await app.start();
};

(async () => {
  try {
    await run();
  }
  catch(e) {
    console.error(e);
    document.body.innerHTML = `<div class="error"></div>`
    const el = document.createElement("div");
    if (e instanceof UserError) {
      el.innerText = `User Error ! : ${e.message}`;
    }
    else if (e instanceof Error) {
      el.innerText = `${e.name} ! : ${e.message}`;
    }
    document.body.textContent = "";
    document.body.appendChild(el);
  }
})();
