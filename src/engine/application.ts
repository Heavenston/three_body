import { UserError } from "./usererror";
import { Renderer } from "./renderer";
import { Entity } from "./entity";
import { clamp } from "../math";

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

  public static async create(canvas: HTMLCanvasElement): Promise<Application> {
    const app = new Application(canvas);
    app.renderer = await Renderer.create(app, canvas);
    return app;
  }

  private constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    const statusBar = document.getElementById("statusBar");
    if (statusBar === null || !(statusBar instanceof HTMLDivElement))
      throw new UserError("Missing status bar element");
    this.statusBar = statusBar;

    // do not worry
    // shush
    this.renderer = null as any;
  }

  public async start() {
    let onError: ((e: unknown) => void) | null = null;
    const promise = new Promise((_res, rej) => {onError = rej;});

    let lastT = 0;
    let animationFrame: number | null = null;
    const frame = (time: number) => {
      try {
        time /= 1000;

        this.update(clamp(time - lastT, 0, 0.5));
        lastT = time;

        if (animationFrame != null)
          cancelAnimationFrame(animationFrame);
        animationFrame = requestAnimationFrame(frame);
      }
      catch(e) {
        onError?.(e);
      }
    };

    const resizeCanvas = () => {
      this.canvas.width = document.body.clientWidth;
      this.canvas.height = document.body.clientHeight;
      frame(lastT);
    };

    resizeCanvas();
    new ResizeObserver(resizeCanvas).observe(document.body);

    return promise;
  }

  public defer(cb: () => void) {
    this.#defered.push(cb);
  }

  public spawn(entity: Entity) {
    if (this.#entities.has(entity))
      throw new Error("entity already spawned");

    this.#entities.add(entity);
    entity.onSpawn();
  }

  public despawn(entity: Entity) {
    if (this.#entities.delete(entity))
      entity.onDespawn();
  }

  private updateStatusBar() {
    let entityCount = 0;
    const count = (e: Entity) => {
      entityCount++;
      e.children.forEach(count);
    };
    this.#entities.forEach(count);

    const text = `
      FPS: ${Math.round((1 / this.dt) * 10) / 10}
      Entity count: ${entityCount}
      Draw calls: ${this.renderer.drawCallCount()}
    `.trim();
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
