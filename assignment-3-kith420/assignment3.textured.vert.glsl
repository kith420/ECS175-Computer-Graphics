#version 300 es

// an attribute will receive data from a buffer
in vec3 a_position;
in vec3 a_normal;
in vec3 a_tangent;
in vec2 a_texture_coord;

// transformation matrices
uniform mat4x4 u_m;
uniform mat4x4 u_v;
uniform mat4x4 u_p;

// output to fragment stage
out vec3 v_world_position;
out vec2 v_texture_coord;
out mat3 v_tbn;

void main() {

    // transform a vertex from object space directly to screen space
    // the full chain of transformations is:
    // object space -{model}-> world space -{view}-> view space -{projection}-> clip space
    vec4 vertex_position_world = u_m * vec4(a_position, 1.0);

    // normal matrix handles non-uniform scaling correctly
    mat3 normal_matrix = transpose(inverse(mat3(u_m)));

    // transform normal and tangent to world space
    vec3 N = normalize(normal_matrix * a_normal);
    vec3 T = normalize(normal_matrix * a_tangent);

    // gram-schmidt: remove any component of T parallel to N so they stay perpendicular
    T = normalize(T - dot(T, N) * N);

    // bitangent completes the tangent-space basis
    vec3 B = cross(N, T);

    // TBN columns = tangent space basis vectors in world space
    mat3 tbn = mat3(T, B, N);

    // forward to fragment stage
    v_world_position = vertex_position_world.xyz;
    v_texture_coord = a_texture_coord;
    v_tbn = tbn;

    gl_Position = u_p * u_v * vertex_position_world;

}