import { clamp, expDecay } from "../math";

export class InvalidDimensionsError extends Error {
  constructor(public readonly a: VecN, public readonly b: VecN) {
    super("invalid dimensions");
  }
}

export class VecN {
  public readonly vals: Readonly<number[]>;

  public constructor(...vals: number[]) {
    this.vals = Object.freeze(vals);
  }

  public get dims(): number {
    return this.vals.length;
  }

  public static splat(dim: number, val: number): VecN {
    return new VecN(...new Array(dim).fill(val));
  }

  public static random(dim: number): VecN {
    return new VecN(...new Array(dim).fill(null).map(() => Math.random()));
  }

  public eq(other: VecN): boolean;
  public eq(val: number): boolean;
  public eq(...vals: number[]): boolean;
  public eq(first: VecN | number, ...vals: number[]): boolean {
    if (first instanceof VecN && vals.length === 0) {
      if (first.dims !== this.dims)
        throw new InvalidDimensionsError(this, first);
      return this.vals.every((val, i) => val === first.vals[i]);
    }

    if (typeof first === "number" && vals.length === 0) {
      return this.eq(VecN.splat(this.dims, first));
    }

    if (typeof first === "number" && vals.length === this.dims-1) {
      return this.eq(new VecN(first, ...vals));
    }

    throw new TypeError("wrong types");
  }

  public add(other: VecN): VecN;
  public add(val: number): VecN;
  public add(...vals: number[]): VecN;
  public add(first: VecN | number, ...vals: number[]): VecN {
    if (first instanceof VecN && vals.length === 0) {
      if (first.dims !== this.dims)
        throw new InvalidDimensionsError(this, first);
      return new VecN(...this.vals.map((val, i) => val + first.vals[i]));
    }

    if (typeof first === "number" && vals.length === 0) {
      return this.add(VecN.splat(this.dims, first));
    }

    if (typeof first === "number" && vals.length === this.dims-1) {
      return this.add(new VecN(first, ...vals));
    }

    throw new TypeError("wrong types");
  }

  public sub(other: VecN): VecN;
  public sub(val: number): VecN;
  public sub(...vals: number[]): VecN;
  public sub(first: VecN | number, ...vals: number[]): VecN {
    if (first instanceof VecN && vals.length === 0) {
      if (first.dims !== this.dims)
        throw new InvalidDimensionsError(this, first);
      return new VecN(...this.vals.map((val, i) => val - first.vals[i]));
    }

    if (typeof first === "number" && vals.length === 0) {
      return this.sub(VecN.splat(this.dims, first));
    }

    if (typeof first === "number" && vals.length === this.dims-1) {
      return this.sub(new VecN(first, ...vals));
    }

    throw new TypeError("wrong types");
  }

  public mul(other: VecN): VecN;
  public mul(val: number): VecN;
  public mul(...vals: number[]): VecN;
  public mul(first: VecN | number, ...vals: number[]): VecN {
    if (first instanceof VecN && vals.length === 0) {
      if (first.dims !== this.dims)
        throw new InvalidDimensionsError(this, first);
      return new VecN(...this.vals.map((val, i) => val * first.vals[i]));
    }

    if (typeof first === "number" && vals.length === 0) {
      return this.mul(VecN.splat(this.dims, first));
    }

    if (typeof first === "number" && vals.length === this.dims-1) {
      return this.mul(new VecN(first, ...vals));
    }

    throw new TypeError("wrong types");
  }

  public div(other: VecN): VecN;
  public div(val: number): VecN;
  public div(...vals: number[]): VecN;
  public div(first: VecN | number, ...vals: number[]): VecN {
    if (first instanceof VecN && vals.length === 0) {
      if (first.dims !== this.dims)
        throw new InvalidDimensionsError(this, first);
      return new VecN(...this.vals.map((val, i) => val / first.vals[i]));
    }

    if (typeof first === "number" && vals.length === 0) {
      return this.div(VecN.splat(this.dims, first));
    }

    if (typeof first === "number" && vals.length === this.dims-1) {
      return this.div(new VecN(first, ...vals));
    }

    throw new TypeError("wrong types");
  }

