import { Renderer } from "./engine/renderer";

export class Material {
  constructor(
    public renderer: Renderer,
  ) {}

  public static fromSources(
    renderer: Renderer,
    vertexSource: string,
    fragmentSource: string,
  ): Material {
    return new Material(renderer);
  }

  public clean() {
  }
}
