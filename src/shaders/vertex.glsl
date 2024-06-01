#version 300 es

in vec4 a_position;
in vec3 a_normal;
in vec2 a_uv;

out vec3 v_normal;
out vec2 v_uv;

uniform mat4 mvp_matrix;

void main() {
    gl_Position = mvp_matrix * a_position;

    v_normal = a_normal;
    v_uv = a_uv;
}
