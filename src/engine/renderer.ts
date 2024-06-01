import { Application } from "./application";
import { Entity } from "./entity";
import { CameraComponent, MeshComponent, TransformComponent } from "./components";

export class Renderer {
  public canvas: HTMLCanvasElement;

  public application: Application;

  public mainCamera: Entity | null = null;

  constructor(
    application: Application,
    canvas: HTMLCanvasElement,
  ) {
    this.application = application;
    this.canvas = canvas;
  }

  public render() {
    const cameraEntity = this.mainCamera;
    if (!cameraEntity)
      return;

    const cameraComponent = cameraEntity.components.unwrap_get(CameraComponent);
    const clearColor = cameraComponent.clearColor;

    cameraComponent.aspect = this.canvas.width / this.canvas.height;

    const viewMatrix = cameraComponent.view();
    const projectionMatrix = cameraComponent.projection();

    const viewProjMatrix = projectionMatrix.mul(viewMatrix);

    for (const entity of this.application.entities) {
      const meshComp = entity.components.get(MeshComponent);
      if (!meshComp)
        continue;
      const mesh = meshComp.mesh;

      const transform = entity.components.get(TransformComponent);
      if (!transform)
        continue;

      const modelMatrix = transform.modelToWorld();
      const mvpMatrix = viewProjMatrix.mul(modelMatrix);
    }
  }
}
