const PI = radians(180.0);

fn lerp(fr: f32, to: f32, t: f32) -> f32 {
    return fr * (1. - t) + to * t;
}

struct Uniforms {
    totalTime: f32,
    planeSize: f32,
    particleCount: u32,
}

struct Particle {
    position: vec3f,
    radius: f32,
}

@group(0) @binding(0) var<storage, read_write> positions: array<f32>;
@group(0) @binding(1) var<storage, read_write> normals: array<f32>;
@group(0) @binding(2) var<storage, read_write> uvs: array<f32>;
@group(0) @binding(3) var<uniform> uniforms: Uniforms;
@group(0) @binding(4) var heightMap: texture_storage_2d<r32float, read_write>;
@group(0) @binding(5) var<storage, read> particles: array<Particle>;

fn getPos(i: u32) -> vec3f {
    return vec3f(positions[i*3], positions[i*3+1], positions[i*3+2]);
}
fn setPos(i: u32, val: vec3f) {
    positions[i*3] = val.x;
    positions[i*3+1] = val.y;
    positions[i*3+2] = val.z;
}

fn getNormal(i: u32) -> vec3f {
    return vec3f(normals[i*3], normals[i*3+1], normals[i*3+2]);
}
fn setNormal(i: u32, val: vec3f) {
    normals[i*3] = val.x;
    normals[i*3+1] = val.y;
    normals[i*3+2] = val.z;
}

fn getUv(i: u32) -> vec2f {
    return vec2f(uvs[i*2], uvs[i*2+1]);
}

fn sampleHeight(uv: vec2f) -> f32{
    let dims = textureDimensions(heightMap);
    let actual = vec2(u32(uv.x * f32(dims.x)), u32(uv.y * f32(dims.y)));
    return textureLoad(heightMap, actual).x;
}

fn displace_vertex(
    i: u32
) {
    for (var di: u32 = 0; di < 3; di += 1) {
        var pos = getPos(i+di);
        pos.y = sampleHeight(getUv(i+di));
        setPos(i+di, pos);
    }

    let a = getPos(i+0);
    let b = getPos(i+1);
    let c = getPos(i+2);

    let A = b - a;
    let B = c - a;
    let N = normalize(cross(A, B));

    for (var di: u32 = 0; di < 3; di += 1) {
        setNormal(i+di, N);
    }
}
 
// Move vertices based on texture
@compute @workgroup_size(64) fn displace(
    @builtin(global_invocation_id) global_invocation_id : vec3<u32>,
) {
    let index = global_invocation_id.x;

    let vertexCount = arrayLength(&positions);
    if (index >= vertexCount / 3) {
        return;
    }

    displace_vertex(index * 3);
}

fn press_pixel(
    pos: vec2<u32>
) {
    let dims = textureDimensions(heightMap);
    if (pos.x > dims.x || pos.y > dims.y) {
        return;
    }

    let position = vec2f(
        (f32(pos.x) / f32(dims.x)) * uniforms.planeSize - uniforms.planeSize/2.,
        (f32(pos.y) / f32(dims.y)) * uniforms.planeSize - uniforms.planeSize/2.
    );

    for (var i: u32 = 0; i < uniforms.particleCount; i++) {
        let dist = length(particles[i].position.xz - position);

        let radius = particles[i].radius;

        var height = 0.;
        if (dist > radius) {
            height = 99999.;
        }
        else {
            height = -sqrt((radius * radius) - (dist * dist));
        }
        height = min(height, 0.5);

        let previousHeight = textureLoad(heightMap, pos).x;
        height = min(height, previousHeight);
        textureStore(heightMap, pos, vec4f(height));
    }
}

// Make particles make an indent on the texture
@compute @workgroup_size(1,1,1) fn press(
    @builtin(global_invocation_id) global_invocation_id : vec3<u32>,
) {
    press_pixel(global_invocation_id.xy);
}

fn get_pixel_i32(
    pos: vec2<i32>,
    counted: ptr<function, bool>,
) -> f32 {
    let dims = textureDimensions(heightMap);
    if (pos.x < 0 || pos.y < 0 || pos.x > i32(dims.x) || pos.y > i32(dims.y)) {
        *counted = false;
        return 0.;
    }
    *counted = true;

    return textureLoad(heightMap, vec2u(pos)).x;
}

fn post_pixel(
    pos: vec2<u32>
) {
    let dims = textureDimensions(heightMap);
    if (pos.x > dims.x || pos.y > dims.y) {
        return;
    }

    var sum: f32 = 0.;
    var count: f32 = 0.;

    for (var dx: i32 = -1; dx <= 1; dx += 1) {
        for (var dy: i32 = -1; dy <= 1; dy += 1) {
            var counted: bool = false;
            var val = 1.;
            if dx == 0 {
                val += 0.5;
            }
            if dy == 0 {
                val += 0.5;
            }
            sum += get_pixel_i32(vec2i(pos) + vec2(dx, dy), &counted) * val;
            if counted {
                count += val;
            }
        }
    }

    let val = sum / count + 0.001;

    textureStore(heightMap, pos, vec4f(val));
}

// Make particles make an indent on the texture
@compute @workgroup_size(1,1,1) fn post(
    @builtin(global_invocation_id) global_invocation_id : vec3<u32>,
) {
    post_pixel(global_invocation_id.xy);
}
