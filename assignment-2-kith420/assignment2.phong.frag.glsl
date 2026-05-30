#version 300 es

#define MAX_LIGHTS 16

// Fragment shaders don't have a default precision so we need
// to pick one. mediump is a good default. It means "medium precision".
precision mediump float;

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

// lights and materials
uniform AmbientLight u_lights_ambient[MAX_LIGHTS];
uniform DirectionalLight u_lights_directional[MAX_LIGHTS];
uniform PointLight u_lights_point[MAX_LIGHTS];

uniform Material u_material;

// camera position
uniform vec3 u_eye;

// received from vertex stage
in vec3 v_world_position;
in vec3 v_world_normal;

// with webgl 2, we now have to define an out that will be the color of the fragment
out vec4 o_fragColor;

// Shades an ambient light and returns this light's contribution
vec3 shadeAmbientLight(Material material, AmbientLight light) {
    // bounding for when light intensity hits negative values
    if (light.intensity <= 0.0) 
        return vec3(0.0);
    return material.kA * light.color * light.intensity;
}

// Shades a directional light and returns its contribution
vec3 shadeDirectionalLight(Material material, DirectionalLight light, vec3 normal, vec3 eye, vec3 vertex_position) {
    if (light.intensity <= 0.0) return vec3(0.0);

    // Light direction points FROM light, so L = normalize(-direction)
    vec3 L = normalize(-light.direction);
    vec3 N = normalize(normal);

    vec3 V = normalize(eye - vertex_position); // points from surface towards the camera
    vec3 R = reflect(-L, N); // R = light direction reflected across normal, reflect (-L,N) will compute mirror reflection from incoming light

    // Diffuse using Lambert's cosine law, where light contribution is proportional to cos(angle)
    // max() will clamp negative values, the light hitting the backside, to 0.
    float diff = max(dot(N, L), 0.0);
    vec3 diffuse = material.kD * light.color * light.intensity * diff;

    // Specular (only compute if surface faces the light or diff > 0)
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

    // L will point from the surface toward the point light's position
    vec3 L = normalize(light.position - vertex_position);
    vec3 N = normalize(normal);
    vec3 V = normalize(eye - vertex_position);
    vec3 R = reflect(-L, N);

    // Distance attenuation: the light should get dimmer with distance
    // Ex: light with intensity 5.0 @ distance 1.0 = 5.0, @ distance 2.0 = 1.25
    float distance = length(light.position - vertex_position);
    float attenuation = light.intensity / (distance * distance);

    // Diffuse component similarly like directional but using attenuation instead of raw intensity
    float diff = max(dot(N, L), 0.0);
    vec3 diffuse = material.kD * light.color * attenuation * diff;

    // Specular component
    float spec = 0.0;
    if (diff > 0.0) {
        spec = pow(max(dot(R, V), 0.0), material.shininess);
    }
    vec3 specular = material.kS * light.color * attenuation * spec;

    return diffuse + specular;
}

void main() {

    // Re-normalize the interpolated normal (interpolation can de-normalize it)
    vec3 normal = normalize(v_world_normal);

    // Accumulate light contributions
    vec3 total_light = vec3(0.0);

    // Ambient lights
    for (int i = 0; i < MAX_LIGHTS; i++) {
        total_light += shadeAmbientLight(u_material, u_lights_ambient[i]);
    }

    // Directional lights
    for (int i = 0; i < MAX_LIGHTS; i++) {
        total_light += shadeDirectionalLight(u_material, u_lights_directional[i], normal, u_eye, v_world_position);
    }

    // Point lights
    for (int i = 0; i < MAX_LIGHTS; i++) {
        total_light += shadePointLight(u_material, u_lights_point[i], normal, u_eye, v_world_position);
    }

    o_fragColor = vec4(total_light, 1.0); 
}
