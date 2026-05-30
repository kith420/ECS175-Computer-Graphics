'use strict'

/**
 * Loads a given URL; this is used to load the shaders from file
 * @param { String } url The relative url to the file to be loaded
 * @returns { String | null } The external file as text
 */
function loadExternalFile( url )
{

    let req = new XMLHttpRequest( );
    req.open( "GET", url, false );
    req.send( null );

    return ( req.status == 200 ) ? req.responseText : null;

}

/**
 * Converts a hex color string to a normalized rgba array
 * @param { String } hex The hex color as a string
 * @returns { Array<number> } The color as normalized values
 */
function hex2rgb( hex )
{

    let rgb = hex.match( /\w\w/g )
        .map( x => parseInt( x, 16 ) / 255 );

    return [ rgb[ 0 ], rgb[ 1 ], rgb[ 2 ] ]

}

/**
 * Converts degrees to radians
 * @param {Double | Float} deg Angle in degrees
 * @returns {Double | Float} Angle in radians 
 */
function deg2rad( deg ) {
    return deg * (Math.PI / 180)
}

/**
 * Returns the mouse coordinates relative to a clicking target, in our case the canvas
 * @param event The mouse click event
 * @returns { { x: number, y: number } } The x and y coordinates relative to the canvas
 */
function getRelativeMousePosition( event )
{

    let target = event.target

    // if the mouse is not over the canvas, return invalid values
    if ( target.id != 'canvas' )
    {

        return {

            x: -Infinity,
            y: +Infinity,

        }

    }

    target = target || event.target;
    let rect = target.getBoundingClientRect( );

    return {

        x: event.clientX - rect.left,
        y: event.clientY - rect.top,

    }

}

export
{

    loadExternalFile,
    hex2rgb,
    deg2rad,
    getRelativeMousePosition

}
