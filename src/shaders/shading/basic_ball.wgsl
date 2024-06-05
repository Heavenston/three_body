struct InstanceData {
    modelMatrix: mat4x4f,
    color: vec4f,
    normal: vec3f,
}

struct Uniforms {
    viewProjMatrix: mat4x4f,
};

const LIGHT_POSITION: vec3f = vec3f(0., 1.5, 0.);

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
    out.normal = (instance_data.modelMatrix * vec4(normal, 0.)).xyz;
    out.normal = (instance_data.modelMatrix * vec4(instance_data.normal, 0.)).xyz;

    let to_light = out.worldPos.xyz - LIGHT_POSITION;
    let lighting = dot(normalize(to_light), out.normal);

    let scale: f32 = clamp(lighting, 0., 1.);
    let scaling: mat4x4f = mat4x4f(
        scale, 0., 0., 0.,
        0., scale, 0., 0.,
        0., 0., scale, 0.,
        0., 0., 0.,    1.,
    );

    let newModelMat = instance_data.modelMatrix * scaling;

    out.position = (uniforms.viewProjMatrix * newModelMat) * position;
    out.uv = uv;
    out.color = instance_data.color;
    return out;
}
 
@fragment
fn fragment(v: VertexOut) -> @location(0) vec4f {
    // let to_light = normalize(v.worldPos.xyz - LIGHT_POSITION);
    // let lighting = dot(to_light, v.normal);
    // return vec4f(v.color.rgb * lighting * 2., v.color.a);
    return v.color;
    // return vec4f((v.normal + 1.) / 2., 1.);
}
