import { Color } from "./math";
import { UserError } from "./usererror";

export class ShaderCompileError extends Error {
  constructor(message?: string) {
    super(`ShaderCompileError: ${message}`);
  }
}

export class ProgramLinkError extends Error {
  constructor(message?: string) {
    super(`ProgramLinkError: ${message}`);
  }
}

export class WebGLError extends Error {
  constructor(message?: string) {
    super(`WebGLError ${message}`);
  }
}

export type ShaderType = "vertex" | "fragment";
export type BufferBindTarget = "array";
export type BufferUsageHint = "static_draw";
export type GLType = "float";
export type GLPrimitiveType = "triangles";

export class GLAbstraction {
  constructor(public ctx: WebGL2RenderingContext) {
    
  }

  public getShaderTypeNumber(type: ShaderType): number {
    if (type === "vertex")
      return this.ctx.VERTEX_SHADER;
    if (type === "fragment")
      return this.ctx.FRAGMENT_SHADER;
    return type;
  }

  public getBufferBindTargetNumber(bind: BufferBindTarget): number {
    if (bind === "array")
      return this.ctx.ARRAY_BUFFER;
    return bind;
  }

  public getBufferUsageHintNumber(bind: BufferUsageHint): number {
    if (bind === "static_draw")
      return this.ctx.STATIC_DRAW;
    return bind;
  }

  public getTypeNumber(bind: GLType): number {
    if (bind === "float")
      return this.ctx.FLOAT;
    return bind;
  }

  public getPrimitiveTypeNumber(prim: GLPrimitiveType): number {
    if (prim === "triangles")
      return this.ctx.TRIANGLES;
    return prim;
  }

  public createShader(type: ShaderType, source: string): GLShader {
    const ctx = this.ctx;

    const handle = ctx.createShader(this.getShaderTypeNumber(type));
    if (!handle)
      throw new WebGLError("webgl returned null");
    ctx.shaderSource(handle, source);
    ctx.compileShader(handle);
    const success = ctx.getShaderParameter(handle, ctx.COMPILE_STATUS);
    if (success)
      return new GLShader(this, handle);

    const info = ctx.getShaderInfoLog(handle);
    ctx.deleteShader(handle);
    throw new ShaderCompileError(info ?? undefined);
  }

  public createProgram(vertex: GLShader, fragment: GLShader): GLProgram {
    const ctx = this.ctx;

    const handle = ctx.createProgram();
    if (!handle)
      throw new WebGLError("program creation failed");
    ctx.attachShader(handle, vertex.handle);
    ctx.attachShader(handle, fragment.handle);
    ctx.linkProgram(handle);
    var success = ctx.getProgramParameter(handle, ctx.LINK_STATUS);
    if (success)
      return new GLProgram(this, handle);
 
    const info = ctx.getProgramInfoLog(handle);
    ctx.deleteProgram(handle);
    throw new ProgramLinkError(info ?? undefined);
  }

  public createBuffer(): GLBuffer {
    const handle = this.ctx.createBuffer();
    if (!handle)
      throw new WebGLError("buffer creation failed");
    return new GLBuffer(this, handle);
  }

  public createVertexArrayObject(): GLVertexArrayObject {
    const handle = this.ctx.createVertexArray();
    if (!handle)
      throw new WebGLError("vao creation failed");
    return new GLVertexArrayObject(this, handle);
  }

  public viewport(
    x: number, y: number,
    width: number, height: number,
  ) {
    this.ctx.viewport(x,y,width,height);
  }

  public clearColor(color: Color) {
    this.ctx.clearColor(color.r, color.g, color.b, color.a);
  }

  public clear() {
    this.ctx.clear(this.ctx.COLOR_BUFFER_BIT);
  }

  public drawArrays(prim: GLPrimitiveType, first: number, count: number) {
    this.ctx.drawArrays(this.getPrimitiveTypeNumber(prim), first, count);
  }
}

export class GLShader {
  constructor(
    public gl: GLAbstraction,
    public handle: WebGLShader,
  ) {
    
  }
}

export class GLProgram {
  constructor(
    public gl: GLAbstraction,
    public handle: WebGLProgram,
  ) {
    
  }

  public getAttribLocation(name: string): number {
    const ctx = this.gl.ctx;
    return ctx.getAttribLocation(this.handle, name);
  }

  public getAttrib(name: string): GLAttribute {
    return new GLAttribute(this.gl, this.getAttribLocation(name));
  }

  public use() {
    this.gl.ctx.useProgram(this.handle);
  }
}

export class GLAttribute {
  constructor(
    public gl: GLAbstraction,
    public location: number,
  ) {
  }

  public enableVertexAttribArray() {
    this.gl.ctx.enableVertexAttribArray(this.location);
  }

  public vertexAttribPointer(
    size: number,
    type: GLType,
    nomalized: boolean,
    stride: number,
    offset: number,
  ) {
    this.gl.ctx.vertexAttribPointer(
      this.location,
      size,
      this.gl.getTypeNumber(type),
      nomalized,
      stride,
      offset,
    );
  }
}

export class GLBuffer {
  public lastBind: BufferBindTarget | null = null;

  constructor(
    public gl: GLAbstraction,
    public handle: WebGLBuffer,
  ) {
    
  }

  public bind(target: BufferBindTarget) {
    this.gl.ctx.bindBuffer(this.gl.getBufferBindTargetNumber(target), this.handle);
    this.lastBind = target;
  }

  public data(data: AllowSharedBufferSource, usageHint: BufferUsageHint) {
    if (this.lastBind === null)
      throw new UserError("Cannot set data of unbound buffer");
    const ctx = this.gl.ctx;
    ctx.bufferData(
      this.gl.getBufferBindTargetNumber(this.lastBind),
      data,
      this.gl.getBufferUsageHintNumber(usageHint),
    );
  }
}

export class GLVertexArrayObject {
  constructor(
    public gl: GLAbstraction,
    public handle: WebGLVertexArrayObject,
  ) {
    
  }

  public bind() {
    this.gl.ctx.bindVertexArray(this.handle);
  }
}
