#version 300 es

#define MAX_LIGHTS 16

// Fragment shaders don't have a default precision so we need
// to pick one. mediump is a good default. It means "medium precision".
precision mediump float;

uniform bool u_show_normals;

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
    sampler2D map_kD;
    sampler2D map_nS;
    sampler2D map_norm;
};

// lights and materials
uniform AmbientLight u_lights_ambient[MAX_LIGHTS];
uniform DirectionalLight u_lights_directional[MAX_LIGHTS];
uniform PointLight u_lights_point[MAX_LIGHTS];

uniform Material u_material;

// camera position in world space
uniform vec3 u_eye;

// with webgl 2, we now have to define an out that will be the color of the fragment
out vec4 o_fragColor;

// received from vertex stage
in vec3 v_world_position;
in vec2 v_texture_coord;
in mat3 v_tbn;

// Shades an ambient light and returns this light's contribution
vec3 shadeAmbientLight(Material material, AmbientLight light) {

    // use diffuse texture to tint ambient so unlit areas still show texture
    vec3 kA_textured = material.kA * texture(material.map_kD, v_texture_coord).rgb;

    return kA_textured * light.color * light.intensity;
}

// Shades a directional light and returns its contribution
vec3 shadeDirectionalLight(Material material, DirectionalLight light, vec3 normal, vec3 eye, vec3 vertex_position) {
    
    // skip unused light slots
    if (light.intensity <= 0.0) return vec3(0);

    // negate because light.direction points FROM the light, we need TO the light
    vec3 L = normalize(-light.direction);
    vec3 V = normalize(eye - vertex_position);

    // diffuse: how directly surface faces the light
    float N_dot_L = max(dot(normal, L), 0.0);
    vec3 kD_textured = material.kD * texture(material.map_kD, v_texture_coord).rgb;
    vec3 diffuse = kD_textured * N_dot_L;

    // specular: phong reflection, scale shininess by roughness map
    vec3 R = reflect(-L, normal);
    float shininess_textured = max(material.shininess * texture(material.map_nS, v_texture_coord).r, 1.0);
    float R_dot_V = max(dot(R, V), 0.0);
    vec3 specular = material.kS * pow(R_dot_V, shininess_textured);

    return (diffuse + specular) * light.color * light.intensity;
}

// Shades a point light and returns its contribution
vec3 shadePointLight(Material material, PointLight light, vec3 normal, vec3 eye, vec3 vertex_position) {

    // skip unused light slots
    if (light.intensity <= 0.0) return vec3(0);

    // point lights: direction depends on fragment position
    vec3 L_vec = light.position - vertex_position;
    float distance = length(L_vec);
    vec3 L = normalize(L_vec);
    vec3 V = normalize(eye - vertex_position);

    // diffuse
    float N_dot_L = max(dot(normal, L), 0.0);
    vec3 kD_textured = material.kD * texture(material.map_kD, v_texture_coord).rgb;
    vec3 diffuse = kD_textured * N_dot_L;

    // specular with roughness map
    vec3 R = reflect(-L, normal);
    float shininess_textured = max(material.shininess * texture(material.map_nS, v_texture_coord).r, 1.0);
    float R_dot_V = max(dot(R, V), 0.0);
    vec3 specular = material.kS * pow(R_dot_V, shininess_textured);

    // inverse-square falloff
    float attenuation = light.intensity / (distance * distance);

    return (diffuse + specular) * light.color * attenuation;
}

void main() {

    // sample normal map [0,1] -> remap to [-1,1] -> transform from tangent space to world space via TBN
    vec3 normal_from_map = texture(u_material.map_norm, v_texture_coord).rgb;
    normal_from_map = normalize(normal_from_map * 2.0 - 1.0);
    vec3 normal = normalize(v_tbn * normal_from_map);

    // if we only want to visualize the normals, no further computations are needed
    // !do not change this code!
    if (u_show_normals == true) {
        o_fragColor = vec4(normal, 1.0);
        return;
    }

    // we start at 0.0 contribution for this vertex
    vec3 light_contribution = vec3(0.0);

    // iterate over all possible lights and add their contribution
    for(int i = 0; i < MAX_LIGHTS; i++) {
        light_contribution += shadeAmbientLight(u_material, u_lights_ambient[i]);
        light_contribution += shadeDirectionalLight(u_material, u_lights_directional[i], normal, u_eye, v_world_position);
        light_contribution += shadePointLight(u_material, u_lights_point[i], normal, u_eye, v_world_position);
    }

    o_fragColor = vec4(light_contribution, 1.0);
}
