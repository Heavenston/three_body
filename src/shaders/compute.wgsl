struct Uniforms {
    totalTime: f32,
}

@group(0) @binding(0) var<storage, read_write> positions: array<f32>;
@group(0) @binding(1) var<storage, read_write> normals: array<f32>;
@group(0) @binding(2) var<uniform> uniforms: Uniforms;

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

fn work_on(
    i: u32
) {
    for (var di: u32 = 0; di < 3; di += 1) {
        var pos = getPos(i+di);
        pos.y = sin(pos.x + uniforms.totalTime * 2) * cos(pos.z * 0.5 + uniforms.totalTime);
        pos.y = -0.5;
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
 
@compute @workgroup_size(64) fn displace(
    @builtin(global_invocation_id) global_invocation_id : vec3<u32>,
) {
    let index = global_invocation_id.x;

    let vertexCount = arrayLength(&positions);
    if (index >= vertexCount / 3) {
        return;
    }

    work_on(index * 3);
}
