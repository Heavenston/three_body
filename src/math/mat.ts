import { isZeroApprox } from "../math";
import { Vec3, Vec4 } from "./vec";

export class Mat3 {
  public readonly vals: Readonly<number[]>;

  constructor(...vals: number[]) {
    if (vals.length !== 9)
      throw new RangeError("9 elements expected");
    this.vals = Object.freeze(vals);
  }

  public static IDENT: Mat3 = new Mat3(
    1, 0, 0,
    0, 1, 0,
    0, 0, 1,
  );

  public static scale(scale: Vec3): Mat3 {
    return new Mat3(
      scale.x, 0, 0,
      0, scale.y, 0,
      0, 0, scale.z,
    );
  }

  public static rotateX(angle: number): Mat3 {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return new Mat3(
      1, 0, 0,
      0, cos, -sin,
      0, sin, cos,
    );
  }

  public static rotateY(angle: number): Mat3 {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return new Mat3(
      cos,  0, sin,
      0,    1, 0,
      -sin, 0, cos,
    );
  }

  public static rotateZ(angle: number): Mat3 {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return new Mat3(
      cos, -sin, 0,
      sin,  cos, 0,
      0,    0,   1,
    );
  }

  public static looking_at(from: Vec3, to: Vec3, up: Vec3): Mat3 {
    const forward = to.sub(from).normalize().as_vec3();
    const right = forward.cross(up).normalize().as_vec3();
    const newUp = right.cross(forward).normalize().as_vec3();

    return new Mat3(
      right.x, newUp.x, -forward.x,
      right.y, newUp.y, -forward.y,
      right.z, newUp.z, -forward.z
    );
  }

  public get(row: number, col: number): number {
    if (row >= 3 || col >= 3 || row < 0 || col < 0)
      throw new RangeError("out of bound get");
    return this.vals[col + row * 3];
  }

  public column(col: number): Vec3 {
    if (col >= 3 || col < 0)
      throw new RangeError("out of bound get");
    return new Vec3(this.vals[col], this.vals[col + 3], this.vals[col + 6]);
  }

  public row(row: number): Vec3 {
    if (row >= 3 || row < 0)
      throw new RangeError("out of bound get");
    return new Vec3(this.vals[row*3], this.vals[row*3 + 1], this.vals[row*3 + 2]);
  }

  public expand(): Mat4 {
    return new Mat4(
      this.vals[0], this.vals[1], this.vals[2], 0,
      this.vals[3], this.vals[4], this.vals[5], 0,
      this.vals[6], this.vals[7], this.vals[8], 0,
      0,            0,            0,            1,
    );
  }

  public expandMut(): MatMut4 {
    return new MatMut4([
      this.vals[0], this.vals[1], this.vals[2], 0,
      this.vals[3], this.vals[4], this.vals[5], 0,
      this.vals[6], this.vals[7], this.vals[8], 0,
      0,            0,            0,            1,
    ]);
  }

  public transpose(): Mat3 {
    return new Mat3(
      this.vals[0], this.vals[3], this.vals[6],
      this.vals[1], this.vals[4], this.vals[7],
      this.vals[2], this.vals[5], this.vals[8],
    );
  }

  public add(other: Mat3): Mat3 {
    return new Mat3(...this.vals.map((v, i) => v + other.vals[i]));
  }

  public sub(other: Mat3): Mat3 {
    return new Mat3(...this.vals.map((v, i) => v - other.vals[i]));
  }

  public mul(vec: Vec3): Vec3;
  public mul(mat: Mat3): Mat3;
  public mul(other: Mat3 | Vec3): Mat3 | Vec3 {
    if (other instanceof Vec3) {
      return new Vec3(
        this.column(0).dot(other),
        this.column(1).dot(other),
        this.column(2).dot(other),
      );
    }

    // yes this is very slow
    // what you gonna do about it ?
    return new Mat3(
      this.row(0).dot(other.column(0)), this.row(0).dot(other.column(1)), this.row(0).dot(other.column(2)),
      this.row(1).dot(other.column(0)), this.row(1).dot(other.column(1)), this.row(1).dot(other.column(2)),
      this.row(2).dot(other.column(0)), this.row(2).dot(other.column(1)), this.row(2).dot(other.column(2)),
    );
  }
}

export type SomeMat4 = Mat4 | MatMut4;

export class Mat4 {
  public readonly vals: Readonly<number[]>;

