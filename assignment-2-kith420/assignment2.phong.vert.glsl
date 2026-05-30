#version 300 es

// an attribute will receive data from a buffer
in vec3 a_position;
in vec3 a_normal;

// transformation matrices
uniform mat4x4 u_m;
uniform mat4x4 u_v;
uniform mat4x4 u_p;

// output to fragment stage
out vec3 v_world_position;
out vec3 v_world_normal;

void main() {
    v_world_position = (u_m * vec4(a_position, 1.0)).xyz; // transform the vertex position to world space
    v_world_normal = normalize(mat3(transpose(inverse(u_m))) * a_normal); // transform normal to world space using the inverse transpose of the model matrix
    gl_Position = u_p * u_v * u_m * vec4(a_position, 1.0); // transform the position to clip space
}
