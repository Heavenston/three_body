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
    ctx.bufferData(ctx.ARRAY_BUFFER, vertices, ctx.STATIC_DRAW);

    ctx.bindVertexArray(vao);

    const position_loc = ctx.getAttribLocation(material.program, "a_position");
    ctx.enableVertexAttribArray(position_loc);
    const uv_loc = ctx.getAttribLocation(material.program, "a_uv");
    ctx.enableVertexAttribArray(uv_loc);

    const stride = 4 * 5;
    ctx.vertexAttribPointer(
      position_loc,
      3, ctx.FLOAT, false,
      stride, 0,
    );
    ctx.vertexAttribPointer(
      uv_loc,
      2, ctx.FLOAT, false,
      stride, 4 * 3,
    );

    return new Mesh(
      renderer, 
      material,
      vb,
      vao,
      ctx.TRIANGLES,
      vertices.length / 5,
    );
  }

  /// Subdivs at 0 = normal cube
  public static cubeVertices(subdivs: number): Float32Array {
    if (subdivs < 0)
      throw new RangeError("Subdivs mush be positive");

    const vertexCountPerSideForSubdivs0 = 6 * 5;
    const vertexCountPerSide = vertexCountPerSideForSubdivs0 * (4 ** subdivs);
    const vertexCount = vertexCountPerSide * 6;
    const vertices = new Float32Array(vertexCount);

    let nextVertexIndex = 0;
    function pushVertex(vec: Vec3, uv: Vec2) {
      vertices[nextVertexIndex++] = vec.x;
      vertices[nextVertexIndex++] = vec.y;
      vertices[nextVertexIndex++] = vec.z;
      vertices[nextVertexIndex++] = uv.u;
      vertices[nextVertexIndex++] = uv.v;
    }
    function addAxis(into: Vec2, axis: number, value: number): Vec3 {
      if (axis === 0) {
        return new Vec3(value, into.x, into.y);
      }
      else if (axis === 1) {
        return new Vec3(into.x, value, into.y);
      }
      else {
        return new Vec3(into.x, into.y, value);
      }
    }

    for (let axis = 0; axis < 3; axis++) {
      const sideValues = [
        [0,0], [0,1], [1,0],
        [1,0], [0,1], [1,1],
      ].map(arr => new Vec2(arr[0], arr[1]));

      for (let thirdAxisVal = 0; thirdAxisVal <= 1; thirdAxisVal++) {
        for (let subdivX = 0; subdivX <= subdivs; subdivX++) {
          for (let subdivY = 0; subdivY <= subdivs; subdivY++) {

            for (const sv of sideValues){
              const pos = addAxis(
                sv.add(subdivX, subdivY).div(subdivs+1).as_vec2(),
                axis,
                thirdAxisVal,
              ).sub(0.5).as_vec3();
              pushVertex(pos, sv.add(subdivX, subdivY).div(subdivs+1).as_vec2());
            }

          }
        }
      }
    }

    return vertices;
  }

  public static normalizeVertices(vertices: Float32Array, radius: number = 1): Float32Array {
    for (let i = 0; i < vertices.length; i += 5) {
      const fact = radius / Math.sqrt(vertices[i] ** 2 + vertices[i+1] ** 2 + vertices[i+2] ** 2);
      vertices[i] *= fact;
      vertices[i+1] *= fact;
      vertices[i+2] *= fact;
    }
    return vertices;
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