  constructor(vals: number[]);
  constructor(...vals: number[]);
  constructor(val1: number | number[], ...vals: number[]) {
    if (typeof val1 === "number") {
      this.vals = Object.freeze([val1, ...vals]);
    }
    else if (Array.isArray(val1)) {
      this.vals = Object.freeze(val1);
    }
    else
      throw new TypeError("invalid");
    if (this.vals.length !== 16)
      throw new RangeError("9 elements expected");
  }

  public static IDENT: Mat4 = new Mat4(
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
  );

  public static fromTranslation(trans: Vec3): Mat4 {
    return new Mat4(
      1, 0, 0, trans.x,
      0, 1, 0, trans.y,
      0, 0, 1, trans.z,
      0, 0, 0, 1,
    );
  }

  public static newPerspective(cfg: {
    fov_radians: number,
    aspect: number,
    near: number,
    far: number,
  }): Mat4 {
    const f = Math.tan(Math.PI * 0.5 - 0.5 * cfg.fov_radians);
    const rangeInv = 1 / (cfg.near - cfg.far);

    return new Mat4(
      f / cfg.aspect, 0, 0,                                   0,
      0,              f, 0,                                   0,
      0,              0, (cfg.near + cfg.far) * rangeInv,    -1,
      0,              0, cfg.near * cfg.far * rangeInv * 2,   0
    ).transpose();
    // const f = 1 / Math.tan(fov_radians / 2);

    // return new Mat4(
    //   f,     0,     0,                          0,
    //   0,     f,     0,                          0,
    //   0,     0,     -far / (far - near),        -far * near / (far - near),
    //   0,     0,     -1,                         1,
    // );
  }

  public get(row: number, col: number): number {
    if (row >= 4 || col >= 4 || row < 0 || col < 0)
      throw new RangeError("out of bound get");
    return this.vals[col + row * 4];
  }

  public transpose(): Mat4 {
    return new Mat4(
      this.vals[0], this.vals[4], this.vals[8],  this.vals[12],
      this.vals[1], this.vals[5], this.vals[9],  this.vals[13],
      this.vals[2], this.vals[6], this.vals[10], this.vals[14],
      this.vals[3], this.vals[7], this.vals[11], this.vals[15],
    );
  }

  public column(col: number): Vec4 {
    if (col >= 4 || col < 0)
      throw new RangeError("out of bound get");
    return new Vec4(this.vals[col], this.vals[col + 4], this.vals[col + 8], this.vals[col + 12]);
  }

  public row(row: number): Vec4 {
    if (row >= 4 || row < 0)
      throw new RangeError("out of bound get");
    return new Vec4(this.vals[row * 4], this.vals[row * 4 + 1], this.vals[row * 4 + 2], this.vals[row * 4 + 3]);
  }

  public add(other: SomeMat4): Mat4 {
    return new Mat4(...this.vals.map((v, i) => v + other.vals[i]));
  }

  public sub(other: SomeMat4): Mat4 {
    return new Mat4(...this.vals.map((v, i) => v - other.vals[i]));
  }

