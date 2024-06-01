import { UserError } from "./usererror";
import { Material, Mesh, Renderer } from "./renderer";
import { Entity } from "./entity";
import { Vec3 } from "./math/vec";
import { Color } from "./math/color";

import vertexSource from "./shaders/vertex.glsl";
import fragmentSource from "./shaders/fragment.glsl";
import { CameraComponent, LookAroundComponent, MassiveComponent, MeshComponent, ParticleComponent, TransformComponent } from "./components";
import { Mat3 } from "./math/mat";

export class Application {
  #defered: (() => void)[] = [];
  #entities: Set<Entity> = new Set();

  public canvas: HTMLCanvasElement;
  public renderer: Renderer;

  public totalTime: number = 0;
  public dt: number = 0;

  public statusBar: HTMLDivElement;

  public get entities(): Readonly<Set<Entity>> {
    return this.#entities;
  }

  public constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    const statusBar = document.getElementById("statusBar");
    if (statusBar === null || !(statusBar instanceof HTMLDivElement))
      throw new UserError("Missing status bar element");
    this.statusBar = statusBar;

    this.renderer = new Renderer(this, this.canvas);

    this.init();
  }

  private init() {
    const camera = new Entity(this);
    camera.addComponent(new TransformComponent(camera)
      .rotateX(-0.2)
      .translate(new Vec3(0, 6, 8))
      .lookAt(Vec3.ZERO)
    );
    camera.addComponent(new CameraComponent(camera)
      .withClearColor(new Color(0.05, 0.05, 0.05, 1)));
    // camera.addComponent(new LookAroundComponent(camera));
    this.spawn(camera);
    this.renderer.mainCamera = camera;

    const material = Material.fromSources(this.renderer, vertexSource, fragmentSource);

    let sphereMesh: Mesh;
    {
      console.log("CREATING SPHERE");
      console.time("vertices");
      const vertices = Mesh.cubeVertices(6);
      console.timeEnd("vertices");
      console.log("vertex count:", vertices.length);

      console.time("normalize");
      Mesh.normalizeVertices(vertices, 0.5);
      console.timeEnd("normalize");

      console.time("computeNormals");
      Mesh.computeNormals(vertices);
      console.timeEnd("computeNormals");

      sphereMesh = Mesh.fromVertices(
        this.renderer,
        material,
        vertices,
      );
    }

    for (let angle = 0; angle < Math.PI*2; angle += Math.PI / 4) {
      const rotate = Mat3.rotateY(angle);
      const sphereEntity = new Entity(this);
      sphereEntity.addComponent(new TransformComponent(sphereEntity)
        .translate(rotate.mul(new Vec3(0,0,3)))
      );
      sphereEntity.addComponent(new MeshComponent(sphereEntity, sphereMesh));
      sphereEntity.addComponent(new ParticleComponent(sphereEntity)
        .withVelocity(rotate.mul(new Vec3(0.8,0,0)))
      );
      sphereEntity.addComponent(new MassiveComponent(sphereEntity)
        .withMass(10e9));
      this.spawn(sphereEntity);
    }

    let planeMesh: Mesh;
    {
      console.log("CREATING PLANE");
      console.time("vertices");
      const vertices = Mesh.planeVertices(8);
      console.timeEnd("vertices");
      console.log("vertex count:", vertices.length);

      console.time("computeNormals");
      Mesh.computeNormals(vertices);
      console.timeEnd("computeNormals");

      planeMesh = Mesh.fromVertices(
        this.renderer,
        material,
        vertices,
      );
    }

    const planeEntity = new Entity(this);
    planeEntity.addComponent(new TransformComponent(planeEntity)
      .scale(100)
    );
    planeEntity.addComponent(new MeshComponent(planeEntity, planeMesh));
    this.spawn(planeEntity);
  }

  public defer(cb: () => void) {
    this.#defered.push(cb);
  }

  public spawn(entity: Entity) {
    if (this.#entities.has(entity))
      throw new Error("entity already spawned");

    this.#entities.add(entity);
    entity.spawned();
  }

  public despawn(entity: Entity) {
    if (this.#entities.delete(entity))
      entity.despawned();
  }

  private updateStatusBar() {
    const text = `FPS: ${Math.round((1 / this.dt) * 10) / 10}`;
    if (this.statusBar.innerText !== text)
      this.statusBar.innerText = text;
  }

  public update(dt: number) {
    this.totalTime += dt;
    this.dt = dt;

    this.#defered.forEach(cb => cb());
    this.#defered = [];

    for (const entity of this.#entities) {
      entity.update();
    }

    this.updateStatusBar();

    this.renderer.render();
  }
}
