import { Mat3, Mat4 } from "~/src/math/mat";
import { Vec2, Vec3, Vec4 } from "~/src/math/vec";

export type UniformScalarType = "f" | "i" | "ui";

export type Uniform = ({
  type: `1${UniformScalarType}`,
  value: number,
} | {
  type: `2${UniformScalarType}`,
  value: Vec2,
} | {
  type: `3${UniformScalarType}`,
  value: Vec3,
} | {
  type: `4${UniformScalarType}`,
  value: Vec4,
} | {
  type: `mat3`,
  value: Mat3,
} | {
  type: `mat4`,
  value: Mat4,
}) & {
  target: string,
};

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

export function applyUniform(
  ctx: WebGL2RenderingContext,
  program: WebGLProgram,
  uniform: Uniform,
): void {
  const location = ctx.getUniformLocation(program, uniform.target);
  if (location === null) {
    // console.warn(`Uknown uniform ${uniform.target}`);
    return;
  }

  switch (uniform.type) {
  case "1f":
    ctx.uniform1f(location, uniform.value);
    break;
  case "1i":
    ctx.uniform1i(location, uniform.value);
    break;
  case "1ui":
    ctx.uniform1ui(location, uniform.value);
    break;
  case "2f":
    ctx.uniform2f(location, uniform.value.x, uniform.value.y);
    break;
  case "2i":
    ctx.uniform2i(location, uniform.value.x, uniform.value.y);
    break;
  case "2ui":
    ctx.uniform2ui(location, uniform.value.x, uniform.value.y);
    break;
  case "3f":
    ctx.uniform3f(location, uniform.value.x, uniform.value.y, uniform.value.z);
    break;
  case "3i":
    ctx.uniform3i(location, uniform.value.x, uniform.value.y, uniform.value.z);
    break;
  case "3ui":
    ctx.uniform3ui(location, uniform.value.x, uniform.value.y, uniform.value.z);
    break;
  case "4f":
    ctx.uniform4f(location, uniform.value.x, uniform.value.y, uniform.value.z, uniform.value.w);
    break;
  case "4i":
    ctx.uniform4i(location, uniform.value.x, uniform.value.y, uniform.value.z, uniform.value.w);
    break;
  case "4ui":
    ctx.uniform4ui(location, uniform.value.x, uniform.value.y, uniform.value.z, uniform.value.w);
    break;
  case "mat3":
    ctx.uniformMatrix3fv(location, true, new Float32Array(uniform.value.vals));
    break;
  case "mat4":
    ctx.uniformMatrix4fv(location, true, new Float32Array(uniform.value.vals));
    break;
  default:
    // ensure exhaustiveness (that uniform is never)
    return uniform;
  }
}
