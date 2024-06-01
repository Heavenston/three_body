import { Component, Entity } from "./entity";
import { Color } from "./math/color";
import { Mat3, Mat4 } from "./math/mat";
import { Vec3 } from "./math/vec";
import { Mesh } from "./renderer";

export class TransformComponent extends Component {
  public translation: Vec3 = Vec3.ZERO;
  public affine: Mat3 = Mat3.IDENT;

  public override start(): void {
      console.log(this);
  }

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

export class RotateComponent extends Component {
  public override update() {
    super.update();
    const time = this.application.totalTime;
    const dt = this.application.dt;

    const transform = this.entity.components.unwrap_get(TransformComponent);
    
    transform.affine = transform.affine.mul(Mat3.rotateY(dt));
    transform.affine = transform.affine.mul(Mat3.rotateX(dt * Math.sin(time * Math.PI) * 4));
    transform.affine = transform.affine.mul(Mat3.rotateZ(dt * Math.cos(time * Math.PI) * Math.sin(time) * 8));
  }
}

export class LookAroundComponent extends Component {
  public override update() {
    super.update();
    const dt = this.application.dt;

    const transform = this.entity.components.unwrap_get(TransformComponent);
    
    transform.translation = Mat3.rotateY(dt).mul(transform.translation);
    transform.affine = Mat3.looking_at(transform.translation, Vec3.ZERO, Vec3.UP);
  }
}
