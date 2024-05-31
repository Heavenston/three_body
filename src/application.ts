import { UserError } from "./usererror";
import { CameraComponent, Material, Mesh, MeshComponent, Renderer } from "./renderer";
import { Component, Entity } from "./entity";
import { Vec3 } from "./math/vec";
import { Mat3, Mat4 } from "./math/mat";
import { Color } from "./math/color";

import vertexSource from "./shaders/vertex.glsl";
import fragmentSource from "./shaders/fragment.glsl";

export class TransformComponent extends Component {
  public translation: Vec3 = Vec3.ZERO;
  public affine: Mat3 = Mat3.IDENT;

  public modelToWorld(): Mat4 {
    return this.affine.expand()
      .mul(Mat4.fromTranslation(this.translation));
  }

  public withTranslation(trans: Vec3): this {
    this.translation = trans;
    return this;
  }
}

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
      .withTranslation(new Vec3(0, 0, 1)));
    camera.addComponent(new CameraComponent(camera)
      .withClearColor(new Color(0.05, 0.05, 0.05, 1)));
    this.spawn(camera);
    this.renderer.mainCamera = camera;

    const material = Material.fromSources(this.renderer, vertexSource, fragmentSource);
    const mesh = Mesh.fromVertices(
      this.renderer,
      material,
      new Float32Array([
        0.0, 0.0, 0.0,  0, 0,
        0.0, 1.0, 0.0,  0, 1,
        1.0, 0.0, 0.0,  1, 0,
      ]),
    );

    const on = new Entity(this);
    on.addComponent(new TransformComponent(on));
    on.addComponent(new MeshComponent(on, mesh));
    this.spawn(on);
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

    this.updateStatusBar();

    this.renderer.render();
  }
}
