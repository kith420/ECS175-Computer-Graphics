'use strict'

/**
 * The Texture class is used to store texture information and load image data
 * 
 */
class Texture {

    /**
     * Create a new texture instance
     * 
     * @param {String} filename Path to the image texture to load
     * @param {WebGL2RenderingContext} gl The webgl2 rendering context
     * @param {Boolean} flip_y Determines if the texture should be flipped by WebGL (see Ch 7)
     */
    constructor(filename, gl, flip_y = true) {
        this.filename = filename 
        this.texture = null
        this.texture = this.createTexture( gl, flip_y )
    }

    /**
     * Get the GL handle to the texture
     * 
     * @returns {WebGLTexture} WebGL texture instance
     */
    getGlTexture() {
        return this.texture
    }

    /**
     * Loads image data from disk and creates a WebGL texture instance
     * 
     * @param {WebGL2RenderingContext} gl The webgl2 rendering context
     * @param {Boolean} flip_y Determines if the texture should be flipped by WebGL (see Ch 7)
     * @returns {WebGLTexture} WebGL texture instance
     */
    createTexture( gl, flip_y ) {

        throw '"Texture.createTexture" not implemented'

        // TODO: Set up texture flipping (see book Ch7)

        // TODO: Create a new GL texture
        let texture = null
    
        // TODO: Set up texture config values
        // TODO: We use level 0 which is the highest detail for mipmapping
        // TODO: Interally, we want to store the texture as RGBA (vec4)
        // TODO: The (source) format is also RGBA and the (source) type is unsigned byte
        // HINT: Refer to https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/texImage2D to find the corresponding values
        const level = null                  // TODO: set value
        const internal_format = null        // TODO: set value
        const src_format = null             // TODO: set value
        const src_type = null               // TODO: set value
    
        // Create a new image to load image data from disk
        const image = new Image();
        image.onload = () => {
            // TODO: Bind the texture and upload image data to the texture using the texture config values set above
            // NOTE: `image` can be used directly as a pointer to image data (see book Ch 7)
            // NOTE: image width and height are not needed (see code in book Ch 7)
    
            // TODO: Generate mipmap from the full-size texture
     
            // TODO: Set up texture wrapping mode to repeat the texture
    
            // TODO: Set up texture MIN/MAG filtering
            // TODO: Use mipmapping and linear filtering        
        }
        
        // By setting the image's src parameter the image will start loading data from disk
        // When the data is available, image.onload will be called
        image.src = this.filename
    
        return texture
    }
}

export default Texture