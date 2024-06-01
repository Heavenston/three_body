#version 300 es
 
precision highp float;

in vec3 v_normal;
in vec2 v_uv;
 
out vec4 outColor;
 
void main() {
    outColor = vec4((v_normal + 1.) / 2., 1);
}
