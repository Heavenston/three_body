import { Vec2, Vec3 } from "../math/vec";
import { Renderer } from "./renderer";

export type Vertices = {
  positions: Float32Array,
  normals: Float32Array,
  uvs: Float32Array,
};

export class Mesh {
  constructor(
    public renderer: Renderer,
    public positionsBuffer: GPUBuffer,
    public normalsBuffer: GPUBuffer,
    public uvsBuffer: GPUBuffer,
  ) {}

  public static fromVertices(
    renderer: Renderer,
    { positions, normals, uvs }: Vertices,
  ): Mesh {
    const device = renderer.device;

    const positionsBuffer = device.createBuffer({
      size: positions.length * 4,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.STORAGE,
      mappedAtCreation: true,
    });
    new Float32Array(positionsBuffer.getMappedRange()).set(positions);
    positionsBuffer.unmap();
    const normalsBuffer = device.createBuffer({
      size: normals.length * 4,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.STORAGE,
      mappedAtCreation: true,
    });
    new Float32Array(normalsBuffer.getMappedRange()).set(normals);
    normalsBuffer.unmap();
    const uvsBuffer = device.createBuffer({
      size: uvs.length * 4,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.STORAGE,
      mappedAtCreation: true,
    });
    new Float32Array(uvsBuffer.getMappedRange()).set(uvs);
    uvsBuffer.unmap();

    return new Mesh(
      renderer, 
      positionsBuffer,
      normalsBuffer,
      uvsBuffer,
    );
  }

  public static planeVertices(subdivs: number, size: number): Vertices {
    if (subdivs < 0)
      throw new RangeError("Subdivs mush be positive");

    const vertexCountForSubdivs0 = 6;
    const vertexCount = vertexCountForSubdivs0 * ((subdivs+1) ** 2);

    const positions = new Float32Array(vertexCount * 3);
    const normals = new Float32Array(vertexCount * 3);
    const uvs = new Float32Array(vertexCount * 2);

    let positionPointer = 0;
    let normalPointer = 0;
    let uvPointer = 0;
    function pushVertex(vec: Vec3, uv: Vec2) {
      positions[positionPointer++] = vec.x;
      positions[positionPointer++] = vec.y;
      positions[positionPointer++] = vec.z;
      normals[normalPointer++] = 0;
      normals[normalPointer++] = 0;
      normals[normalPointer++] = 0;
      uvs[uvPointer++] = uv.u;
      uvs[uvPointer++] = uv.v;
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

    return {
      positions,
      normals,
      uvs,
    };
  }

  /// Subdivs at 0 = normal cube
  public static cubeVertices(subdivs: number): Vertices {
    if (subdivs < 0)
      throw new RangeError("Subdivs mush be positive");

    const vertexCountPerSideForSubdivs0 = 6;
    const vertexCountPerSide = vertexCountPerSideForSubdivs0 * ((subdivs+1)**2);
    const vertexCount = vertexCountPerSide * 6;

    const positions = new Float32Array(vertexCount * 3);
    const normals = new Float32Array(vertexCount * 3);
    const uvs = new Float32Array(vertexCount * 2);

    let positionPointer = 0;
    let normalPointer = 0;
    let uvPointer = 0;
    function pushVertex(vec: Vec3, uv: Vec2) {
      positions[positionPointer++] = vec.x;
      positions[positionPointer++] = vec.y;
      positions[positionPointer++] = vec.z;
      normals[normalPointer++] = 0;
      normals[normalPointer++] = 0;
      normals[normalPointer++] = 0;
      uvs[uvPointer++] = uv.u;
      uvs[uvPointer++] = uv.v;
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

    return {
      positions,
      normals,
      uvs,
    };
  }

  public static normalizeVertices(vertices: Vertices, radius: number = 1) {
    for (let i = 0; i < vertices.positions.length; i += 3) {
      const ax = vertices.positions[i+0];
      const ay = vertices.positions[i+1];
      const az = vertices.positions[i+2];
      const fact = radius / Math.sqrt(ax ** 2 + ay ** 2 + az ** 2);
      vertices.positions[i+0] *= fact;
      vertices.positions[i+1] *= fact;
      vertices.positions[i+2] *= fact;
    }
  }

  public static computeNormals(vertices: Vertices) {
    // not using vertors classes for speed reasons
    for (let i = 0; i < vertices.positions.length / 3; i += 3) {
      const ax = vertices.positions[(i+0)*3+0];
      const ay = vertices.positions[(i+0)*3+1];
      const az = vertices.positions[(i+0)*3+2];
      const bx = vertices.positions[(i+1)*3+0];
      const by = vertices.positions[(i+1)*3+1];
      const bz = vertices.positions[(i+1)*3+2];
      const cx = vertices.positions[(i+2)*3+0];
      const cy = vertices.positions[(i+2)*3+1];
      const cz = vertices.positions[(i+2)*3+2];

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
        vertices.normals[(i+v)*3+0] = Nx;
        vertices.normals[(i+v)*3+1] = Ny;
        vertices.normals[(i+v)*3+2] = Nz;
      }
    }
  }

  public clean() {
    this.normalsBuffer.destroy();
    this.uvsBuffer.destroy();
    this.positionsBuffer.destroy();
  }
}