  public mul(other: SomeMat4): Mat4;
  public mul(other: number): Mat4;
  public mul(other: SomeMat4 | number): Mat4 {
    if (typeof other === "number") {
      return new Mat4(...this.vals.map(val => val * other));
    }

    const a = this.vals;
    const b = other.vals;
    const result = new Array(16);

    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        result[col + row * 4] =
          a[row * 4] * b[col] +
          a[row * 4 + 1] * b[col + 4] +
          a[row * 4 + 2] * b[col + 8] +
          a[row * 4 + 3] * b[col + 12];
      }
    }

    return new Mat4(...result);
  }
  public div(other: number): Mat4 {
    return new Mat4(...this.vals.map(val => val / other));
  }

  public det(): number {
    const m = this.vals;
    return (
      m[3] * m[6] * m[9] * m[12] - m[2] * m[7] * m[9] * m[12] - m[3] * m[5] * m[10] * m[12] + m[1] * m[7] * m[10] * m[12] +
      m[2] * m[5] * m[11] * m[12] - m[1] * m[6] * m[11] * m[12] - m[3] * m[6] * m[8] * m[13] + m[2] * m[7] * m[8] * m[13] +
      m[3] * m[4] * m[10] * m[13] - m[0] * m[7] * m[10] * m[13] - m[2] * m[4] * m[11] * m[13] + m[0] * m[6] * m[11] * m[13] +
      m[3] * m[5] * m[8] * m[14] - m[1] * m[7] * m[8] * m[14] - m[3] * m[4] * m[9] * m[14] + m[0] * m[7] * m[9] * m[14] +
      m[1] * m[4] * m[11] * m[14] - m[0] * m[5] * m[11] * m[14] - m[2] * m[5] * m[8] * m[15] + m[1] * m[6] * m[8] * m[15] +
      m[2] * m[4] * m[9] * m[15] - m[0] * m[6] * m[9] * m[15] - m[1] * m[4] * m[10] * m[15] + m[0] * m[5] * m[10] * m[15]
    );
  }

  public comatrix(): Mat4 {
    const m = this.vals;
    const cofactor = (r: number, c: number): number => {
      const submat = [];
      for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
          if (i !== r && j !== c) {
            submat.push(m[i * 4 + j]);
          }
        }
      }
      const determinant3x3 = (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number): number => {
        return a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
      };
      return ((r + c) % 2 === 0 ? 1 : -1) * determinant3x3(submat[0], submat[1], submat[2], submat[3], submat[4], submat[5], submat[6], submat[7], submat[8]);
    };

    return new Mat4(
      cofactor(0, 0), cofactor(0, 1), cofactor(0, 2), cofactor(0, 3),
      cofactor(1, 0), cofactor(1, 1), cofactor(1, 2), cofactor(1, 3),
      cofactor(2, 0), cofactor(2, 1), cofactor(2, 2), cofactor(2, 3),
      cofactor(3, 0), cofactor(3, 1), cofactor(3, 2), cofactor(3, 3),
    );
  }

  public inverse(): Mat4 | null {
    const det = this.det();
    if (isZeroApprox(det)) return null;

    const cofactorMatrix = this.comatrix();
    const adjugate = cofactorMatrix.transpose();
    return adjugate.div(det);
  }

  public asMut(): MatMut4 {
    return new MatMut4([...this.vals]);
  }
}

export class MatMut4 {
  public vals: number[];

  constructor(vals?: number[]) {
    if (vals) {
      if (vals.length !== 16) throw new RangeError("16 elements expected");
      this.vals = vals;
    } else {
      this.vals = new Array(16).fill(0);
    }
  }

  public static IDENT: MatMut4 = new MatMut4([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
  ]);

  public setFromTranslation(trans: Vec3): MatMut4 {
    this.vals = [
      1, 0, 0, trans.x,
      0, 1, 0, trans.y,
      0, 0, 1, trans.z,
      0, 0, 0, 1,
    ];
    return this;
  }

  public setPerspective(cfg: {
    fov_radians: number,
    aspect: number,
    near: number,
    far: number,
  }): this {
    const f = Math.tan(Math.PI * 0.5 - 0.5 * cfg.fov_radians);
    const rangeInv = 1 / (cfg.near - cfg.far);

    this.vals = [
      f / cfg.aspect, 0, 0,                                   0,
      0,              f, 0,                                   0,
      0,              0, (cfg.near + cfg.far) * rangeInv,    -1,
      0,              0, cfg.near * cfg.far * rangeInv * 2,   0
    ];

    this.transpose();
    return this;
  }

  public clone(): MatMut4 {
    return new MatMut4(this.vals.slice());
  }

  public freeze(): Mat4 {
    return new Mat4(this.vals);
  }

  public get(row: number, col: number): number {
    if (row >= 4 || col >= 4 || row < 0 || col < 0)
      throw new RangeError("out of bound get");
    return this.vals[col + row * 4];
  }

  public transpose(): MatMut4 {
    const m = this.vals;

    let tmp: number;

    tmp = m[1]; m[1] = m[4]; m[4] = tmp;
    tmp = m[2]; m[2] = m[8]; m[8] = tmp;
    tmp = m[3]; m[3] = m[12]; m[12] = tmp;
    tmp = m[6]; m[6] = m[9]; m[9] = tmp;
    tmp = m[7]; m[7] = m[13]; m[13] = tmp;
    tmp = m[11]; m[11] = m[14]; m[14] = tmp;

    return this;
  }

  public column(col: number): Vec4 {
    if (col >= 4 || col < 0) throw new RangeError("out of bound get");
    return new Vec4(this.vals[col], this.vals[col + 4], this.vals[col + 8], this.vals[col + 12]);
  }

