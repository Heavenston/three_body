import { UserError } from "./usererror";
import { WebGLError, applyUniform, createProgram, createShader } from "./webgl_utils";
import { Application, TransformComponent } from "./application";
import { Mat4 } from "./math/mat";
import { Component, Entity } from "./entity";
import { Color } from "./math";

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

export class CameraComponent extends Component {
  public fov: number = 100;
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
    return transform.modelToWorld().inverse() ?? Mat4.IDENT;
  }

  public projection(): Mat4 {
    return Mat4.newPerspective(
      (this.fov / 180) * Math.PI,
      this.aspect, this.near, this.far,
    )
  }
}

export class MeshComponent extends Component {
  constructor(
    entity: Entity,
    public mesh: Mesh,
  ) {
    super(entity);
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
      ctx.clear(ctx.COLOR_BUFFER_BIT);
    }

    const viewMatrix = cameraComponent.view();
    const projectionMatrix = cameraComponent.projection();

    const viewProjMatrix = viewMatrix.mul(projectionMatrix);

    for (const entity of this.application.entities) {
      const meshComp = entity.components.get(MeshComponent);
      if (!meshComp)
        continue;
      const mesh = meshComp.mesh;

      const transform = entity.components.get(TransformComponent);
      if (!transform)
        continue;

      const modelMatrix = transform.modelToWorld();
      const mvpMatrix = modelMatrix.mul(viewProjMatrix);

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
