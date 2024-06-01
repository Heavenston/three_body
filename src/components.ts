import { Component, Entity } from "./entity";
import { G, clamp } from "./math";
import { Color } from "./math/color";
import { Mat3, Mat4 } from "./math/mat";
import { Vec2, Vec3 } from "./math/vec";
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

export class MassiveComponent extends Component {
  public mass: number = 1;

  public withMass(mass: number): this {
    this.mass = mass;
    return this;
  }
}

export class ParticleComponent extends Component {
  public velocity: Vec3 = Vec3.ZERO;
  public radius: number = 0.5;

  public withVelocity(vel: Vec3): this {
    this.velocity = vel;
    return this;
  }

  public override update() {
    super.update();
    const dt = this.application.dt;

    const transform = this.entity.components.unwrap_get(TransformComponent);

    let force = Vec3.ZERO;

    for (const entity of this.application.entities) {
      if (entity === this.entity)
        continue;
      const other_transform = entity.components.get(TransformComponent);
      if (!other_transform)
        continue;
      const other_mass = entity.components.get(MassiveComponent);
      if (!other_mass)
        continue;
      const diff = other_transform.translation
        .sub(transform.translation);
      const dist = diff.norm();
      const dir = diff.div(dist);

      let actualDist = clamp(dist, this.radius, null);

      force = force.add(dir.mul((G * other_mass.mass) / (actualDist ** 2)))
        .as_vec3();
    }

    this.velocity = this.velocity.add(force.mul(dt))
      .as_vec3();

    transform.globalRotateZ(-(this.velocity.x / this.radius) * dt);
    transform.globalRotateX((this.velocity.z / this.radius) * dt);

    transform.translate(this.velocity.mul(dt).as_vec3());
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
