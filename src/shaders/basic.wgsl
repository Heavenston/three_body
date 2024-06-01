struct Uniforms {
    modelMatrix: mat4x4f,
    viewProjMatrix: mat4x4f,
    color: vec4f,
};
@group(0) @binding(0) var<uniform> uniforms: Uniforms;
 
struct VertexOut {
    @builtin(position) position: vec4f,
    @location(0) worldPos: vec3f,
    @location(1) normal: vec3f,
    @location(2) uv: vec2f,
};
 
@vertex
fn vertex(
    @location(0) position: vec4f,
    @location(1) normal: vec3f,
    @location(2) uv: vec2f,
) -> VertexOut {
    var out: VertexOut;
    out.worldPos = (uniforms.modelMatrix * position).xyz;
    out.position = (uniforms.viewProjMatrix * uniforms.modelMatrix) * position;
    out.normal = normal;
    out.uv = uv;
    return out;
}
 
@fragment
fn fragment(v: VertexOut) -> @location(0) vec4f {
    return uniforms.color;
}
