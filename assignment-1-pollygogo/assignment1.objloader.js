import { loadExternalFile } from './js/utils/utils.js'

/**
 * A class to load OBJ files from disk
 */
class OBJLoader {

    /**
     * Constructs the loader
     *
     * @param {String} filename The full path to the model OBJ file on disk
     */
    constructor(filename) {
        this.filename = filename
    }

    /**
     * Loads the file from disk and parses the geometry
     *
     * @returns {[Array<Number>, Array<Number>]} A tuple / list containing 1) the list of vertices and 2) the list of triangle indices
     */
    load() {
        // Load the file's contents
        let contents = loadExternalFile(this.filename)
        if (contents == null)
            throw `Unable to load OBJ file "${this.filename}"`

        // Create lists for vertices and indices
        let vertices = []
        let indices = []

        // TODO: STEP 1
        // Parse the file's contents
        // You can loop through the file line-by-line by splitting the string at line breaks
        // contents.split('\n')
        let lines = contents.split(/\r?\n/)

        // TODO: STEP 2
        // Process (or skip) each line based on its content and call the parsing functions to parse an entry
        // For vertices call OBJLoader.parseVertex
        // For faces call OBJLoader.parseFace
        for (let rawLine of lines) {
            let line = rawLine.trim()
            if (line.length == 0 || line.startsWith('#'))
                continue

            if (line.startsWith('v ')) {
                let v = this.parseVertex(line)
                vertices.push(v[0], v[1], v[2])
            } else if (line.startsWith('f ')) {
                let faceIndices = this.parseFace(line)
                for (let idx of faceIndices)
                    indices.push(idx)
            }
        }

        // TODO: STEP 3
        // Vertex coordinates can be arbitrarily large or small
        // We want to normalize the vertex coordinates to fit within our [-1.0, 1.0]^3 box
        // As a pre-processing step and to avoid complicated scaling transformations in the main app we perform normalization here
        // Determine the max and min extent of all the vertex coordinates and normalize each entry based on this finding
        if (vertices.length >= 3) {
            let minX = Infinity, minY = Infinity, minZ = Infinity
            let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity

            for (let i = 0; i < vertices.length; i += 3) {
                let x = vertices[i], y = vertices[i + 1], z = vertices[i + 2]
                if (x < minX) minX = x
                if (y < minY) minY = y
                if (z < minZ) minZ = z
                if (x > maxX) maxX = x
                if (y > maxY) maxY = y
                if (z > maxZ) maxZ = z
            }

            let cx = (minX + maxX) * 0.5
            let cy = (minY + maxY) * 0.5
            let cz = (minZ + maxZ) * 0.5

            let extentX = maxX - minX
            let extentY = maxY - minY
            let extentZ = maxZ - minZ
            let extent = Math.max(extentX, extentY, extentZ)
            let invHalfExtent = extent > 0 ? (2.0 / extent) : 1.0

            for (let i = 0; i < vertices.length; i += 3) {
                vertices[i] = (vertices[i] - cx) * invHalfExtent
                vertices[i + 1] = (vertices[i + 1] - cy) * invHalfExtent
                vertices[i + 2] = (vertices[i + 2] - cz) * invHalfExtent
            }
        }

        // TODO: HINT
        // Look up the JavaScript functions String.split, parseFloat, and parseInt
        // You will need thim in your parsing functions

        // Return the tuple
        return [ vertices, indices ]
    }

    /**
     * Parses a single OBJ vertex entry given as a string
     * Call this function from OBJLoader.load()
     *
     * @param {String} vertex_string String containing the vertex entry 'v {x} {y} {z}'
     * @returns {Array<Number>} A list containing the x, y, z coordinates of the vertex
     */
    parseVertex(vertex_string)
    {
        // TODO: Process the entry and parse numbers to float
        let parts = vertex_string.trim().split(/\s+/)
        if (parts.length < 4)
            throw `Invalid OBJ vertex entry: "${vertex_string}"`

        let x = parseFloat(parts[1])
        let y = parseFloat(parts[2])
        let z = parseFloat(parts[3])
        return [ x, y, z ]
    }

    /**
     * Parses a single OBJ face entry given as a string
     * Face entries can refer to 3 or 4 elements making them triangle or quad faces
     * WebGL only supports triangle drawing, so we need to triangulate the entry if we find 4 indices
     * This is done using OBJLoader.triangulateFace()
     *
     * Each index entry can have up to three components separated by '/'
     * You need to grad the first component. The other ones are for textures and normals which will be treated later
     * Make sure to account for this fact.
     *
     * Call this function from OBJLoader.load()
     *
     * @param {String} face_string String containing the face entry 'f {v0}/{vt0}/{vn0} {v1}/{vt1}/{vn1} {v2}/{vt2}/{vn2} ({v3}/{vt3}/{vn3})'
     * @returns {Array<Number>} A list containing three indices defining a triangle
     */
    parseFace(face_string)
    {
        // TODO: Process the entry and parse numbers to ints
        // TODO: Don't forget to handle triangulation if quads are given
        let parts = face_string.trim().split(/\s+/)
        if (parts.length < 4)
            throw `Invalid OBJ face entry: "${face_string}"`

        // grab the vertex-index component (first component before '/')
        let face = []
        for (let i = 1; i < parts.length; i++) {
            let token = parts[i]
            if (!token)
                continue

            let v_str = token.split('/')[0]
            let v = parseInt(v_str, 10)
            if (Number.isNaN(v))
                throw `Invalid OBJ face index "${v_str}" in: "${face_string}"`

            // obj uses 1-based indexing, WebGL uses 0-based indexing
            face.push(v - 1)
        }

        // triangulate if quads are given; also support n-gons by fan triangulation
        if (face.length == 3) return face
        if (face.length == 4) return this.triangulateFace(face)

        let tris = []
        for (let i = 1; i < face.length - 1; i++)
            tris.push(face[0], face[i], face[i + 1])

        return tris
    }

    /**
     * Triangulates a face entry given as a list of 4 indices
     * Use these 4 indices to create indices for two separate triangles that share a side (2 vertices)
     * Return a new index list containing the triangulated indices
     *
     * @param {Array<Number>} face The quad indices with 4 entries
     * @returns {Array<Number>} The newly created list containing triangulated indices
     */
    triangulateFace(face)
    {
        // TODO: Triangulate the face indices
        if (face.length != 4)
            throw `triangulateFace expected 4 indices, got ${face.length}`

        // two triangles: (0,1,2) and (0,2,3)
        return [ face[0], face[1], face[2], face[0], face[2], face[3] ]
    }
}

export {
    OBJLoader
}
