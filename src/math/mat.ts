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

  public mul(other: Mat3): Mat3 {
    // yes this is very slow
    // what you gonna do about it ?
    return new Mat3(
      this.row(0).dot(other.column(0)), this.row(0).dot(other.column(1)), this.row(0).dot(other.column(2)),
      this.row(1).dot(other.column(0)), this.row(1).dot(other.column(1)), this.row(1).dot(other.column(2)),
      this.row(2).dot(other.column(0)), this.row(2).dot(other.column(1)), this.row(2).dot(other.column(2)),
    );
  }
}

export class Mat4 {
  public readonly vals: Readonly<number[]>;

  constructor(...vals: number[]) {
    if (vals.length !== 16)
      throw new RangeError("9 elements expected");
    this.vals = Object.freeze(vals);
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

  public get(row: number, col: number): number {
    if (row >= 4 || col >= 4 || row < 0 || col < 0)
      throw new RangeError("out of bound get");
    return this.vals[col + row * 4];
  }

  public transpose(): Mat4 {
    return new Mat4(
      this.vals[0], this.vals[4], this.vals[7],  this.vals[11],
      this.vals[1], this.vals[5], this.vals[8],  this.vals[12],
      this.vals[2], this.vals[6], this.vals[9],  this.vals[13],
      this.vals[3], this.vals[7], this.vals[10], this.vals[14],
    );
  }

  public column(col: number): Vec4 {
    if (col >= 4 || col < 0)
      throw new RangeError("out of bound get");
    return new Vec4(this.vals[col], this.vals[col + 4], this.vals[col + 8], this.vals[col + 12]);
  }

  public row(row: number): Vec3 {
    if (row >= 3 || row < 0)
      throw new RangeError("out of bound get");
    return new Vec4(this.vals[row * 4], this.vals[row * 4 + 1], this.vals[row * 4 + 2], this.vals[row * 4 + 3]);
  }

  public add(other: Mat4): Mat4 {
    return new Mat4(...this.vals.map((v, i) => v + other.vals[i]));
  }

  public sub(other: Mat4): Mat4 {
    return new Mat4(...this.vals.map((v, i) => v - other.vals[i]));
  }

  public mul(other: Mat4): Mat4;
  public mul(other: number): Mat4;
  public mul(other: Mat4 | number): Mat4 {
    if (typeof other === "number") {
      return new Mat4(...this.vals.map(val => val * other));
    }
    // yes this is very slow
    // what you gonna do about it ?
    return new Mat4(
      this.row(0).dot(other.column(0)), this.row(0).dot(other.column(1)), this.row(0).dot(other.column(2)), this.row(0).dot(other.column(3)),
      this.row(1).dot(other.column(0)), this.row(1).dot(other.column(1)), this.row(1).dot(other.column(2)), this.row(1).dot(other.column(3)),
      this.row(2).dot(other.column(0)), this.row(2).dot(other.column(1)), this.row(2).dot(other.column(2)), this.row(2).dot(other.column(3)),
      this.row(3).dot(other.column(0)), this.row(3).dot(other.column(1)), this.row(3).dot(other.column(2)), this.row(3).dot(other.column(3)),
    );
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
      return ((r + c) % 2 === 0 ? 1 : -1) * (submat[0] * submat[3] - submat[1] * submat[2]);
    };

    return new Mat4(
      cofactor(0, 0), cofactor(1, 0), cofactor(2, 0), cofactor(3, 0),
      cofactor(0, 1), cofactor(1, 1), cofactor(2, 1), cofactor(3, 1),
      cofactor(0, 2), cofactor(1, 2), cofactor(2, 2), cofactor(3, 2),
      cofactor(0, 3), cofactor(1, 3), cofactor(2, 3), cofactor(3, 3),
    );
  }

  public inverse(): Mat4 | null {
    const det = this.det();
    if (isZeroApprox(det)) return null;

    const cofactorMatrix = this.comatrix();
    const adjugate = cofactorMatrix.transpose();
    return adjugate.div(det);
  }}
