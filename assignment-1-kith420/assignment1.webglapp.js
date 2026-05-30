
import { hex2rgb, deg2rad, loadExternalFile } from './js/utils/utils.js'
import Input from './js/input/input.js'
import * as mat4 from './js/lib/glmatrix/mat4.js'
import * as vec3 from './js/lib/glmatrix/vec3.js'
import * as quat4 from './js/lib/glmatrix/quat.js'
import { Box } from './js/app/object3d.js'

import { Scene, SceneNode } from './assignment1.scene.js'

/**
 * @Class
 * WebGlApp that will call basic GL functions, manage camera settings, transformations and scenes, and take care of rendering them
 *
 */
class WebGlApp
{
    /**
     * Initializes the app with a box, and a scene, view, and projection matrices
     *
     * @param {WebGL2RenderingContext} gl The webgl2 rendering context
     * @param {Shader} shader The shader to be used to draw the object
     * @param {AppState} app_state The state of the UI
     */
    constructor( gl, shader, app_state )
    {
        // Set GL flags
        this.setGlFlags( gl )

        // Store the shader
        this.shader = shader

        // Create a box instance
        this.box = new Box( gl, shader )

        // Declare a variable to hold a Scene
        // Scene files can be loaded through the UI (see below)
        this.scene = null

        // Bind a callback to the file dialog in the UI that loads a scene file
        app_state.onOpen3DScene((filename) => {
            let scene_config = JSON.parse(loadExternalFile(`./scenes/${filename}`))
            this.scene = new Scene(scene_config, gl, shader)
            return this.scene
        })

        // Create the view matrix
        this.eye     =   [2.0, 0.5, -2.0]
        this.center  =   [0, 0, 0]

        this.forward =   null
        this.right   =   null
        this.up      =   null

        // Forward, Right, and Up are initialized based on Eye and Center
        this.updateViewSpaceVectors()
        this.view = mat4.lookAt(mat4.create(), this.eye, this.center, this.up)

        // Create the projection matrix: 60° vertical fov, 16:9 aspect, near/far for scene visibility
        const fovy = deg2rad(60)
        const aspect = 16 / 9
        const near = 0.1
        const far = 1000.0
        this.projection = mat4.perspective(mat4.create(), fovy, aspect, near, far)

        // Use the shader's setUniform4x4f function to pass the matrices
        this.shader.use()
        this.shader.setUniform4x4f('u_v', this.view)
        this.shader.setUniform4x4f('u_p', this.projection)
        this.shader.unuse()

    }

    /**
     * Sets up GL flags
     * In this assignment we are drawing 3D data, so we need to enable the flag
     * for depth testing. This will prevent from geometry that is occluded by other
     * geometry from 'shining through' (i.e. being wrongly drawn on top of closer geomentry)
     *
     * Look into gl.enable() and gl.DEPTH_TEST to learn about this topic
     *
     * @param {WebGL2RenderingContext} gl The webgl2 rendering context
     */
    setGlFlags( gl ) {

        // Enable depth test
        gl.enable(gl.DEPTH_TEST)

    }

    /**
     * Sets the viewport of the canvas to fill the whole available space so we draw to the whole canvas
     *
     * @param {WebGL2RenderingContext} gl The webgl2 rendering context
     * @param {Number} width
     * @param {Number} height
     */
    setViewport( gl, width, height )
    {
        gl.viewport( 0, 0, width, height )
    }

    /**
     * Clears the canvas color
     *
     * @param {WebGL2RenderingContext} gl The webgl2 rendering context
     */
    clearCanvas( gl )
    {
        gl.clearColor(...hex2rgb('#000000'), 1.0)
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
    }

    /**
     * Updates components of this app
     *
     * @param {WebGL2RenderingContext} gl The webgl2 rendering context
     * @param {AppState} app_state The state of the UI
     * @param {Number} delta_time The time in seconds since the last frame (floating point number)
     */
    update(gl, app_state, delta_time) {
        if (this.scene != null) {
            // Get the draw mode from the UI
            const drawModeState = app_state.getState('Draw Mode')
            const drawMode = drawModeState === 'Points' ? gl.POINTS : gl.TRIANGLES
            for (let node of this.scene.getNodes()) {
                // If the node is a model, set the draw mode
                if (node.type === 'model') {
                    node.setDrawMode(drawMode)
                }
            }
        }

        // Control
        switch(app_state.getState('Control')) {
            case 'Camera':
                this.updateCamera( delta_time )
                break
            case 'Scene Node':
                // Only do this if a scene is loaded
                if (this.scene == null)
                    break

                // Get the currently selected scene node from the UI
                let scene_node = this.scene.getNode( app_state.getState('Select Scene Node') )
                this.updateSceneNode( scene_node, delta_time )
                break
        }
    }

    /**
     * Update the Forward, Right, and Up vector according to changes in the
     * camera position (Eye) or the center of focus (Center)
     */
    updateViewSpaceVectors( ) {
        this.forward = vec3.normalize(vec3.create(), vec3.sub(vec3.create(), this.eye, this.center))
        this.right = vec3.normalize(vec3.create(), vec3.cross(vec3.create(), [0,1,0], this.forward))
        this.up = vec3.normalize(vec3.create(), vec3.cross(vec3.create(), this.forward, this.right))
    }

