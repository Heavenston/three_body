struct InstanceData {
    modelMatrix: mat4x4f,
    color: vec4f,
}

struct Uniforms {
    viewProjMatrix: mat4x4f,
};

const LIGHT_POSITION: vec3f = vec3f(0., 1.5, 0.);

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read> instances: array<InstanceData>;
@group(1) @binding(0) var textureHeightMap: texture_2d<f32>;
@group(1) @binding(1) var samplerHeightMap: sampler;

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

    let actual_pos = instance_data.modelMatrix * vec4f(0., 0., 0., 1.);

    var out: VertexOut;
    out.worldPos = (instance_data.modelMatrix * position).xyz;
    let plane_uv = (actual_pos.xz + 10.) / 20.;
    out.worldPos.y += textureSampleLevel(textureHeightMap, samplerHeightMap, plane_uv, 0.).r;
    out.position = uniforms.viewProjMatrix * vec4f(out.worldPos, 1.);
    out.normal = (instance_data.modelMatrix * vec4(normal, 0.)).xyz;
    out.uv = uv;
    out.color = instance_data.color;
    return out;
}
 
@fragment
fn fragment(v: VertexOut) -> @location(0) vec4f {
    // let to_light = normalize(v.worldPos.xyz - LIGHT_POSITION);
    // let lighting = dot(to_light, v.normal);
    // return vec4f(v.color.rgb * lighting, v.color.a);
    return v.color;
    // return vec4f((v.normal + 1.) / 2., 1.);
}