  public addAxis(index: number, value: number): VecN {
    const n = [...this.vals];
    n.splice(index, 0, value);
    return new VecN(...n);
  }

  public lerp(other: VecN, t: number): VecN {
    if (this.dims !== other.dims)
      throw new InvalidDimensionsError(this, other);
    return this.mul(1 - t).add(other.mul(t));
  }

  public expDecay(other: VecN, dt: number, halfLife: number): VecN {
    if (this.dims !== other.dims)
      throw new InvalidDimensionsError(this, other);
    return new VecN(
      ...this.vals.map((val, i) => expDecay(val, other.vals[i], dt, halfLife)),
    );
  }

  public dot(other: VecN): number {
    if (this.dims !== other.dims)
      throw new InvalidDimensionsError(this, other);
    return this.vals.reduce((sum, val, i) => sum + val * other.vals[i], 0)
  }

  public norm2(): number {
    return this.dot(this);
  }

  public norm(): number {
    return Math.sqrt(this.norm2());
  }

  public normalize(): VecN {
    return this.div(this.norm());
  }
  
  public clamp(min: VecN | null, max: VecN | null): VecN {
    if (min !== null && this.dims !== min.dims)
      throw new InvalidDimensionsError(this, min);
    if (max !== null && this.dims !== max.dims)
      throw new InvalidDimensionsError(this, max);

    return new VecN(...this.vals.map((val, i) => clamp(val, min?.vals[i] ?? null, max?.vals[i] ?? null)))
  }

  public as_vec2(): Vec2 {
    if (this.vals.length < 2) {
      throw new Error("Cannot convert to vec2: not enough elements");
    }
    return new Vec2(this.vals[0], this.vals[1]);
  }

  public as_vec3(): Vec3 {
    if (this.vals.length < 3) {
      throw new Error("Cannot convert to vec3: not enough elements");
    }
    return new Vec3(this.vals[0], this.vals[1], this.vals[2]);
  }
}

export class Vec2 extends VecN {
  public constructor(x: number, y: number) {
    super(x, y);
  }

  public static override splat(val: number): VecN {
    return new Vec2(val, val);
  }

  public static override random(): VecN {
    return new Vec2(Math.random(), Math.random());
  }

  public get x(): number {
    return this.vals[0];
  }

  public with_x(val: number): Vec2 {
    return new Vec2(val, this.y);
  }

  public get u(): number {
    return this.vals[0];
  }

  public with_u(val: number): Vec2 {
    return new Vec2(val, this.y);
  }

  public get y(): number {
    return this.vals[1];
  }

  public with_y(val: number): Vec2 {
    return new Vec2(this.x, val);
  }

  public get v(): number {
    return this.vals[1];
  }

  public with_v(val: number): Vec2 {
    return new Vec2(this.x, val);
  }
}

export class Vec3 extends VecN {
  public constructor(x: number, y: number, z: number) {
    super(x, y, z);
  }

  public static override splat(val: number): Vec3 {
    return new Vec3(val, val, val);
  }

  public static override random(): Vec3 {
    return new Vec3(Math.random(), Math.random(), Math.random());
  }

  public static ZERO = Vec3.splat(0);
  public static UP = new Vec3(0,1,0);

  public get x(): number {
    return this.vals[0];
  }

  public get y(): number {
    return this.vals[1];
  }

  public get z(): number {
    return this.vals[2];
  }

  public cross(other: Vec3): Vec3 {
    return new Vec3(
      this.y * other.z - this.z * other.y,
      this.z * other.x - this.x * other.z,
      this.x * other.y - this.y * other.x
    );
  }
}

export class Vec4 extends VecN {
  public constructor(x: number, y: number, z: number, w: number) {
    super(x, y, z, w);
  }

  public static override splat(val: number): VecN {
    return new Vec4(val, val, val, val);
  }

  public static override random(): VecN {
    return new Vec4(Math.random(), Math.random(), Math.random(), Math.random());
  }

  public get x(): number {
    return this.vals[0];
  }

  public get y(): number {
    return this.vals[1];
  }

  public get z(): number {
    return this.vals[2];
  }

  public get w(): number {
    return this.vals[3];
  }
}
