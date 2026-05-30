
import { hex2rgb, deg2rad } from './js/utils/utils.js'

/**
 * @Class
 * Base class for all drawable shapes
 *
 */
class Shape
{
    /**
     *
     * @param {WebGL2RenderingContext} gl The webgl2 rendering context
     * @param {Shader} shader The shader to be used to draw the object
     * @param {Array<Float>} vertices List of vertex positions
     * @param {Array<Int>} indices List of vertex indices
     * @param {Array<Float>} color Color as a three-element vector
     * @param {WebGL2RenderingContext.GL_TRIANGLES | WebGL2RenderingContext.GL_POINTS} draw_mode The draw mode to use. In this assignment we use GL_TRIANGLES and GL_POINTS
     * @param {Number} num_elements The number of elements that make up one primitive in the given draw mode
     */
    constructor( gl, shader, vertices, indices, color, draw_mode, num_elements )
    {
        this.shader = shader

        this.vertices = vertices
        this.vertices_buffer = null
        this.createVBO( gl )

        this.indices = indices
        this.index_buffer = null
        this.createIBO( gl )

        this.color = color

        this.draw_mode = draw_mode

        this.num_components = 2
        this.num_elements = num_elements

        this.vertex_array_object = null
        this.createVAO( gl, shader )
    }

    /**
     * Sets up a vertex attribute object that is used during rendering to automatically tell WebGL how to access our buffers
     * @param { WebGL2RenderingContext } gl The webgl2 rendering context
     */
    createVAO( gl, shader )
    {
        this.vertex_array_object = gl.createVertexArray()
        
        gl.bindVertexArray(this.vertex_array_object) // binding for VAO
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertices_buffer) // binding for VBO and linking to shader attribute
        let a_position = shader.getAttributeLocation('a_position') // attribute location for a_position
        
        gl.enableVertexAttribArray(a_position) // enabling the vertex attribute array
        
        // Sets the correct vertex attrib pointer settings for VBO
        // 2 components per vertex (x, y), type FLOAT, not normalized, stride 0, offset 0
        gl.vertexAttribPointer(a_position, this.num_components, gl.FLOAT, false, 0, 0)

        // unbinding the buffers + some cleanup
        gl.bindVertexArray(null)
        gl.bindBuffer(gl.ARRAY_BUFFER, null)
    }

    /**
     * Creates vertex buffer object for vertex data
     * @param { WebGL2RenderingContext } gl The webgl2 rendering context
     */
    createVBO( gl )
    {
        this.vertices_buffer = gl.createBuffer() // create VBO + store in this.vertices_buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertices_buffer) // binding the buffer
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vertices), gl.STATIC_DRAW) // filling in the buffer with data from this.vertices, float32array used to store vertex positions
        gl.bindBuffer(gl.ARRAY_BUFFER, null) // unbind the buffer
    }

    /**
     * Creates index buffer object for vertex data
     * @param { WebGL2RenderingContext } gl The webgl2 rendering context
     */
    createIBO( gl )
    {
        this.index_buffer = gl.createBuffer() // create IBO + store in this.index_buffer
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.index_buffer) // bind the buffer
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.indices), gl.STATIC_DRAW) // filling in the buffer with data from this.vertices, uint16array used to store indices
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null) // unbind the buffer
    }

    /**
     * Render call for an individual shape.
     *
     * In this function, you set both the vertex and index buffers active
     * After that you want to set the color uniform "u_color" in the shader, so that it knows which color to use
     * "u_color" is a vec3 i.e. a list of 3 floats
     * Finally, you draw the geometry
     * Don't forget to unbind the buffers after that
     *
     * @param { WebGL2RenderingContext } gl The webgl2 rendering context
     */
    render( gl )
    {
        gl.bindVertexArray(this.vertex_array_object) // binding the vertex array object
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.index_buffer) // binding the index buffer
        
        this.shader.setUniform3f('u_color', this.color) // send uniform attributes for the shape's color using this.shader and the function setUniform3f
        
        gl.drawElements(this.draw_mode, this.num_elements, gl.UNSIGNED_SHORT, 0)
        gl.bindVertexArray(null)
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null)
    }

}

