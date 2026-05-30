'use strict'

import Input from "../input/input.js"
import AppState from "./appstate.js"
import Shader from "../utils/shader.js"
import { hex2rgb } from "../utils/utils.js"

import { WebGlApp } from "../../assignment0.js"

class App
{

    constructor( )
    {

        console.log( "Initializing App" )
        // webgl app implementation
        this.impl = new WebGlApp( )

        // canvas & gl
        this.canvas = document.getElementById( "canvas" )
        this.canvas.addEventListener( "contextmenu", event => event.preventDefault( ) );
        this.gl = this.initGl( )

        // shaders
        console.log( "Loading Shaders" )
        this.shader = new Shader( this.gl, "../../shaders/vertex.glsl", "../../shaders/fragment.glsl" )

        // resize handling
        this.resizeToDisplay( )
        this.initial_width = this.canvas.width
        this.initial_height = this.canvas.height
        window.onresize = this.resizeToDisplay.bind( this )

        // app state
        this.app_state = new AppState( )

    }

    /**
     * Initializes webgl2 with settings
     * @returns { WebGL2RenderingContext | null } The WebGL2 context or Null
     */
    initGl( )
    {
        return this.impl.initGl()
    }

    /** 
     * Resizes canvas to pixel-size-corrected display size
     */
    resizeToDisplay( )
    {

        this.canvas.width = this.canvas.clientWidth
        this.canvas.height = this.canvas.clientHeight

    }

    /**
     * Starts render loop
     */
    start( )
    {

        requestAnimationFrame( ( ) =>
        {

            this.update( )

        } )

    }

    /**
     * Called every frame, triggers input and app state update and renders a frame
     */
    update( )
    {

        this.app_state.update( )

        // Drawing Shapes
        if (Input.isMouseClicked( 0 )) {
            let scalex = (this.initial_width / this.canvas.width)
            let scaley = (this.initial_height / this.canvas.height)
            let position = [ Input.mousex * scalex, Input.mousey * scaley ]

            let triangleSideLength = this.initial_width / 15 * Math.sqrt(2)
            this.impl.addTriangle( this.gl, this.shader, position, triangleSideLength )
        }

        // Clear the canvas
        if (this.app_state.getState('Canvas') == "Clear Canvas")
            this.impl.clearShapes()

        Input.update( )
        this.render( )
        requestAnimationFrame( ( ) =>
        {

            this.update( )

        } )

    }

    /**
     * Main render loop
     */
    render( )
    {
        // activate shader
        this.shader.use( )
        this.shader.setUniform2f( "u_resolution", new Float32Array([ this.initial_width, this.initial_height ]) )

        this.impl.render( this.gl, this.canvas.width, this.canvas.height )

    }

}

export default App