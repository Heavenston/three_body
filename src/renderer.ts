import vertexShaderSrc from "./shaders/vertex.glsl"
import fragmentShaderSrc from "./shaders/fragment.glsl"
import { UserError } from "./usererror";
import { Color } from "./math";
import { WebGLError, createProgram, createShader } from "./webgl_utils";
import { Application } from "./application";

export class Renderer {
  public canvas: HTMLCanvasElement;
  public ctx: WebGL2RenderingContext;

  public application: Application;

  public program: WebGLProgram | null = null;
  public vao: WebGLVertexArrayObject | null = null;

  constructor(
    application: Application,
    canvas: HTMLCanvasElement,
  ) {
    this.application = application;
    this.canvas = canvas;

    const ctx = canvas.getContext("webgl2");
    if (!ctx)
      throw new UserError("No context?");
    this.ctx = ctx;

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

  public render() {
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
}
