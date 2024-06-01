import { UserError } from "./usererror";
import { WebGLError, applyUniform, createProgram, createShader } from "./webgl_utils";
import { Application } from "./application";
import { Entity } from "./entity";
import { CameraComponent, MeshComponent, TransformComponent } from "./components";
import { Vec2, Vec3 } from "./math/vec";

export class Material {
  constructor(
    public renderer: Renderer,
    public vertexShader: WebGLShader,
    public fragmentShader: WebGLShader,
    public program: WebGLProgram,
  ) {}

  public static fromSources(
    renderer: Renderer,
    vertexSource: string,
    fragmentSource: string,
  ): Material {
    const ctx = renderer.ctx;

    const vertexShader = createShader(ctx, ctx.VERTEX_SHADER, vertexSource);
    const fragmentShader = createShader(ctx, ctx.FRAGMENT_SHADER, fragmentSource);
    const program = createProgram(ctx, vertexShader, fragmentShader);

    return new Material(renderer, vertexShader, fragmentShader, program);
  }

  public clean() {
    const ctx = this.renderer.ctx;

    ctx.deleteShader(this.vertexShader);
    ctx.deleteShader(this.fragmentShader);
    ctx.deleteProgram(this.program);
  }

  public bind() {
    const ctx = this.renderer.ctx;
    ctx.useProgram(this.program);
  }
}

export class Mesh {
  public first: number = 0;

  constructor(
    public renderer: Renderer,
    public material: Material,
    public vertex_buffer: WebGLBuffer,
    public vao: WebGLVertexArrayObject,
    public geometry: GLenum,
    public count: number,
  ) {}

  public static fromVertices(
    renderer: Renderer,
    material: Material,
    vertices: Float32Array,
  ): Mesh {
    const ctx = renderer.ctx;

    const vb = ctx.createBuffer();
    if (!vb)
      throw new WebGLError("Buffer create error");
    const vao = ctx.createVertexArray();
    if (!vao)
      throw new WebGLError("Vao create error");

    ctx.bindBuffer(ctx.ARRAY_BUFFER, vb);
    ctx.bufferData(ctx.ARRAY_BUFFER, vertices, ctx.DYNAMIC_DRAW);

    ctx.bindVertexArray(vao);

    const position_loc = ctx.getAttribLocation(material.program, "a_position");
    if (position_loc >= 0)
      ctx.enableVertexAttribArray(position_loc);
    const normal_loc = ctx.getAttribLocation(material.program, "a_normal");
    if (normal_loc >= 0)
      ctx.enableVertexAttribArray(normal_loc);
    const uv_loc = ctx.getAttribLocation(material.program, "a_uv");
    if (uv_loc >= 0)
      ctx.enableVertexAttribArray(uv_loc);

    const floatSize = 4;
    const vertexLength = 8;
    const stride = floatSize * vertexLength;
    if (position_loc >= 0)
      ctx.vertexAttribPointer(
        position_loc,
        3, ctx.FLOAT, false,
        stride, 0,
      );
    if (normal_loc >= 0)
      ctx.vertexAttribPointer(
        normal_loc,
        3, ctx.FLOAT, false,
        stride, floatSize * 3,
      );
    if (uv_loc >= 0)
      ctx.vertexAttribPointer(
        uv_loc,
        2, ctx.FLOAT, false,
        stride, floatSize * 6,
      );

    return new Mesh(
      renderer, 
      material,
      vb,
      vao,
      ctx.TRIANGLES,
      vertices.length / 8,
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

  public changeVertexData(newData: Float32Array) {
    const ctx = this.renderer.ctx;

    ctx.bindBuffer(ctx.ARRAY_BUFFER, this.vertex_buffer);
    ctx.bufferData(ctx.ARRAY_BUFFER, newData, ctx.STATIC_DRAW);

    this.count = newData.length / 8;
  }

  public clean() {
    const ctx = this.renderer.ctx;

    ctx.deleteBuffer(this.vertex_buffer);
    ctx.deleteVertexArray(this.vao);
  }

  public bind() {
    const ctx = this.renderer.ctx;
    ctx.bindVertexArray(this.vao);
  }

  public draw() {
    const ctx = this.renderer.ctx;
    ctx.drawArrays(this.geometry, this.first, this.count);
  }
}

export class Renderer {
  public canvas: HTMLCanvasElement;
  public ctx: WebGL2RenderingContext;

  public application: Application;

  public mainCamera: Entity | null = null;

  constructor(
    application: Application,
    canvas: HTMLCanvasElement,
  ) {
    this.application = application;
    this.canvas = canvas;

    const ctx = canvas.getContext("webgl2");
    if (!ctx)
      throw new UserError("No context?");
    this.ctx = ctx;

    ctx.enable(ctx.DEPTH_TEST);
    // ctx.enable(ctx.CULL_FACE);
    ctx.cullFace(ctx.FRONT);
  }

  public render() {
    const ctx = this.ctx;
    ctx.viewport(0, 0, this.canvas.width, this.canvas.height);

    const cameraEntity = this.mainCamera;
    if (!cameraEntity)
      return;

    const cameraComponent = cameraEntity.components.unwrap_get(CameraComponent);
    const clearColor = cameraComponent.clearColor;

    cameraComponent.aspect = this.canvas.width / this.canvas.height;

    if (clearColor) {
      ctx.clearColor(clearColor.r, clearColor.g, clearColor.b, clearColor.a);
      ctx.clear(ctx.COLOR_BUFFER_BIT | ctx.DEPTH_BUFFER_BIT);
    }
    else {
      ctx.clear(ctx.DEPTH_BUFFER_BIT);
    }

    const viewMatrix = cameraComponent.view();
    const projectionMatrix = cameraComponent.projection();

    const viewProjMatrix = projectionMatrix.mul(viewMatrix);

    for (const entity of this.application.entities) {
      const meshComp = entity.components.get(MeshComponent);
      if (!meshComp)
        continue;
      const mesh = meshComp.mesh;

      const transform = entity.components.get(TransformComponent);
      if (!transform)
        continue;

      const modelMatrix = transform.modelToWorld();
      const mvpMatrix = viewProjMatrix.mul(modelMatrix);

      mesh.material.bind();
      mesh.bind();

      applyUniform(ctx, mesh.material.program, {
        target: "vp_matrix",
        type: "mat4",
        value: viewProjMatrix,
      });
      applyUniform(ctx, mesh.material.program, {
        target: "model_matrix",
        type: "mat4",
        value: modelMatrix,
      });
      applyUniform(ctx, mesh.material.program, {
        target: "mvp_matrix",
        type: "mat4",
        value: mvpMatrix,
      });

      mesh.draw();
    }
  }
}
