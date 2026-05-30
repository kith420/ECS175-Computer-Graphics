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

        // flip image vertically since webgl expects bottom-to-top
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, flip_y)

        // create and bind texture
        let texture = gl.createTexture()
        gl.bindTexture(gl.TEXTURE_2D, texture)

        const level = 0                       // base mipmap level (full res)
        const internal_format = gl.RGBA       // store as RGBA internally
        const src_format = gl.RGBA            // source format is also RGBA
        const src_type = gl.UNSIGNED_BYTE     // each channel is 0-255

        // upload 1x1 blue placeholder so that the texture is usable before image loads
        const pixel = new Uint8Array([0, 0, 255, 255])
        gl.texImage2D(gl.TEXTURE_2D, level, internal_format, 1, 1, 0, src_format, src_type, pixel)

        // Create a new image to load image data from disk
        const image = new Image();
        image.onload = () => {
            // bind & upload actual image data
            gl.bindTexture(gl.TEXTURE_2D, texture)
            gl.texImage2D(gl.TEXTURE_2D, level, internal_format, src_format, src_type, image)

            // generate mipmaps for minification
            gl.generateMipmap(gl.TEXTURE_2D)

            // tile texture when coords go beyond [0,1]
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT)

            // trilinear for min, bilinear for mag
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
        }
        
        // By setting the image's src parameter the image will start loading data from disk
        // When the data is available, image.onload will be called
        image.src = this.filename
    
        return texture
    }
}

export default Texture