#version 300 es

in vec4 a_position;
in vec2 a_uv;

out vec2 v_uv;

uniform mat4 mvp_matrix;

// all shaders have a main function
void main() {
    // gl_Position is a special variable a vertex shader
    // is responsible for setting
    gl_Position = mvp_matrix * a_position;

    v_uv = a_uv;
}
