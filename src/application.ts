import { UserError } from "./usererror";
import { Renderer } from "./renderer";

export class Application {
  public canvas: HTMLCanvasElement;
  public renderer: Renderer;

  public totalTime: number = 0;
  public dt: number = 0;

  public statusBar: HTMLDivElement;

  public constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    const statusBar = document.getElementById("statusBar");
    if (statusBar === null || !(statusBar instanceof HTMLDivElement))
      throw new UserError("Missing status bar element");
    this.statusBar = statusBar;

    this.renderer = new Renderer(this, this.canvas);
  }

  private updateStatusBar() {
    const text = `FPS: ${Math.round((1 / this.dt) * 10) / 10}`;
    if (this.statusBar.innerText !== text)
      this.statusBar.innerText = text;
  }

  public update(dt: number) {
    this.totalTime += dt;
    this.dt = dt;

    this.updateStatusBar();

    this.renderer.render();
  }
}
