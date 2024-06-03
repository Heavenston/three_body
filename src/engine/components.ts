import { Component, Entity } from "./entity";
import { Color } from "~/src/math/color";
import { Mat3, Mat4, MatMut4 } from "~/src/math/mat";
import { Vec3 } from "~/src/math/vec";
import { Mesh } from "./mesh";
import { InstanceGroup, Renderer } from "./renderer";
import { InstanceData, InstanceDataPropertyValue, Material, instanceDataPropertyValueIsCorrect } from "../material";

export class TransformComponent extends Component {
  #expandedAffine: Mat4 | null = null;

  #translation: Vec3 = Vec3.ZERO;
  #translationDirty: boolean = true;
  #affine: Mat3 = Mat3.IDENT;
  #affineDirty: boolean = true;

  get translation(): Vec3 {
    return this.#translation;
  }
  set translation(value: Vec3) {
    this.#translationDirty = true;
    this.#translation = value;
  }
  get affine(): Mat3 {
    return this.#affine;
  }
  set affine(value: Mat3) {
    this.#affine = value;
    this.#affineDirty = true;
    this.#expandedAffine = null;
  }

  get isDirty(): boolean {
    return this.#translationDirty || this.#affineDirty;
  }

  get expandedAffine(): Mat4 {
    if (!this.#expandedAffine)
      this.#expandedAffine = this.#affine.expand();
    return this.#expandedAffine;
  }
  
  public modelToWorld(out?: MatMut4): MatMut4 {
    return (out ?? new MatMut4())
      .setFromTranslation(this.translation)
      .mul(this.expandedAffine);
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

  public override afterUpdate(): void {
    this.#affineDirty = false;
    this.#translationDirty = false;
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
    return transform.modelToWorld().freeze().inverse() ?? Mat4.IDENT;
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

export class RenderComponent extends Component {
  #instanceData: InstanceData = {};

  public readonly renderer: Renderer;
  public instanceGroup: InstanceGroup | null = null;

  constructor(
    entity: Entity,
    public readonly mesh: Mesh,
    public readonly material: Material,
  ) {
    super(entity);
    this.renderer = this.application.renderer;
  }

  public get instanceData(): Readonly<InstanceData> {
    return this.#instanceData;
  }

  public get requireUpdate(): boolean {
    return this.instanceGroup === null ||
      (this.entity.components.get(TransformComponent)?.isDirty ?? false) ||
      (this.entity.parent?.components.get(RenderComponent)?.requireUpdate ?? false);
  }

  public withInstanceData(name: string, val: InstanceDataPropertyValue): this {
    const prop = this.material.getInstanceDataLayoutProperty(name);
    if (prop === null)
      throw new Error(`Property '${name}' does not exist in material`);
    if (!instanceDataPropertyValueIsCorrect(val, prop.type))
      throw new Error("Value does not match type required by material");
    this.#instanceData[name] = val;
    return this;
  }

  public removeInstanceData(key: string): this {
    delete this.#instanceData[key];
    return this;
  }
}
