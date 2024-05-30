import vertexShaderSrc from "./shaders/vertex.glsl"
import fragmentShaderSrc from "./shaders/fragment.glsl"
import { UserError } from "./usererror";
import { Color } from "./math";
import { WebGLError, createProgram, createShader } from "./webgl_utils";

export class Renderer {
  public canvas: HTMLCanvasElement;
  public ctx: WebGL2RenderingContext;

  public totalTime: number = 0;
  public dt: number = 0;

  public statusBar: HTMLDivElement;

  public program: WebGLProgram | null = null;
  public vao: WebGLVertexArrayObject | null = null;

  public constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext("webgl2");
    if (!ctx)
      throw new UserError("No context?");
    this.ctx = ctx;

    const statusBar = document.getElementById("statusBar");
    if (statusBar === null || !(statusBar instanceof HTMLDivElement))
      throw new UserError("Missing status bar element");
    this.statusBar = statusBar;

    this.init();
  }

  private init() {
    const ctx = this.ctx;

    const vertexShader = createShader(ctx, ctx.VERTEX_SHADER, vertexShaderSrc);
    const fragmentShader = createShader(ctx, ctx.FRAGMENT_SHADER, fragmentShaderSrc);
    const program = createProgram(ctx, vertexShader, fragmentShader);
    ctx.useProgram(program);
    this.program = program;

    const posAttrib = ctx.getAttribLocation(program, "a_position");

    const posBuffer = ctx.createBuffer();
    if (!posBuffer)
      throw new WebGLError("no pos buffer");
    ctx.bindBuffer(ctx.ARRAY_BUFFER, posBuffer);
    ctx.bufferData(
      ctx.ARRAY_BUFFER, new Float32Array([
        0.0, 0.0, 0, 0.5, 0.7, 0,
      ]), ctx.STATIC_DRAW,
    );

    const vao = ctx.createVertexArray();
    if (!vao)
      throw new WebGLError("no pos buffer");
    this.vao = vao;
    ctx.bindVertexArray(vao);

    ctx.enableVertexAttribArray(posAttrib);
    ctx.vertexAttribPointer(
      posAttrib, 2, ctx.FLOAT, false, 0, 0
    );
  }

  private render() {
    const ctx = this.ctx;
    ctx.viewport(0, 0, this.canvas.width, this.canvas.height);

    ctx.clearColor(0,0,0,1);
    ctx.clear(ctx.COLOR_BUFFER_BIT);

    if (!this.program || !this.vao)
      return;

    ctx.useProgram(this.program);
    ctx.bindVertexArray(this.vao);

    ctx.drawArrays(ctx.TRIANGLES, 0, 3);
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
