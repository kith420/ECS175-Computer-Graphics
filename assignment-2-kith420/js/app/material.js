'use strict'

import * as vec3 from '../lib/glmatrix/vec3.js'

/**
 * The Material class is used to store material properties for Shaded Objects
 * 
 * It contains material properties used in Goraud and Phong shading (among others)
 * 
 */
class Material {

    /**
     * Constructs a new material
     * 
     * @param {vec3} kA Ambient color of the material
     * @param {vec3} kD Diffuse color of the material
     * @param {vec3} kS Specular color of the material
     * @param {Number} shininess Shininess of the specular color
     */
    constructor( kA, kD, kS, shininess ) {
        this.kA = kA
        this.kD = kD
        this.kS = kS
        this.shininess = shininess
    }
}

export default Material