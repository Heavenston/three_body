import { Component, Entity } from "./entity";
import { Color } from "~/src/math/color";
import { Mat3, Mat4 } from "~/src/math/mat";
import { Vec3 } from "~/src/math/vec";
import { Mesh } from "./renderer";

export class TransformComponent extends Component {
  public translation: Vec3 = Vec3.ZERO;
  public affine: Mat3 = Mat3.IDENT;

  public modelToWorld(): Mat4 {
    return Mat4.fromTranslation(this.translation)
      .mul(this.affine.expand());
  }

  public translate(trans: Vec3): this {
    this.translation = this.translation.add(trans).as_vec3();
    return this;
  }

  public scale(scale: Vec3 | number): this {
    scale = scale instanceof Vec3 ? scale : Vec3.splat(scale);
    this.affine = this.affine.mul(Mat3.scale(scale));
    return this;
  }

  public rotateX(angle: number): this {
    this.affine = this.affine.mul(Mat3.rotateX(angle));
    return this;
  }

  public rotateY(angle: number): this {
    this.affine = this.affine.mul(Mat3.rotateY(angle));
    return this;
  }

  public rotateZ(angle: number): this {
    this.affine = this.affine.mul(Mat3.rotateZ(angle));
    return this;
  }

  public globalRotateX(angle: number): this {
    this.affine = Mat3.rotateX(angle).mul(this.affine);
    return this;
  }

  public globalRotateY(angle: number): this {
    this.affine = Mat3.rotateY(angle).mul(this.affine);
    return this;
  }

  public globalRotateZ(angle: number): this {
    this.affine = Mat3.rotateZ(angle).mul(this.affine);
    return this;
  }

  public lookAt(to: Vec3): this {
    this.affine = Mat3.looking_at(this.translation, to, Vec3.UP);
    return this;
  }
}

export class CameraComponent extends Component {
  public fov_degrees: number = 45;
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
    return Mat4.newPerspective({
      fov_radians: (this.fov_degrees / 180) * Math.PI,
      aspect: this.aspect,
      near: this.near,
      far: this.far,
    });
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
