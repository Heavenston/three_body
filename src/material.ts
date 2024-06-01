import { Renderer } from "./engine/renderer";

export class Material {
  constructor(
    public renderer: Renderer,
    public pipeline: GPURenderPipeline,
  ) {}

  public static fromSource(
    renderer: Renderer,
    src: string,
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

    return new Material(renderer, pipeline);
  }

  public clean() {
  }
}
