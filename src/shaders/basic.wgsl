struct Uniforms {
    modelMatrix: mat4x4f,
    modelViewProjMatrix: mat4x4f,
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
    out.position = uniforms.modelViewProjMatrix * position;
    out.normal = normal;
    out.uv = uv;
    return out;
}
 
@fragment
fn fragment(v: VertexOut) -> @location(0) vec4f {
    let val = clamp(v.worldPos.y + 0.5, 0., 1.);
    return vec4f(val, val, val, 1.);
}
