
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

export function createShader(
  ctx: WebGL2RenderingContext, type: number, source: string
): WebGLShader {
    const handle = ctx.createShader(type);
    if (!handle)
      throw new WebGLError("webgl returned null");
    ctx.shaderSource(handle, source);
    ctx.compileShader(handle);
    const success = ctx.getShaderParameter(handle, ctx.COMPILE_STATUS);
    if (success)
      return handle;

    const info = ctx.getShaderInfoLog(handle);
    ctx.deleteShader(handle);
    throw new ShaderCompileError(info ?? undefined);
}

export function createProgram(
  ctx: WebGL2RenderingContext,
  vertex: WebGLShader, fragment: WebGLShader,
): WebGLProgram {
  const handle = ctx.createProgram();
  if (!handle)
    throw new WebGLError("program creation failed");
  ctx.attachShader(handle, vertex);
  ctx.attachShader(handle, fragment);
  ctx.linkProgram(handle);
  var success = ctx.getProgramParameter(handle, ctx.LINK_STATUS);
  if (success)
    return handle;

  const info = ctx.getProgramInfoLog(handle);
  ctx.deleteProgram(handle);
  throw new ProgramLinkError(info ?? undefined);
}
