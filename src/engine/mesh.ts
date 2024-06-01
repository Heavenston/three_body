import { Material } from "../material";
import { Vec2, Vec3 } from "../math/vec";
import { Renderer } from "./renderer";

export class Mesh {
  constructor(
    public renderer: Renderer,
    public material: Material,
  ) {}

  public static fromVertices(
    renderer: Renderer,
    material: Material,
    vertices: Float32Array,
  ): Mesh {

    return new Mesh(
      renderer, 
      material,
    );
  }

  public static planeVertices(subdivs: number, size: number): Float32Array {
    if (subdivs < 0)
      throw new RangeError("Subdivs mush be positive");

    const vertexLength = 8;
    const vertexCountForSubdivs0 = 6;
    const vertexCount = vertexCountForSubdivs0 * (4 ** subdivs);
    const vertices = new Float32Array(vertexCount * vertexLength);

    let nextVertexIndex = 0;
    function pushVertex(vec: Vec3, uv: Vec2) {
      vertices[nextVertexIndex++] = vec.x;
      vertices[nextVertexIndex++] = vec.y;
      vertices[nextVertexIndex++] = vec.z;
      vertices[nextVertexIndex++] = 0;
      vertices[nextVertexIndex++] = 0;
      vertices[nextVertexIndex++] = 0;
      vertices[nextVertexIndex++] = uv.u;
      vertices[nextVertexIndex++] = uv.v;
    }

    const sideValues = [
      [0,1], [1,0], [0,0],
      [1,0], [0,1], [1,1],
    ].map(arr => new Vec2(arr[0], arr[1]));
    function swap() {
      [sideValues[0], sideValues[2]] = [sideValues[2], sideValues[0]];
      [sideValues[3], sideValues[5]] = [sideValues[5], sideValues[3]];
    }
    swap();

    for (let subdivX = 0; subdivX <= subdivs; subdivX++) {
      for (let subdivY = 0; subdivY <= subdivs; subdivY++) {
        for (const sv of sideValues){
          const pos = sv.add(subdivX, subdivY).div(subdivs+1)
            .sub(0.5)
            .addAxis(1, 0)
            .mul(size)
            .as_vec3();
          pushVertex(pos, sv.add(subdivX, subdivY).div(subdivs+1).as_vec2());
        }

      }
    }
    return vertices;
  }

  /// Subdivs at 0 = normal cube
  public static cubeVertices(subdivs: number): Float32Array {
    if (subdivs < 0)
      throw new RangeError("Subdivs mush be positive");

    const vertexLength = 8;
    const vertexCountPerSideForSubdivs0 = 6;
    const vertexCountPerSide = vertexCountPerSideForSubdivs0 * (4 ** subdivs);
    const vertexCount = vertexCountPerSide * 6;
    const vertices = new Float32Array(vertexCount * vertexLength);

    let nextVertexIndex = 0;
    function pushVertex(vec: Vec3, uv: Vec2) {
      vertices[nextVertexIndex++] = vec.x;
      vertices[nextVertexIndex++] = vec.y;
      vertices[nextVertexIndex++] = vec.z;
      vertices[nextVertexIndex++] = 0;
      vertices[nextVertexIndex++] = 0;
      vertices[nextVertexIndex++] = 0;
      vertices[nextVertexIndex++] = uv.u;
      vertices[nextVertexIndex++] = uv.v;
    }

    for (let axis = 0; axis < 3; axis++) {
      const sideValues = [
        [0,1], [1,0], [0,0],
        [1,0], [0,1], [1,1],
      ].map(arr => new Vec2(arr[0], arr[1]));
      function swap() {
        [sideValues[0], sideValues[2]] = [sideValues[2], sideValues[0]];
        [sideValues[3], sideValues[5]] = [sideValues[5], sideValues[3]];
      }

      if (axis !== 1)
        swap();
      for (let thirdAxisVal = 0; thirdAxisVal <= 1; thirdAxisVal++) {
        if (thirdAxisVal === 1) {
          swap();
        }
        for (let subdivX = 0; subdivX <= subdivs; subdivX++) {
          for (let subdivY = 0; subdivY <= subdivs; subdivY++) {

            for (const sv of sideValues){
              const pos = sv.add(subdivX, subdivY).div(subdivs+1)
                .addAxis(axis, thirdAxisVal)
                .sub(0.5)
                .as_vec3();
              pushVertex(pos, sv.add(subdivX, subdivY).div(subdivs+1).as_vec2());
            }

          }
        }
      }
    }

    return vertices;
  }

  public static normalizeVertices(vertices: Float32Array, radius: number = 1) {
    for (let i = 0; i < vertices.length; i += 8) {
      const fact = radius / Math.sqrt(vertices[i] ** 2 + vertices[i+1] ** 2 + vertices[i+2] ** 2);
      vertices[i] *= fact;
      vertices[i+1] *= fact;
      vertices[i+2] *= fact;
    }
  }

  public static computeNormals(vertices: Float32Array) {
    // vertex stride
    const vs = 8;

    // not using vertors classes for speed reasons
    for (let i = 0; i < vertices.length; i += 8 * 3) {
      const ax = vertices[i+vs*0+0];
      const ay = vertices[i+vs*0+1];
      const az = vertices[i+vs*0+2];
      const bx = vertices[i+vs*1+0];
      const by = vertices[i+vs*1+1];
      const bz = vertices[i+vs*1+2];
      const cx = vertices[i+vs*2+0];
      const cy = vertices[i+vs*2+1];
      const cz = vertices[i+vs*2+2];

      const Ax = bx - ax;
      const Ay = by - ay;
      const Az = bz - az;
      const Bx = cx - ax;
      const By = cy - ay;
      const Bz = cz - az;

      let Nx = Ay * Bz - Az * By;
      let Ny = Az * Bx - Ax * Bz;
      let Nz = Ax * By - Ay * Bx;
      const length = Math.sqrt(Nx ** 2 + Ny ** 2 + Nz ** 2);
      Nx /= length;
      Ny /= length;
      Nz /= length;

      for (let v = 0; v < 3; v++) {
        vertices[i+vs*v+3] = Nx;
        vertices[i+vs*v+4] = Ny;
        vertices[i+vs*v+5] = Nz;
      }
    }
  }

  public clean() {
  }
}

