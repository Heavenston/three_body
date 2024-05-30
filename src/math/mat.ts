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

  public mul(other: Mat4): Mat4 {
    // yes this is very slow
    // what you gonna do about it ?
    return new Mat4(
      this.row(0).dot(other.column(0)), this.row(0).dot(other.column(1)), this.row(0).dot(other.column(2)), this.row(0).dot(other.column(3)),
      this.row(1).dot(other.column(0)), this.row(1).dot(other.column(1)), this.row(1).dot(other.column(2)), this.row(1).dot(other.column(3)),
      this.row(2).dot(other.column(0)), this.row(2).dot(other.column(1)), this.row(2).dot(other.column(2)), this.row(2).dot(other.column(3)),
      this.row(3).dot(other.column(0)), this.row(3).dot(other.column(1)), this.row(3).dot(other.column(2)), this.row(3).dot(other.column(3)),
    );
  }
}
