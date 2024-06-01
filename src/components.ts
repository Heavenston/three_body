import { Component, Entity } from "./entity";
import { Color } from "./math/color";
import { Mat3, Mat4 } from "./math/mat";
import { Vec3 } from "./math/vec";
import { Mesh } from "./renderer";

export class TransformComponent extends Component {
  public translation: Vec3 = Vec3.ZERO;
  public affine: Mat3 = Mat3.IDENT;

  public modelToWorld(): Mat4 {
    return this.affine.expand()
      .mul(Mat4.fromTranslation(this.translation));
  }

  public withTranslation(trans: Vec3): this {
    this.translation = trans;
    return this;
  }
}

export class CameraComponent extends Component {
  public fov: number = 100;
  public near: number = 0.01;
  public far: number = 1_000_000;
  public aspect: number = 16 / 9;

  public clearColor: Color | null = Color.BLACK;

  public withClearColor(c: Color): this {
    this.clearColor = c;
    return this;
  }

  public view(): Mat4 {
    const transform = this.entity.components.unwrap_get(TransformComponent);
    return transform.modelToWorld().inverse() ?? Mat4.IDENT;
  }

  public projection(): Mat4 {
    return Mat4.newPerspective(
      (this.fov / 180) * Math.PI,
      this.aspect, this.near, this.far,
    )
  }
}

export class MeshComponent extends Component {
  constructor(
    entity: Entity,
    public mesh: Mesh,
  ) {
    super(entity);
  }
}
