#version 300 es

in vec4 a_position;
in vec2 a_uv;

out vec2 v_uv;

uniform mat4 mvp_matrix;

void main() {
    gl_Position = mvp_matrix * a_position;

    v_uv = a_uv;
}
