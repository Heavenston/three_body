import { Application } from "~/src/engine/application";
import { UserError } from "~/src/engine/usererror";
import { Component, Entity } from "./engine/entity";
import { CameraComponent, MeshComponent, TransformComponent } from "./engine/components";
import { Vec3 } from "./math/vec";
import { Color } from "./math/color";

import shaderSource from "bundle-text:./shaders/basic.wgsl";
import { Mat3 } from "./math/mat";
import { G, clamp } from "./math";
import { Material } from "./material";
import { Mesh } from "./engine/mesh";

export class MassiveComponent extends Component {
  public mass: number = 1;

  public withMass(mass: number): this {
    this.mass = mass;
    return this;
  }
}

export class ParticleComponent extends Component {
  public velocity: Vec3 = Vec3.ZERO;
  public radius: number = 0.5;

  public withVelocity(vel: Vec3): this {
    this.velocity = vel;
    return this;
  }

  public override update() {
    super.update();
    const dt = this.application.dt;

    const transform = this.entity.components.unwrap_get(TransformComponent);

    let force = Vec3.ZERO;

    for (const entity of this.application.entities) {
      if (entity === this.entity)
        continue;
      const other_transform = entity.components.get(TransformComponent);
      if (!other_transform)
        continue;
      const other_mass = entity.components.get(MassiveComponent);
      if (!other_mass)
        continue;
      const diff = other_transform.translation
        .sub(transform.translation);
      const dist = diff.norm();
      const dir = diff.div(dist);

      let actualDist = clamp(dist, this.radius, null);

      force = force.add(dir.mul((G * other_mass.mass) / (actualDist ** 2)))
        .as_vec3();
    }

    this.velocity = this.velocity.add(force.mul(dt))
      .as_vec3();

    transform.globalRotateZ(-(this.velocity.x / this.radius) * dt);
    transform.globalRotateX((this.velocity.z / this.radius) * dt);

    transform.translate(this.velocity.mul(dt).as_vec3());
  }
}

export class LookAroundComponent extends Component {
  public override update() {
    super.update();
    const dt = this.application.dt;

    const transform = this.entity.components.unwrap_get(TransformComponent);
    
    transform.translation = Mat3.rotateY(dt).mul(transform.translation);
    transform.affine = Mat3.looking_at(transform.translation, Vec3.ZERO, Vec3.UP);
  }
}

(async () => {
  const canvas = document.getElementById("canvas");
  if (!canvas || !(canvas instanceof HTMLCanvasElement))
    throw new Error("no");
  const app = await Application.create(canvas);

  const camera = new Entity(app);
  camera.addComponent(new TransformComponent(camera)
    .rotateX(-0.2)
    .translate(new Vec3(0, 6, 8))
    .lookAt(Vec3.ZERO)
  );
  camera.addComponent(new CameraComponent(camera)
    .withClearColor(new Color(0.05, 0.05, 0.05, 1)));
  // camera.addComponent(new LookAroundComponent(camera));
  app.spawn(camera);
  app.renderer.mainCamera = camera;

  const material = Material.fromSource(app.renderer, shaderSource);

  let sphereMesh: Mesh;
  {
    console.log("CREATING SPHERE");
    console.time("vertices");
    const vertices = Mesh.cubeVertices(4);
    console.timeEnd("vertices");
    console.log("vertex count:", vertices.positions.length / 3);

    console.time("normalize");
    Mesh.normalizeVertices(vertices, 0.5);
    console.timeEnd("normalize");

    console.time("computeNormals");
    Mesh.computeNormals(vertices);
    console.timeEnd("computeNormals");

    sphereMesh = Mesh.fromVertices(
      app.renderer,
      material,
      vertices,
    );
  }

  const spawnBall = (
    pos: Vec3,
    velocity: Vec3,
  ) => {
    const sphereEntity = new Entity(app);
    sphereEntity.addComponent(new TransformComponent(sphereEntity)
      .translate(pos)
    );
    sphereEntity.addComponent(new MeshComponent(sphereEntity, sphereMesh));
    sphereEntity.addComponent(new ParticleComponent(sphereEntity)
      .withVelocity(velocity)
    );
    sphereEntity.addComponent(new MassiveComponent(sphereEntity)
      .withMass(10e9));
    app.spawn(sphereEntity);
  };

  for (let angle = 0; angle < Math.PI*2; angle += Math.PI / 4) {
    const rotate = Mat3.rotateY(angle);
    spawnBall(rotate.mul(new Vec3(0,0,3)), rotate.mul(new Vec3(0.8,0,0)));
  }
  // spawnBall(new Vec3(-5, 0, 0), new Vec3(1,0,0));
  // spawnBall(new Vec3(5, 0, 0), new Vec3(-1,0,0));
  // spawnBall(new Vec3(0, 0, -5), new Vec3(0.25,0,0.25));
  // spawnBall(new Vec3(0, 0, 5), new Vec3(-0.25,0,-0.25));
  // spawnBall(new Vec3(5, 0, 0), new Vec3(-1,0,1));

  let planeMesh: Mesh;
  {
    console.log("CREATING PLANE");
    console.time("vertices");
    const vertices = Mesh.planeVertices(10, 20);
    console.timeEnd("vertices");
    console.log("vertex count:", vertices.positions.length / 3);

    console.time("computeNormals");
    Mesh.computeNormals(vertices);
    console.timeEnd("computeNormals");

    planeMesh = Mesh.fromVertices(
      app.renderer,
      material,
      vertices,
    );
  }

  const planeEntity = new Entity(app);
  planeEntity.addComponent(new TransformComponent(planeEntity));
  planeEntity.addComponent(new MeshComponent(planeEntity, planeMesh));
  app.spawn(planeEntity);

  try {
    await app.start();
  }
  catch(e) {
    console.error(e);
    if (e instanceof UserError) {
      alert("User error !: " + e.message);
    }
    else if (e instanceof Error) {
      alert("Just error !: " + e.message);
    }
  }
})();
