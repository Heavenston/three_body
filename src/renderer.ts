import vertexShaderSrc from "./shaders/vertex.glsl"
import fragmentShaderSrc from "./shaders/fragment.glsl"
import { UserError } from "./usererror";
import { GLAbstraction, GLProgram, GLVertexArrayObject } from "./webglAbstraction";
import { Color } from "./math";

export class Renderer {
  public canvas: HTMLCanvasElement;
  public ctx: WebGL2RenderingContext;
  public gl: GLAbstraction;

  public totalTime: number = 0;
  public dt: number = 0;

  public statusBar: HTMLDivElement;

  public program: GLProgram | null = null;
  public vao: GLVertexArrayObject | null = null;

  public constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext("webgl2");
    if (!ctx)
      throw new UserError("No context?");
    this.ctx = ctx;
    this.gl = new GLAbstraction(ctx);

    const statusBar = document.getElementById("statusBar");
    if (statusBar === null || !(statusBar instanceof HTMLDivElement))
      throw new UserError("Missing status bar element");
    this.statusBar = statusBar;

    this.init();
  }

  private init() {
    const gl = this.gl;

    const vertexShader = gl.createShader("vertex", vertexShaderSrc);
    const fragmentShader = gl.createShader("fragment", fragmentShaderSrc);
    const program = gl.createProgram(vertexShader, fragmentShader);
    this.program = program;

    const posAttrib = program.getAttrib("a_position");

    const posBuffer = gl.createBuffer();
    posBuffer.bind("array");
    posBuffer.data(new Float32Array([
      0.0, 0.0, 0, 0.5, 0.7, 0,
    ]), "static_draw");

    const vao = gl.createVertexArrayObject();
    this.vao = vao;
    vao.bind();

    posAttrib.enableVertexAttribArray();
    posAttrib.vertexAttribPointer(
      2, "float", false, 0, 0
    );
  }

  private render() {
    const gl = this.gl;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);

    gl.clearColor(Color.BLACK);
    gl.clear();

    if (!this.program || !this.vao)
      return;

    this.program.use();
    this.vao.bind();

    this.gl.drawArrays("triangles", 0, 3);
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
    this.render();
  }
}
