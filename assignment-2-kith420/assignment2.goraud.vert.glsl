#version 300 es

#define MAX_LIGHTS 16

// struct definitions
struct AmbientLight {
    vec3 color;
    float intensity;
};

struct DirectionalLight {
    vec3 direction;
    vec3 color;
    float intensity;
};

struct PointLight {
    vec3 position;
    vec3 color;
    float intensity;
};

struct Material {
    vec3 kA;
    vec3 kD;
    vec3 kS;
    float shininess;
};


// an attribute will receive data from a buffer
in vec3 a_position;
in vec3 a_normal;

// camera position
uniform vec3 u_eye;

// transformation matrices
uniform mat4x4 u_m;
uniform mat4x4 u_v;
uniform mat4x4 u_p;

// lights and materials
uniform AmbientLight u_lights_ambient[MAX_LIGHTS];
uniform DirectionalLight u_lights_directional[MAX_LIGHTS];
uniform PointLight u_lights_point[MAX_LIGHTS];

uniform Material u_material;

// shading output
out vec4 o_color;

// Shades an ambient light and returns this light's contribution
vec3 shadeAmbientLight(Material material, AmbientLight light) {
    if (light.intensity <= 0.0) return vec3(0.0);
    return material.kA * light.color * light.intensity;
}

// Shades a directional light and returns its contribution
vec3 shadeDirectionalLight(Material material, DirectionalLight light, vec3 normal, vec3 eye, vec3 vertex_position) {
    if (light.intensity <= 0.0) return vec3(0.0);

    // Light direction points FROM light, so L = normalize(-direction)
    vec3 L = normalize(-light.direction);
    vec3 N = normalize(normal);
    vec3 V = normalize(eye - vertex_position);
    vec3 R = reflect(-L, N);

    // Diffuse
    float diff = max(dot(N, L), 0.0);
    vec3 diffuse = material.kD * light.color * light.intensity * diff;

    // Specular
    float spec = 0.0;
    if (diff > 0.0) {
        spec = pow(max(dot(R, V), 0.0), material.shininess);
    }
    vec3 specular = material.kS * light.color * light.intensity * spec;

    return diffuse + specular;
}

// Shades a point light and returns its contribution
vec3 shadePointLight(Material material, PointLight light, vec3 normal, vec3 eye, vec3 vertex_position) {
    if (light.intensity <= 0.0) return vec3(0.0);

    vec3 L = normalize(light.position - vertex_position);
    vec3 N = normalize(normal);
    vec3 V = normalize(eye - vertex_position);
    vec3 R = reflect(-L, N);

    // Distance attenuation
    float distance = length(light.position - vertex_position);
    float attenuation = light.intensity / (distance * distance);

    // Diffuse
    float diff = max(dot(N, L), 0.0);
    vec3 diffuse = material.kD * light.color * attenuation * diff;

    // Specular
    float spec = 0.0;
    if (diff > 0.0) {
        spec = pow(max(dot(R, V), 0.0), material.shininess);
    }
    vec3 specular = material.kS * light.color * attenuation * spec;

    return diffuse + specular;
}

void main() {

    // Transform vertex position to world space
    vec3 world_position = (u_m * vec4(a_position, 1.0)).xyz;

    // Transform normal to world space using inverse transpose of model matrix
    vec3 world_normal = normalize(mat3(transpose(inverse(u_m))) * a_normal);

    // Accumulate light contributions
    vec3 total_light = vec3(0.0);

    // Ambient lights
    for (int i = 0; i < MAX_LIGHTS; i++) {
        total_light += shadeAmbientLight(u_material, u_lights_ambient[i]);
    }

    // Directional lights
    for (int i = 0; i < MAX_LIGHTS; i++) {
        total_light += shadeDirectionalLight(u_material, u_lights_directional[i], world_normal, u_eye, world_position);
    }

    // Point lights
    for (int i = 0; i < MAX_LIGHTS; i++) {
        total_light += shadePointLight(u_material, u_lights_point[i], world_normal, u_eye, world_position);
    }

    // Pass shaded color to fragment stage
    o_color = vec4(total_light, 1.0);

    // Transform position to clip space
    gl_Position = u_p * u_v * u_m * vec4(a_position, 1.0);
}
