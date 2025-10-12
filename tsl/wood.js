//	TSL-Textures: Wood

import { Color } from "three";
import { exp, mix, positionGeometry, sin } from 'three/tsl';
import { noise, prepare, TSLFn } from './tsl-utils.js';

var defaults = {
	$name: 'Wood',

	scale: 2,
	rings: 8,
	turbulence: 0.3,

	colorLight: new Color( 0xD2B48C ),
	colorDark: new Color( 0x8B4513 ),

	seed: 0,
};

var wood = TSLFn( ( params ) => {

	params = prepare( params, defaults );

	var pos = positionGeometry.mul( exp( params.scale ) ).add( params.seed ).toVar( );

	// Create wood ring pattern based on distance from center
	var distance = pos.xz.length();
	
	// Add turbulence for natural wood grain
	var turbulence = noise( pos ).mul( params.turbulence );
	
	// Create ring pattern
	var rings = sin( distance.add( turbulence ).mul( params.rings ) );
	
	// Enhance with grain noise
	var grain = noise( pos.mul( 4 ) ).mul( 0.2 );
	
	var k = rings.add( grain ).mul( 0.5 ).add( 0.5 );
	
	k = k.clamp( 0, 1 );

	return mix( params.colorDark, params.colorLight, k );

}, defaults );

export { wood };