/**
 * @Class
 * Triangle extension for Shape. Creates vertex list and indices and calls the super constructor.
 */
class Triangle extends Shape
{

    constructor( gl, shader, position, color, sideLength)
    {
        let cosangle = Math.cos(deg2rad(30))  // cos(30) = sqrt(3)/2
        let sinangle = Math.sin(deg2rad(30))  // sin(30) = 0.5
        let radius = sideLength / Math.sqrt(3)
        let vertices = [
            position[0], position[1] + radius, // top vertex
            position[0] - cosangle * radius, position[1] - sinangle * radius, // bottom left vertex
            position[0] + cosangle * radius, position[1] - sinangle * radius // bottom right vertex
        ]
        let indices = [ 0, 1, 2 ]

        super( gl, shader, vertices, indices, color, gl.TRIANGLES, indices.length )
    }

}

/**
 * @Class
 * WebGlApp that will call basic GL functions, manage a list of shapes, and take care of rendering them
 *
 * This class will use the Shapes that you have implemented to store and render them
 */
class WebGlApp
{
    /**
     * Initializes an empty list of shapes. Use this to store shapes.
     */
    constructor()
    {
        this.shapes = [ ]
    }

    /**
     * Initializes webgl2 with settings
     * @returns { WebGL2RenderingContext | null } The WebGL2 context or Null
     */
    initGl( )
    {
        let canvas = document.getElementById('canvas')
        let gl = canvas.getContext('webgl2')
        return gl
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
        gl.viewport(0, 0, width, height) // fill entire width & height of canvas
    }

    /**
     * Clears the canvas color with Aggie Blue
     *
     * @param {WebGL2RenderingContext} gl The webgl2 rendering context
     */
    clearCanvas( gl )
    {
        // Aggie Blue (#022851)
        let aggieBlue = hex2rgb('#022851')
        gl.clearColor(aggieBlue[0], aggieBlue[1], aggieBlue[2], 1.0) // set clear color
        gl.clear(gl.COLOR_BUFFER_BIT) 
    }

    /**
     * Adds a triangle shape to the list of shapes
     *
     * @param {WebGL2RenderingContext} gl The webgl2 rendering context
     * @param {Shader} shader The shader to be used to draw the object
     * @param {Array<Number>} position The position of the point as a two-element array
     * @param {Number} sideLength The length of the triangle sides
     */
    addTriangle( gl, shader, position, sideLength )
    {
        // Aggie Gold (#FFBF00)
        let aggieGold = hex2rgb('#FFBF00')
        let triangle = new Triangle(gl, shader, position, aggieGold, sideLength) // push the new triangle into the list of shapes
        this.shapes.push(triangle)
    }

    /**
     * Clears the list of shapes. After this call the canvas will be empty.
     */
    clearShapes()
    {
        this.shapes = [ ]
    }

    /**
     * Main render loop which sets up the active viewport (i.e. the area of the canvas we draw to)
     * clears the canvas with a background color and draws all active shapes
     *
     * If there's no shapes, only the background will be drawn
     *
     * @param {WebGL2RenderingContext} gl The webgl2 rendering context
     * @param {Number} canvas_width The canvas width. Needed to set the viewport
     * @param {Number} canvas_height The canvas height. Needed to set the viewport
     */
    render( gl, canvas_width, canvas_height )
    {
        this.setViewport(gl, canvas_width, canvas_height) // set viewport to span full canvas width & height
        this.clearCanvas(gl) // clear with Aggie Blue
        
        for (let shape of this.shapes) {
            shape.render(gl)
        }
    }

}


// JS Module Export -- No need to modify this
export
{
    Triangle,
    WebGlApp
}
