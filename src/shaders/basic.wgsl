struct InstanceData {
    modelMatrix: mat4x4f,
    color: vec4f,
}

struct Uniforms {
    viewProjMatrix: mat4x4f,
};

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read> instances: array<InstanceData>;

struct VertexOut {
    @builtin(position) position: vec4f,
    @location(0) worldPos: vec3f,
    @location(1) normal: vec3f,
    @location(2) uv: vec2f,
    @location(3) color: vec4f,
};
 
@vertex
fn vertex(
    @builtin(instance_index) instanceIdx : u32,
    @location(0) position: vec4f,
    @location(1) normal: vec3f,
    @location(2) uv: vec2f,
) -> VertexOut {
    let instance_data = instances[instanceIdx];

    var out: VertexOut;
    out.worldPos = (instance_data.modelMatrix * position).xyz;
    out.position = (uniforms.viewProjMatrix * instance_data.modelMatrix) * position;
    out.normal = (instance_data.modelMatrix * vec4(normal, 0.)).xyz;
    out.uv = uv;
    out.color = instance_data.color;
    return out;
}
 
@fragment
fn fragment(v: VertexOut) -> @location(0) vec4f {
    return vec4f((v.normal + 1.) / 2., 1.);
}
