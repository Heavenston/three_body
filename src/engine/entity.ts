import { Application } from "./application";

export type ComponentClass<T extends Component = Component> = new (...args: any[]) => T;

export abstract class Component {
  public readonly application: Application;

  constructor(
    public readonly entity: Entity,
  ) {
    this.application = entity.application;
  }

  public update(): void {}

  public start(): void {}
  public stop(): void {}
}

export class ComponentMap {
  #map: Map<Function, Component> = new Map();

  public get<T extends Component>(type: ComponentClass<T>): T | null {
    const comp = this.#map.get(type);
    if (!comp)
      return null;
    if (!(comp instanceof type))
      throw new Error("invalid map");
    return comp;
  }

  public unwrap_get<T extends Component>(type: ComponentClass<T>): T {
    const v = this.get(type);
    if (v === null)
      throw new TypeError("Component not fount");
    return v;
  }

  public add(comp: Component) {
    this.#map.set(comp.constructor, comp);
  }

  public remove<T extends Component>(type: ComponentClass<T>): T | null {
    const comp = this.#map.get(type);
    if (!comp)
      return null;
    if (!(comp instanceof type))
      throw new Error("invalid map");
    this.#map.delete(type);
    return comp;
  }


  public has(...types: ComponentClass[]): boolean {
    return types.every(t => this.#map.has(t));
  }

  public values(): IterableIterator<Component> {
    return this.#map.values();
  }
}

export class Entity {
  #spawned: boolean = false;
  #components = new ComponentMap();

  public get components(): Readonly<ComponentMap> {
    return this.#components;
  }

  constructor(public readonly application: Application) {
    
  }

  public addComponent(comp: Component) {
    if (comp.entity !== this)
      throw new Error("wrong entity for component");
    this.#components.add(comp);
    if (this.#spawned)
      comp.start();
  }

  public removeComponent<T extends Component>(type: ComponentClass<T>): T | null {
    const t = this.#components.remove(type);
    if (!t)
      return t;
    if (this.#spawned)
      t.stop();
    return t;
  }

  public get isSpawned(): boolean {
    return this.#spawned;
  }

  public spawned(): void {
    this.#spawned = true;

    for (const comp of this.components.values())
      comp.start();
  }

  public despawned(): void {
    this.#spawned = false;

    for (const comp of this.components.values())
      comp.stop();
  }

  public update(): void {
    if (!this.#spawned)
      throw new Error("should not update if not spawned");

    for (const comp of this.components.values())
      comp.update();
  }
}
