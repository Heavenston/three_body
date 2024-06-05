import { Renderer } from "./engine/renderer";
import { Color } from "./math/color";
import { Mat4, MatMut4 } from "./math/mat";
import { Vec2, Vec3, Vec4 } from "./math/vec";

export type InstanceDataPropertyTypeName2Type = {
  "f32": number,
  "u32": number,
  "vec2f": Vec2 | [number, number],
  "vec3f": Vec3 | [number, number, number],
  "vec4f": Vec4 | Color | [number, number, number, number],
  "mat4f": Mat4 | MatMut4,
};

export type InstanceDataPropertyValue = InstanceDataPropertyTypeName2Type[keyof InstanceDataPropertyTypeName2Type];
export type InstanceDataPropertyType = keyof InstanceDataPropertyTypeName2Type;

export type InstanceDataLayoutProperty = {
  name: string,
  type: InstanceDataPropertyType,
};

export type InstanceDataLayout = {
  properties: InstanceDataLayoutProperty[],
};

export type InstanceData = {
  [key: string]: InstanceDataPropertyValue,
};

export const INSTANCE_DATA_PROPERTY_TYPES_BYTE_SIZES: {
  [key in keyof InstanceDataPropertyTypeName2Type]: number
} = {
  "f32": 4,
  "u32": 4,
  "vec2f": 4*2,
  "vec3f": 4*3,
  "vec4f": 4*4,
  "mat4f": 4*16,
};

export function instanceDataPropertyValueIsCorrect<T extends InstanceDataPropertyType>(
  value: InstanceDataPropertyValue,
  type: T,
): value is InstanceDataPropertyTypeName2Type[T] {
  switch (type) {
  case "f32":
    return typeof value === "number";
  case "u32":
    return typeof value === "number";
  case "vec2f":
    return value instanceof Vec2 ||
          (Array.isArray(value) && value.length === 2);
  case "vec3f":
    return value instanceof Vec3 ||
           (Array.isArray(value) && value.length === 3);
  case "vec4f":
    return value instanceof Vec4 ||
           value instanceof Color ||
           (Array.isArray(value) && value.length === 4);
  case "mat4f":
    return value instanceof Mat4 ||
           value instanceof MatMut4;
  default:
    // make sure type is never type -> we cover all types
    return type;
  }
}

export function instanceDataPropertyValueSerialize(
  value: InstanceDataPropertyValue,
  type: InstanceDataPropertyType,
  target: ArrayBufferLike,
  byteOffset: number,
): void {
  const floats = new Float32Array(target, byteOffset);
  const u32s = new Uint32Array(target, byteOffset);

  switch (type) {
  case "f32":
    if (!instanceDataPropertyValueIsCorrect(value, type))
      throw new Error("Invalid property value");
    floats[0] = value;
    break;
  case "u32":
    if (!instanceDataPropertyValueIsCorrect(value, type))
      throw new Error("Invalid property value");
    u32s[0] = value;
    break;
  case "vec2f":
  case "vec3f":
  case "vec4f":
    if (!instanceDataPropertyValueIsCorrect(value, type))
      throw new Error("Invalid property value");
    floats.set(Array.isArray(value) ? value : value.vals);
    break;
  case "mat4f":
    if (!instanceDataPropertyValueIsCorrect(value, type))
      throw new Error("Invalid property value");
    floats.set(value.transpose().vals);
    break;
  default:
    // make sure type is never type -> we cover all types
    return type;
  }
}

export class Material {
  public customBindGroups: {
    target: number,
    bg: GPUBindGroup,
  }[] = [];

  constructor(
    public renderer: Renderer,
    public pipeline: GPURenderPipeline,
    public instanceDataLayout: Readonly<InstanceDataLayout>,
  ) {
    Object.freeze(instanceDataLayout);
  }

  public static fromSource(
    renderer: Renderer,
    src: string,
    instanceDataLayout: Readonly<InstanceDataLayout>,
  ): Material {
    const device = renderer.device;

    const shaderModule = device.createShaderModule({
      code: src,
    });

    const pipeline = device.createRenderPipeline({
      layout: "auto",
      vertex: {
        module: shaderModule,
        buffers: [
          // position
          {
            arrayStride: 3 * 4,
            attributes: [
              { shaderLocation: 0, offset: 0, format: "float32x3" },
            ],
          },
          // normals
          {
            arrayStride: 3 * 4,
            attributes: [
              { shaderLocation: 1, offset: 0, format: "float32x3" },
            ],
          },
          // uvs
          {
            arrayStride: 2 * 4,
            attributes: [
              { shaderLocation: 2, offset: 0, format: "float32x2" },
            ],
          },
        ],
      },
      fragment: {
        module: shaderModule,
        targets: [
          { format: renderer.presentationFormat },
        ],
      },

      primitive: {
        topology: "triangle-list",
        cullMode: "none",
        // cullMode: "back",
      },

      depthStencil: {
        depthWriteEnabled: true,
        depthCompare: "less",
        format: "depth24plus",
      },

      multisample: renderer.sampleCount > 1 ? {
        count: renderer.sampleCount,
      } : undefined,
    });

    return new Material(renderer, pipeline, instanceDataLayout);
  }

  public getInstanceDataLayoutProperty(name: string): InstanceDataLayoutProperty | null {
    return this.instanceDataLayout.properties
      .find(prop => prop.name === name) ?? null;
  }

  public clean() {
  }
}
