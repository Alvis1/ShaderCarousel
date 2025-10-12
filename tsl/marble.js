//	TSL-Textures: Marble

import { Color } from "three";
import { abs, exp, mix, positionGeometry, sin } from 'three/tsl';
import { noise, prepare, TSLFn } from './tsl-utils.js';

var defaults = {
	$name: 'Marble',

	scale: 2,
	turbulence: 0.5,
	veins: 4,

	color: new Color( 0xFFFFFF ),
	background: new Color( 0x404040 ),

	seed: 0,
};

var marble = TSLFn( ( params ) => {

	params = prepare( params, defaults );

	var pos = positionGeometry.mul( exp( params.scale ) ).add( params.seed ).toVar( );

	// Create turbulence
	var turbulence = noise( pos ).mul( params.turbulence );
	
	// Add veining pattern
	var veins = sin( pos.x.add( turbulence ).mul( params.veins ) );
	
	// Enhance with additional noise layers
	var k = abs( veins ).add( noise( pos.mul( 2 ) ).mul( 0.3 ) );
	
	k = k.clamp( 0, 1 );

	return mix( params.background, params.color, k );

}, defaults );

export { marble };