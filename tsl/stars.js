//	TSL-Textures: Stars

import { Color } from "three";
import { abs, exp, mix, positionGeometry, select } from 'three/tsl';
import { hsl, noise, prepare, toHsl, TSLFn } from './tsl-utils.js';

var defaults = {
	$name: 'Stars',

	scale: 2,
	density: 2,
	variation: 0,

	color: new Color( 0xfff5f0 ),
	background: new Color( 0x000060 ),

	seed: 0,
};

var stars = TSLFn( ( params ) => {

	params = prepare( params, defaults );

	var pos = positionGeometry.mul( exp( params.scale.div( 2 ).add( 3 ) ) ).add( params.seed ).toVar( );

	var k = abs( noise( pos ) ).pow( 10 ).mul( 10 );

	k = k.mul( exp( params.density.sub( 2 ) ) );

	k = k.clamp( 0, 1 );

	var hslColor = toHsl( params.color );
	var hslBackground = toHsl( params.background );

	hslColor.x = hslColor.x.add( noise( pos.mul( 2 ) ).mul( params.variation.div( 10 ) ) );

	return mix( hsl( hslBackground.x, hslBackground.y, hslBackground.z ), hsl( hslColor.x, hslColor.y, hslColor.z ), k );

}, defaults );

export { stars };