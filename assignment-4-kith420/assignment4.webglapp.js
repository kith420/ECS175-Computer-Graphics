'use strict'

import Quad from './assignment4.quad.js'
import FrameBufferObject from './assignment4.fbo.js'

import * as mat4 from './js/lib/glmatrix/mat4.js'
import * as vec3 from './js/lib/glmatrix/vec3.js'
import { OrthoCamera, PerspectiveCamera } from './js/utils/camera.js'
import WebGlApp from './js/app/webglapp.js'

/**
 * @Class
 * WebGlApp that will call basic GL functions, manage a list of shapes, and take care of rendering them
 * 
 * This class will use the Shapes that you have implemented to store and render them
 */
class RenderPasses extends WebGlApp 
{
    /**
     * Initializes the app with a box, and the model, view, and projection matrices
     * 
     * @param {WebGL2RenderingContext} gl The webgl2 rendering context
     * @param {Map<String,Shader>} shader The shaders to be used to draw the object
     * @param {AppState} app_state The state of the UI
     */
    constructor( gl, shaders )
    {
        super( gl, shaders )

        // Create a screen quad instance
        this.quad = new Quad( gl, this.quad_shader )

        // Create a framebuffer object
        this.fbo_pixel_filter = new FrameBufferObject(gl)
        this.fbo_directional = new FrameBufferObject(gl)
        this.fbo_point = new FrameBufferObject(gl)

        this.fbo_directional.resize( gl, 1024, 1024 )
        this.fbo_point.resize( gl, 1024, 1024 )

        this.fbo_preview = false
        this.fbo = this.fbo_pixel_filter
    }

    renderpass_normal( gl, canvas_width, canvas_height, excludes = null )
    {
        this.scene.setShader(gl, this.shaders[this.active_shader])

        // Set viewport and clear canvas
        this.setViewport( gl, canvas_width, canvas_height )
        this.clearCanvas( gl )
        this.scene.render( gl, excludes )
    }

    renderpass_pixel_filter( gl, canvas_width, canvas_height )
    {
        // first pass: render scene into the fbo
        this.fbo_pixel_filter.resize( gl, canvas_width, canvas_height )
        this.fbo_pixel_filter.bindFramebuffer( gl )
        this.renderpass_normal( gl, canvas_width, canvas_height, [ 'light' ] )
        this.fbo_pixel_filter.unbindFramebuffer( gl )

        // second pass: draw the full-screen quad with the fbo textures
        this.setViewport( gl, canvas_width, canvas_height )
        this.clearCanvas( gl )
        this.quad.render(
            gl,
            this.filter_mode,
            this.fbo_pixel_filter.getColorTexture(),
            this.fbo_pixel_filter.getDepthTexture()
        )

        // render only lights
        this.scene.render( gl, [ 'model' ] )
    }

    do_depth_pass( gl, fbo, current_light )
    {
        // compute the scale of the current scene
        let scale = mat4.getScaling(vec3.create(), this.scene.scenegraph.transformation)

        let shadow_v
        let shadow_p

        // render the scene from the light's point of view into the fbo
        {
            fbo.bindFramebuffer( gl )
            this.setViewport( gl, fbo.width, fbo.height )
            this.clearCanvas( gl )

            let shadow_camera = current_light.getCamera( scale )
            shadow_v = shadow_camera.getViewMatrix()
            shadow_p = shadow_camera.getProjectionMatrix()

            // set the active shader on the scene first, then override with light-space matrices
            // order matters: setShader may reset uniforms, so we set u_v/u_p after it
            let shader = this.shaders[this.active_shader]
            this.scene.setShader(gl, shader)

            shader.use()
            shader.setUniform4x4f('u_v', shadow_v)
            shader.setUniform4x4f('u_p', shadow_p)
            shader.unuse()

            this.scene.render(gl, [ 'light' ])

            // restore the camera's original view and projection matrices
            shader.use()
            shader.setUniform4x4f('u_v', this.camera.getViewMatrix())
            shader.setUniform4x4f('u_p', this.camera.getProjectionMatrix())
            shader.unuse()

            fbo.unbindFramebuffer( gl )
        }

        // return combined light-space matrix p * v
        return mat4.multiply(mat4.create(), shadow_p, shadow_v)
    }

    renderpass_shadowmap( gl, canvas_width, canvas_height )
    {
        // compute the light-camera matrices for both lights
        let u_shadow_pv_directional = mat4.identity(mat4.create())
        let u_shadow_pv_point = mat4.identity(mat4.create())
        if (this.first_directional_light) {
            u_shadow_pv_directional = 
                this.do_depth_pass( gl, this.fbo_directional, this.first_directional_light )
        }
        if (this.first_point_light) {
            u_shadow_pv_point = 
                this.do_depth_pass( gl, this.fbo_point, this.first_point_light )
        }

        // final pass: render the scene from the camera with shadows
        {
            this.setViewport( gl, canvas_width, canvas_height )
            this.clearCanvas( gl )

            // set shader on scene first, then set all uniforms after
            this.scene.setShader(gl, this.shadow_shader)

            let shader = this.shadow_shader
            shader.use()

            // camera matrices and eye
            shader.setUniform3f('u_eye', this.camera.getEye())
            shader.setUniform4x4f('u_v', this.camera.getViewMatrix())
            shader.setUniform4x4f('u_p', this.camera.getProjectionMatrix())

            // pass in the light-space pv matrices
            shader.setUniform4x4f('u_shadow_pv_directional', u_shadow_pv_directional)
            shader.setUniform4x4f('u_shadow_pv_point', u_shadow_pv_point)

            // bind depth texture for the directional light
            gl.activeTexture(gl.TEXTURE5)
            gl.bindTexture(gl.TEXTURE_2D, this.fbo_directional.getDepthTexture())
            shader.setUniform1i('u_shadow_tex_directional', 5)

            // bind depth texture for the point light
            gl.activeTexture(gl.TEXTURE6)
            gl.bindTexture(gl.TEXTURE_2D, this.fbo_point.getDepthTexture())
            shader.setUniform1i('u_shadow_tex_point', 6)

            shader.unuse()

            // render scene without lights
            this.scene.render( gl, [ 'light' ] )

            // render light annotations
            if (this.first_directional_light) this.first_directional_light.render( gl )
            if (this.first_point_light) this.first_point_light.render( gl )
        }
    }
}

export default RenderPasses