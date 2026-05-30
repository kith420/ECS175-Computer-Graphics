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
        // Load the file's contents (path is relative to the page URL — use a local server, not file://)
        let contents = loadExternalFile(this.filename)
        if (!contents) {
            console.error('OBJLoader: failed to load "' + this.filename + '". Use a local server (e.g. python3 -m http.server from the project folder) so ./models/ can be loaded.')
            return [[], []]
        }

        // Create lists for vertices and indices
        let vertices = []
        let indices = []

        // 1) We parse the file's contents line by line
        let lines = contents.split('\n')

        // 2) We process each line based on its content
        for (let line of lines) {
            line = line.trim()
            if (line.startsWith('v ')) {
                vertices.push(...this.parseVertex(line))
            } else if (line.startsWith('f ')) {
                indices.push(...this.parseFace(line))
            }
        }

        // 3) Do normalization of vertex coordinates to [-1.0, 1.0]^3
        if (vertices.length >= 3) {
            let minX = vertices[0], minY = vertices[1], minZ = vertices[2]
            let maxX = minX, maxY = minY, maxZ = minZ
            for (let i = 0; i < vertices.length; i += 3) {
                minX = Math.min(minX, vertices[i]); maxX = Math.max(maxX, vertices[i])
                minY = Math.min(minY, vertices[i + 1]); maxY = Math.max(maxY, vertices[i + 1])
                minZ = Math.min(minZ, vertices[i + 2]); maxZ = Math.max(maxZ, vertices[i + 2])
            }
            let rangeX = maxX - minX || 1, rangeY = maxY - minY || 1, rangeZ = maxZ - minZ || 1
            let scale = 2.0 / Math.max(rangeX, rangeY, rangeZ)
            let cx = (minX + maxX) / 2, cy = (minY + maxY) / 2, cz = (minZ + maxZ) / 2
            for (let i = 0; i < vertices.length; i += 3) {
                vertices[i] = (vertices[i] - cx) * scale
                vertices[i + 1] = (vertices[i + 1] - cy) * scale
                vertices[i + 2] = (vertices[i + 2] - cz) * scale
            }
        }

        if (vertices.length === 0 || indices.length === 0) {
            console.warn('OBJLoader: "' + this.filename + '" produced no geometry (vertices:', vertices.length, ', indices:', indices.length, ')')
        }
        return [vertices, indices]
    }

    /**
     * Parses a single OBJ vertex entry given as a string
     * Call this function from OBJLoader.load()
     *
     * @param {String} vertex_string String containing the vertex entry 'v {x} {y} {z}'
     * @returns {Array<Number>} A list containing the x, y, z coordinates of the vertex
     */
    parseVertex(vertex_string) {
        // Split the vertex string into parts and parse the coordinates
        let parts = vertex_string.trim().split(/\s+/)
        return [
            parseFloat(parts[1]),
            parseFloat(parts[2]),
            parseFloat(parts[3])
        ]
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
    parseFace(face_string) {
        let parts = face_string.trim().split(/\s+/).slice(1)
        let face = []
        for (let p of parts) {
            let idx = p.split('/')[0]
            face.push(parseInt(idx, 10) - 1)
        }
        // If the face is a quad, triangulate it
        if (face.length === 4) {
            return this.triangulateFace(face)
        }
        return face
    }

    /**
     * Triangulates a face entry given as a list of 4 indices
     * Use these 4 indices to create indices for two separate triangles that share a side (2 vertices)
     * Return a new index list containing the triangulated indices
     *
     * @param {Array<Number>} face The quad indices with 4 entries
     * @returns {Array<Number>} The newly created list containing triangulated indices
     */
    triangulateFace(face) {
        // Create two triangles from the quad by sharing two vertices
        return [face[0], face[1], face[2], face[0], face[2], face[3]]
    }
}

export {
    OBJLoader
}