    /**
     * Update the camera view based on user input and the arcball viewing model
     *
     * Supports the following interactions:
     * 1) Left Mouse Button - Rotate the view's center
     * 2) Middle Mouse Button or Space+Left Mouse Button - Pan the view relative view-space
     * 3) Right Mouse Button - Zoom towards or away from the view's center
     *
     * @param {Number} delta_time The time in seconds since the last frame (floating point number)
     */
    updateCamera( delta_time ) {
        let view_dirty = false

        // Control - Zoom
        if (Input.isMouseDown(2)) {
            const zoomSpeed = 2.5
            const amount = Input.getMouseDy() * delta_time * zoomSpeed
            vec3.scaleAndAdd(this.eye, this.eye, this.forward, amount)

            view_dirty = true
        }

        // Control - Rotate
        if (Input.isMouseDown(0) && !Input.isKeyDown(' ')) {
            const rotSpeed = 2.0
            const yaw = -Input.getMouseDx() * delta_time * rotSpeed
            const pitch = -Input.getMouseDy() * delta_time * rotSpeed

            let offset = vec3.sub(vec3.create(), this.eye, this.center)

            // yaw about current up
            let qYaw = quat4.setAxisAngle(quat4.create(), this.up, yaw)
            vec3.transformQuat(offset, offset, qYaw)

            // recompute axes for pitch
            let fwd = vec3.normalize(vec3.create(), offset)
            let right_axis = vec3.normalize(vec3.create(), vec3.cross(vec3.create(), [0, 1, 0], fwd))
            let up_axis = vec3.normalize(vec3.create(), vec3.cross(vec3.create(), fwd, right_axis))

            let qPitch = quat4.setAxisAngle(quat4.create(), right_axis, pitch)
            vec3.transformQuat(offset, offset, qPitch)

            let new_eye = vec3.add(vec3.create(), this.center, offset)
            this.eye[0] = new_eye[0]
            this.eye[1] = new_eye[1]
            this.eye[2] = new_eye[2]

            view_dirty = true
        }

        // Control - Pan
        if (Input.isMouseDown(1) || (Input.isMouseDown(0) && Input.isKeyDown(' '))) {
            // Calculate the distance between the eye and the center
            let dist = vec3.distance(this.eye, this.center)
            const panSpeed = dist * 0.1
            const tx = -Input.getMouseDx() * delta_time * panSpeed
            const ty = Input.getMouseDy() * delta_time * panSpeed
            const delta = vec3.create()
            
            // Scale the right and up vectors by the mouse delta and the pan speed
            vec3.scaleAndAdd(delta, delta, this.right, tx)
            vec3.scaleAndAdd(delta, delta, this.up, ty)
            vec3.add(this.eye, this.eye, delta)
            vec3.add(this.center, this.center, delta)

            view_dirty = true
        }

        // Update view matrix if needed
        if (view_dirty) {
            this.updateViewSpaceVectors()
            this.view = mat4.lookAt(mat4.create(), this.eye, this.center, this.up)
            this.shader.use()
            this.shader.setUniform4x4f('u_v', this.view)
            this.shader.unuse()
        }
    }

    /**
     * Update a SceneNode's local transformation
     *
     * Supports the following interactions:
     * 1) Left Mouse Button - Rotate the node relative to the view along the Up and Right axes
     * 2) Middle Mouse Button or Space+Left Mouse Button - Translate the node relative to the view along the Up and Right axes
     * 3) Right Mouse Button - Scales the node around it's local center
     *
     * @param {SceneNode} node The SceneNode to manipulate
     * @param {Number} delta_time The time in seconds since the last frame (floating point number)
     */
    updateSceneNode(node, delta_time) {
        let node_dirty = false

        let translation = mat4.create()
        let rotation = mat4.create()
        let scale = mat4.create()

        // Control - Scale
        if (Input.isMouseDown(2)) {
            const scaleSpeed = 1.0
            const s = 1.0 + Input.getMouseDy() * delta_time * scaleSpeed
            mat4.fromScaling(scale, [s, s, s])

            node_dirty = true
        }

        // Control - Rotate
        if (Input.isMouseDown(0) && !Input.isKeyDown(' ')) {
            const rotSpeed = 1.5
            const angleUp = -Input.getMouseDx() * delta_time * rotSpeed
            const angleRight = Input.getMouseDy() * delta_time * rotSpeed
            let R_up = mat4.fromRotation(mat4.create(), angleUp, this.up)
            let R_right = mat4.fromRotation(mat4.create(), angleRight, this.right)
            mat4.multiply(rotation, R_up, R_right)

            node_dirty = true
        }

        // Control - Translate
        if (Input.isMouseDown(1) || (Input.isMouseDown(0) && Input.isKeyDown(' '))) {
            const transSpeed = 1.0
            const dx = -Input.getMouseDx() * delta_time * transSpeed
            const dy = Input.getMouseDy() * delta_time * transSpeed
            const delta = vec3.add(vec3.create(), vec3.scale(vec3.create(), this.right, dx), vec3.scale(vec3.create(), this.up, dy))
            mat4.fromTranslation(translation, delta)

            node_dirty = true
        }


        // Update node transformation if needed
        if (node_dirty) {
            let transformation = node.getTransformation()
            // Apply in order: current local * scale * rotation * translation (view-relative)
            let result = mat4.create()
            mat4.multiply(result, transformation, scale)
            mat4.multiply(result, result, rotation)
            mat4.multiply(result, result, translation)
            node.setTransformation(result)
        }
    }

    /**
     * Main render loop which sets up the active viewport (i.e. the area of the canvas we draw to)
     * clears the canvas with a background color and draws the scene
     *
     * @param {WebGL2RenderingContext} gl The webgl2 rendering context
     * @param {Number} canvas_width The canvas width. Needed to set the viewport
     * @param {Number} canvas_height The canvas height. Needed to set the viewport
     */
    render(gl, canvas_width, canvas_height) {
        // Set viewport and clear canvas
        this.setViewport(gl, canvas_width, canvas_height)
        this.clearCanvas(gl)
    
        // Render the box
        this.box.render(gl)
    
        // Render the scene
        if (this.scene) this.scene.render(gl)
    }
}

export {
    WebGlApp
}