  public row(row: number): Vec4 {
    if (row >= 4 || row < 0) throw new RangeError("out of bound get");
    return new Vec4(this.vals[row * 4], this.vals[row * 4 + 1], this.vals[row * 4 + 2], this.vals[row * 4 + 3]);
  }

  public add(other: SomeMat4, output?: MatMut4): MatMut4 {
    const result = output || this;
    for (let i = 0; i < 16; i++) {
      result.vals[i] = this.vals[i] + other.vals[i];
    }
    return result;
  }

  public sub(other: SomeMat4, output?: MatMut4): MatMut4 {
    const result = output || this;
    for (let i = 0; i < 16; i++) {
      result.vals[i] = this.vals[i] - other.vals[i];
    }
    return result;
  }

  public mul(other: SomeMat4 | number, output?: MatMut4): MatMut4 {
    const result = output || new MatMut4();
    if (typeof other === "number") {
      for (let i = 0; i < 16; i++) {
        result.vals[i] = this.vals[i] * other;
      }
      return result;
    }

    const a = this.vals;
    const b = other.vals;
    const r = result.vals;

    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        r[col + row * 4] =
          a[row * 4] * b[col] +
          a[row * 4 + 1] * b[col + 4] +
          a[row * 4 + 2] * b[col + 8] +
          a[row * 4 + 3] * b[col + 12];
      }
    }

    return result;
  }

  public div(other: number, output?: MatMut4): MatMut4 {
    const result = output || this;
    for (let i = 0; i < 16; i++) {
      result.vals[i] = this.vals[i] / other;
    }
    return result;
  }

  public det(): number {
    const m = this.vals;
    return (
      m[3] * m[6] * m[9] * m[12] - m[2] * m[7] * m[9] * m[12] - m[3] * m[5] * m[10] * m[12] + m[1] * m[7] * m[10] * m[12] +
      m[2] * m[5] * m[11] * m[12] - m[1] * m[6] * m[11] * m[12] - m[3] * m[6] * m[8] * m[13] + m[2] * m[7] * m[8] * m[13] +
      m[3] * m[4] * m[10] * m[13] - m[0] * m[7] * m[10] * m[13] - m[2] * m[4] * m[11] * m[13] + m[0] * m[6] * m[11] * m[13] +
      m[3] * m[5] * m[8] * m[14] - m[1] * m[7] * m[8] * m[14] - m[3] * m[4] * m[9] * m[14] + m[0] * m[7] * m[9] * m[14] +
      m[1] * m[4] * m[11] * m[14] - m[0] * m[5] * m[11] * m[14] - m[2] * m[5] * m[8] * m[15] + m[1] * m[6] * m[8] * m[15] +
      m[2] * m[4] * m[9] * m[15] - m[0] * m[6] * m[9] * m[15] - m[1] * m[4] * m[10] * m[15] + m[0] * m[5] * m[10] * m[15]
    );
  }

  public comatrix(output?: MatMut4): MatMut4 {
    const result = output || new MatMut4();
    const m = this.vals;
    const r = result.vals;

    const cofactor = (r: number, c: number): number => {
      const submat = [];
      for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
          if (i !== r && j !== c) {
            submat.push(m[i * 4 + j]);
          }
        }
      }
      const determinant3x3 = (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number): number => {
        return a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
      };
      const det = determinant3x3(submat[0], submat[1], submat[2], submat[3], submat[4], submat[5], submat[6], submat[7], submat[8]);
      return ((r + c) % 2 === 0 ? 1 : -1) * det;
    };

    r[0] = cofactor(0, 0); r[1] = cofactor(0, 1); r[2] = cofactor(0, 2); r[3] = cofactor(0, 3);
    r[4] = cofactor(1, 0); r[5] = cofactor(1, 1); r[6] = cofactor(1, 2); r[7] = cofactor(1, 3);
    r[8] = cofactor(2, 0); r[9] = cofactor(2, 1); r[10] = cofactor(2, 2); r[11] = cofactor(2, 3);
    r[12] = cofactor(3, 0); r[13] = cofactor(3, 1); r[14] = cofactor(3, 2); r[15] = cofactor(3, 3);

    return result;
  }

  public inverse(output?: MatMut4): MatMut4 | null {
    const det = this.det();
    if (isZeroApprox(det)) return null;

    const result = this.comatrix(output);
    result.transpose();
    result.div(det);
    return result;
  }
}
