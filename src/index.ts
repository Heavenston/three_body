import { Application } from "~/src/engine/application";
import { UserError } from "~/src/engine/usererror";
import { Component, Entity } from "./engine/entity";
import { CameraComponent, RenderComponent, TransformComponent } from "./engine/components";
import { Vec2, Vec3 } from "./math/vec";
import { Color } from "./math/color";

import shaderSource from "bundle-text:./shaders/basic.wgsl";
import computeShaderSource from "bundle-text:./shaders/compute.wgsl";
import { Mat3 } from "./math/mat";
import { G, clamp } from "./math";
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
  public velocity: Vec3 = Vec3.ZERO;
  public radius: number = 0.5;

  public withVelocity(vel: Vec3): this {
    this.velocity = vel;
    return this;
  }

  public override update() {
    super.update();
    const dt = this.application.dt;

    const transform = this.entity.components.unwrap_get(TransformComponent);

    let force = Vec3.ZERO;

    for (const entity of this.application.entities) {
      if (entity === this.entity)
        continue;
      const other_transform = entity.components.get(TransformComponent);
      if (!other_transform)
        continue;
      const other_mass = entity.components.get(MassiveComponent);
      if (!other_mass)
        continue;
      const diff = other_transform.translation
        .sub(transform.translation);
      const dist = diff.norm();
      const dir = diff.div(dist);

      let actualDist = clamp(dist, this.radius, null);

      force = force.add(dir.mul((G * other_mass.mass) / (actualDist ** 2)))
        .as_vec3();
    }

    this.velocity = this.velocity.add(force.mul(dt))
      .as_vec3();

    transform.globalRotateZ(-(this.velocity.x / this.radius) * dt);
    transform.globalRotateX((this.velocity.z / this.radius) * dt);

    transform.translate(this.velocity.mul(dt).as_vec3());
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

  public uniform: GPUBuffer;
  public particlesBuffer: GPUBuffer;
  public particlesArray: Float32Array;
  
  public pressPipeline: GPUComputePipeline;
  public pressBindgroup: GPUBindGroup;
  
  public postPipeline: GPUComputePipeline;
  public postBindgroup: GPUBindGroup;

  public displacePipeline: GPUComputePipeline;
  public displaceBindgroup: GPUBindGroup;

  public heightmap: GPUTexture;

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

    this.heightmap = device.createTexture({
      format: "r32float",
      size: [planeSubdivs,planeSubdivs],
      usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.STORAGE_BINDING,
    });

    device.queue.writeTexture(
      { texture: this.heightmap, },
      new Float32Array(planeSubdivs**2).fill(Infinity),
      {
        bytesPerRow: planeSubdivs * 4,
      },
      [planeSubdivs,planeSubdivs]
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
      label: "sheet bind group",
      entries: [
        // { binding: 0, resource: { buffer: this.mesh.positionsBuffer } },
        // { binding: 1, resource: { buffer: this.mesh.normalsBuffer } },
        // { binding: 2, resource: { buffer: this.mesh.uvsBuffer } },
        { binding: 3, resource: { buffer: this.uniform } },
        { binding: 4, resource: this.heightmap.createView() },
        { binding: 5, resource: { buffer: this.particlesBuffer } },
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
      label: "sheet bind group",
      entries: [
        // { binding: 0, resource: { buffer: this.mesh.positionsBuffer } },
        // { binding: 1, resource: { buffer: this.mesh.normalsBuffer } },
        // { binding: 2, resource: { buffer: this.mesh.uvsBuffer } },
        // { binding: 3, resource: { buffer: this.uniform } },
        { binding: 4, resource: this.heightmap.createView() },
        // { binding: 5, resource: { buffer: this.particlesBuffer } },
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
      label: "sheet bind group",
      entries: [
        { binding: 0, resource: { buffer: this.mesh.positionsBuffer } },
        { binding: 1, resource: { buffer: this.mesh.normalsBuffer } },
        { binding: 2, resource: { buffer: this.mesh.uvsBuffer } },
        // { binding: 3, resource: { buffer: this.uniform } },
        { binding: 4, resource: this.heightmap.createView() },
      ],
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
    const passEncoder = commandEncoder.beginComputePass();

    passEncoder.setPipeline(this.pressPipeline);
    passEncoder.setBindGroup(0, this.pressBindgroup);
    passEncoder.dispatchWorkgroups(this.heightmap.width, this.heightmap.height, 1);

    passEncoder.setPipeline(this.postPipeline);
    passEncoder.setBindGroup(0, this.postBindgroup);
    passEncoder.dispatchWorkgroups(this.heightmap.width, this.heightmap.height, 1);

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

  const material = Material.fromSource(app.renderer, shaderSource);

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

  const spawnBall = (
    pos: Vec3,
    velocity: Vec3,
  ) => {
    const sphereEntity = new Entity(app);
    sphereEntity.addComponent(new TransformComponent(sphereEntity)
      .translate(pos)
    );
    sphereEntity.addComponent(new RenderComponent(sphereEntity, sphereMesh, material)
      .withColor(Color.BLACK)
    );
    sphereEntity.addComponent(new ParticleComponent(sphereEntity)
      .withVelocity(velocity)
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
        .withColor(Color.WHITE));

      sphereEntity.children.add(smallBall);
    }
    
    app.spawn(sphereEntity);
  };

  const ballCount = 3;
  for (let angle = 0; angle < Math.PI*2; angle += (Math.PI*2)/ballCount) {
    const rotate = Mat3.rotateY(angle);
    spawnBall(rotate.mul(new Vec3(0,0,3)), rotate.mul(new Vec3(1.1,0,0)));
  }
  // spawnBall(new Vec3(-5, 0, 0), new Vec3(1,0,0));
  // spawnBall(new Vec3(5, 0, 0), new Vec3(-1,0,0));
  // spawnBall(new Vec3(0, 0, -5), new Vec3(0.25,0,0.25));
  // spawnBall(new Vec3(0, 0, 5), new Vec3(-0.25,0,-0.25));
  // spawnBall(new Vec3(5, 0, 0), new Vec3(-1,0,1));

  const pointMass = new Entity(app);
  pointMass.addComponent(new TransformComponent(pointMass));
  pointMass.addComponent(new MassiveComponent(pointMass)
    .withMass(10e10 + 10e9));
  app.spawn(pointMass);

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
    .withColor(new Color(0.1,0.1,0.1,1.)));
  planeEntity.addComponent(new SheetComponent(planeEntity, planeSize, planeSubdivs));
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
