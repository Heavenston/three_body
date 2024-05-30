import { VecN } from "./vec";

export class Color extends VecN {
  public constructor(r: number, g: number, b: number, a: number = 1) {
    super(r,g,b,a);
  }

  public get r(): number {
    return this.vals[0];
  }

  public get g(): number {
    return this.vals[1];
  }

  public get b(): number {
    return this.vals[2];
  }

  public get a(): number {
    return this.vals[3];
  }

  public static BLACK: Color = new Color(0,0,0);
  public static WHITE: Color = new Color(1,1,1);
  public static RED: Color = new Color(1,0,0);
  public static GREEN: Color = new Color(0,1,0);
  public static BLUE: Color = new Color(0,0,1);
}
