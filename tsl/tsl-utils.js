//	Equirectangular Texture Generator - TSL Utility Functions
//
//	hsl( h, s, l ):vec3 			- convert from hsl to rgb
//	toHsl( rgb:vec3 ):vec3			- convert from rgb to hsl
//	spherical( phi, theta ):vec3	- from angles to point on unit sphere
//	applyEuler( vec:vec3, eu:vec3 ):vec3 - apply Euler rotation to a vector

import { add, cos, cross, dFdx, dFdy, float, Fn, If, log2, mat4, max, min, mul, mx_noise_float, positionGeometry, pow, remap, select, sin, smoothstep, sub, transformNormalToView, uniform, vec3, vec4 } from 'three/tsl';
import { Color, Vector3 } from 'three';

// helper function - convert hsl to rgb, ported to TSL from:
// https://en.wikipedia.org/wiki/HSL_and_HSV#HSL_to_RGB_alternative

const hslHelper = Fn( ([ h, s, l, n ])=>{

	var k = n.add( h.mul( 12 ) ).mod( 12 );
	var a = s.mul( min( l, sub( 1, l ) ) );
	return l.sub( a.mul( max( -1, min( min( k.sub( 3 ), sub( 9, k ) ), 1 ) ) ) );

} );

hslHelper.setLayout( {
	name: 'hslHelper',
	type: 'float',
	inputs: [
		{ name: 'h', type: 'float' },
		{ name: 's', type: 'float' },
		{ name: 'l', type: 'float' },
		{ name: 'n', type: 'float' },
	]
} );

// convert from hsl to rgb
const hsl = Fn( ([ h, s, l ]) => {

	h = h.fract().add( 1 ).fract();
	s = s.clamp( 0, 1 );
	l = l.clamp( 0, 1 );

	var r = hslHelper( h, s, l, 0 );
	var g = hslHelper( h, s, l, 8 );
	var b = hslHelper( h, s, l, 4 );

	return vec3( r, g, b );

} );

hsl.setLayout( {
	name: 'hsl',
	type: 'vec3',
	inputs: [
		{ name: 'h', type: 'float' },
		{ name: 's', type: 'float' },
		{ name: 'l', type: 'float' },
	]
} );

// convert from rgb to hsl
const toHsl = Fn( ([ rgb ]) => {

	var R = float( rgb.x ).toVar(),
		G = float( rgb.y ).toVar(),
		B = float( rgb.z ).toVar();

	var mx = max( R, max( G, B ) ).toVar();
	var mn = min( R, min( G, B ) ).toVar();

	var H = float( 0 ).toVar(),
		S = float( 0 ).toVar(),
		L = add( mx, mn ).div( 2 );

	If( mn.notEqual( mx ), ()=>{

		const delta = sub( mx, mn ).toVar();

		S.assign( select( L.lessThanEqual( 0.5 ), delta.div( add( mn, mx ) ), delta.div( sub( 2, add( mn, mx ) ) ) ) );
		If( mx.equal( R ), ()=>{

			H.assign( sub( G, B ).div( delta ).add( select( G.lessThanEqual( B ), 6, 0 ) ) );

		} )
			.ElseIf( mx.equal( G ), ()=>{

				H.assign( sub( B, R ).div( delta ).add( 2 ) );

			} )
			.Else( ()=>{

				H.assign( sub( R, G ).div( delta ).add( 4 ) );

			} );

		H.divAssign( 6 );

	} );
	return vec3( H, S, L );

} );

toHsl.setLayout( {
	name: 'toHsl',
	type: 'vec3',
	inputs: [
		{ name: 'rgb', type: 'vec3' },
	]
} );

// make all elements dynamic (i.e. uniform)
function dynamic( params ) {

	var result = {};

	for ( var [ key, value ] of Object.entries( params ) ) {

		if ( key[ 0 ]!='$' ) {

			if ( value instanceof Vector3 )
				result[ key ] = uniform( value, 'vec3' );
			else
				result[ key ] = uniform( value );

		}

	}

	return result;

}

// convert phi-theta angles to position on unit sphere
const spherical = Fn( ([ phi, theta ]) => {

	return vec3(
		sin( theta ).mul( sin( phi ) ),
		cos( phi ),
		cos( theta ).mul( sin( phi ) )
	);

} );

spherical.setLayout( {
	name: 'spherical',
	type: 'vec3',
	inputs: [
		{ name: 'phi', type: 'float' },
		{ name: 'theta', type: 'float' },
	]
} );

// apply Euler rotation to a vector
const applyEuler = Fn( ([ vec, eu ]) => {

	var quat = quaternionFromEuler( eu );
	return rotateVector( quat, vec );

} );

applyEuler.setLayout( {
	name: 'applyEuler',
	type: 'vec3',
	inputs: [
		{ name: 'vec', type: 'vec3' },
		{ name: 'eu', type: 'vec3' },
	]
} );

// quaternion from euler angles
const quaternionFromEuler = Fn( ([ eu ]) => {

	const c1 = cos( eu.x.div( 2 ) );
	const c2 = cos( eu.y.div( 2 ) );
	const c3 = cos( eu.z.div( 2 ) );
	const s1 = sin( eu.x.div( 2 ) );
	const s2 = sin( eu.y.div( 2 ) );
	const s3 = sin( eu.z.div( 2 ) );

	const x = s1.mul( c2 ).mul( c3 ).add( c1.mul( s2 ).mul( s3 ) );
	const y = c1.mul( s2 ).mul( c3 ).sub( s1.mul( c2 ).mul( s3 ) );
	const z = c1.mul( c2 ).mul( s3 ).add( s1.mul( s2 ).mul( c3 ) );
	const w = c1.mul( c2 ).mul( c3 ).sub( s1.mul( s2 ).mul( s3 ) );

	return vec4( x, y, z, w );

} );

// rotate vector by quaternion
const rotateVector = Fn( ([ quat, vec ]) => {

	const qvec = vec3( quat.x, quat.y, quat.z );
	const uv = cross( qvec, vec );
	const uuv = cross( qvec, uv );
	return vec.add( uv.mul( quat.w.mul( 2 ) ) ).add( uuv.mul( 2 ) );

} );

// exponential remapping function
const remapExp = Fn( ([ x, fromMin, fromMax, toMin, toMax ]) => {

	x = remap( x, fromMin, fromMax, 0, 1 );
	x = pow( 2, mul( x, log2( toMax.div( toMin ) ) ).add( log2( toMin ) ) );
	return x;

} );

remapExp.setLayout( {
	name: 'remapExp',
	type: 'float',
	inputs: [
		{ name: 'x', type: 'float' },
		{ name: 'fromMin', type: 'float' },
		{ name: 'fromMax', type: 'float' },
		{ name: 'toMin', type: 'float' },
		{ name: 'toMax', type: 'float' },
	]
} );

// simple vector noise, vec3->float[-1,1]
const vnoise = Fn( ([ v ])=>{

	return v.dot( vec3( 12.9898, 78.233, -97.5123 ) ).sin().mul( 43758.5453 ).fract().mul( 2 ).sub( 1 );

} );

vnoise.setLayout( {
	name: 'vnoise',
	type: 'float',
	inputs: [
		{ name: 'v', type: 'vec3' },
	]
} );

// generate X-rotation matrix
const matRotX = Fn( ([ angle ])=>{

	var	cos = angle.cos().toVar(),
		sin = angle.sin().toVar();

	return mat4(
		1, 0, 0, 0,
		0, cos, sin, 0,
		0, sin.negate(), cos, 0,
		0, 0, 0, 1 );

} );

matRotX.setLayout( {
	name: 'matRotX',
	type: 'mat4',
	inputs: [
		{ name: 'angle', type: 'float' },
	]
} );

// generate Y-rotation matrix
const matRotY = Fn( ([ angle ])=>{

	var	cos = angle.cos().toVar(),
		sin = angle.sin().toVar();

	return mat4(
		cos, 0, sin.negate(), 0,
		0, 1, 0, 0,
		sin, 0, cos, 0,
		0, 0, 0, 1 );

} );

matRotY.setLayout( {
	name: 'matRotY',
	type: 'mat4',
	inputs: [
		{ name: 'angle', type: 'float' },
	]
} );

// generate Z-rotation matrix
const matRotZ = Fn( ([ angle ])=>{

	var	cos = angle.cos().toVar(),
		sin = angle.sin().toVar();

	return mat4(
		cos, sin, 0, 0,
		sin.negate(), cos, 0, 0,
		0, 0, 1, 0,
		0, 0, 0, 1 );

} );

matRotZ.setLayout( {
	name: 'matRotZ',
	type: 'mat4',
	inputs: [
		{ name: 'angle', type: 'float' },
	]
} );

// generate YXZ Euler rotation matrix
const matRotYXZ = Fn( ([ angles ])=>{

	return matRotY( angles.y ).mul( matRotX( angles.x ) ).mul( matRotZ( angles.z ) );

} );

matRotYXZ.setLayout( {
	name: 'matRotYXZ',
	type: 'mat4',
	inputs: [
		{ name: 'angles', type: 'vec3' },
	]
} );

// generate scaling matrix
const matScale = Fn( ([ scales ])=>{

	return mat4(
		scales.x, 0, 0, 0,
		0, scales.y, 0, 0,
		0, 0, scales.z, 0,
		0, 0, 0, 1 );

} );

matScale.setLayout( {
	name: 'matScale',
	type: 'mat4',
	inputs: [
		{ name: 'scales', type: 'vec3' },
	]
} );

// generate translation matrix
const matTrans = Fn( ([ vector ])=>{

	return mat4(
		1, 0, 0, 0,
		0, 1, 0, 0,
		0, 0, 1, 0,
		vector.x, vector.y, vector.z, 1 );

} );

matTrans.setLayout( {
	name: 'matTrans',
	type: 'mat4',
	inputs: [
		{ name: 'vector', type: 'vec3' },
	]
} );

const selectPlanar = Fn( ([ pos, selAngles, selCenter, selWidth ])=>{

	// select zone in a plane through point selCenter,
	// rotated according to selAngles and selWidth thick
	// result is [0,1] inside plane, 0 below plane, 1 above plane

	// C is projected on segment AB
	// result is [0,1] inside AB, 0 before A, 1 after B

	var T = matTrans( selCenter.negate() );
	var R = matRotYXZ( selAngles );

	var localPos = R.mul( T ).mul( vec4( pos, 1 ) ).xyz;

	return smoothstep( selWidth.negate(), selWidth, localPos.z );

} );

selectPlanar.setLayout( {
	name: 'selectPlanar',
	type: 'float',
	inputs: [
		{ name: 'pos', type: 'vec3' },
		{ name: 'selAngles', type: 'vec3' },
		{ name: 'selCenter', type: 'vec3' },
		{ name: 'selWidth', type: 'float' },
	]
} );

const overlayPlanar = Fn( ([ pos, selAngles, selCenter, selWidth, overlay ])=>{

	var k = selectPlanar( pos, selAngles, selCenter, selWidth );

	return k.oneMinus().mul( pos ).add( k.mul( overlay ) );

} );

overlayPlanar.setLayout( {
	name: 'overlayPlanar',
	type: 'vec3',
	inputs: [
		{ name: 'pos', type: 'vec3' },
		{ name: 'selAngles', type: 'vec3' },
		{ name: 'selCenter', type: 'vec3' },
		{ name: 'selWidth', type: 'float' },
		{ name: 'overlay', type: 'vec3' },
	]
} );

// fallback warning system
var banner = null;
var bannerCounter = 0;

function showFallbackWarning( ) {

	if ( !banner ) {

		banner = document.createElement( 'div' );
		banner.innerHTML = '<p>This page is using WebGPU with fallback to WebGL.<br>Click on this banner to hide it.</p>';
		banner.style.cssText = 'position:fixed; top:20px; left:20px; right:20px; z-index:1000; background:yellow; color:black; text-align:center; padding:10px; border:2px solid red; border-radius:10px; font-family:monospace; cursor:pointer;';
		banner.addEventListener( 'click', hideFallbackWarning );
		document.body.appendChild( banner );

	}

	bannerCounter = 2;

}

function hideFallbackWarning( ) {

	if ( banner ) {

		if ( bannerCounter>0 )
			bannerCounter--;
		else {

			banner.style.display = 'none';
			banner = null;

		}

	}

}

// normal vector calculation
const normalVector = Fn( ([ pos ]) => {

	const eps = 0.001;
	
	const dx = dFdx( pos );
	const dy = dFdy( pos );
	const normal = cross( dx, dy ).normalize();
	
	return transformNormalToView( normal );

} );

normalVector.setLayout( {
	name: 'normalVector',
	type: 'vec3',
	inputs: [
		{ name: 'pos', type: 'vec3' },
	]
} );

// converts all numeric, color and vector properties to nodes
function prepare( userParams, defaults ) {

	var propertyNames = [];
	for ( var item of userParams ) {

	  if ( item && typeof item === 'object' ) {

			propertyNames = Object.keys( item );
			break;

		}

	}

	var params = { ...defaults };

	for ( var key of propertyNames ) {

		if ( typeof userParams[ key ] !== 'undefined' )
			params[ key ] = userParams[ key ];

	}

	for ( var name of Object.keys( params ) ) {

		if ( typeof params[ name ] === 'number' )
			params[ name ] = float( params[ name ]);
		else
			if ( params[ name ] instanceof Color )
				params[ name ] = vec3( params[ name ].r, params[ name ].g, params[ name ].b );
			else
				if ( params[ name ] instanceof Vector3 )
					params[ name ] = vec3( params[ name ].x, params[ name ].y, params[ name ].z );

	}

	return params;

}

// generate scaled noise
function noised( pos, scale=1, octave=1, seed=0 ) {

	return mx_noise_float( pos.mul( scale, octave ).add( seed ) );

}

// TSL Function wrapper with proxy for compatibility
function TSLFn( jsFunc, defaults, layout = null ) {

	var opacity = null;
	var roughness = null;
	var normal = null;

	const fn = Fn( jsFunc, layout );
	const customProps = new Map();
	customProps.set( 'defaults', defaults );
	customProps.set( 'opacity', opacity );
	customProps.set( 'roughness', roughness );
	customProps.set( 'normal', normal );

	// Create a target with FnNode prototype to mimic TSL.Fn
	const target = function () {};

	Object.setPrototypeOf( target, Object.getPrototypeOf( fn.call ) ); // Inherit FnNode prototype

	return new Proxy( target, {
		get( target, prop, receiver ) {

			if ( prop === 'defaults' ) {

				return customProps.get( 'defaults' );

			}

			if ( prop === 'opacity' ) {

				return customProps.get( 'opacity' );

			}

			if ( prop === 'roughness' ) {

				return customProps.get( 'roughness' );

			}

			if ( prop === 'normal' ) {

				return customProps.get( 'normal' );

			}

			if ( prop === 'fn' ) {

				return fn; // Expose original TSL.Fn Proxy

			}

			return Reflect.get( fn, prop, receiver ); // Forward to original Proxy

		},

		set( target, prop, value, receiver ) {

			if ( prop === 'defaults' ) {

				customProps.set( 'defaults', value );
				return true;

			}

			if ( prop === 'opacity' ) {

				customProps.set( 'opacity', value );
				return true;

			}

			if ( prop === 'roughness' ) {

				customProps.set( 'roughness', value );
				return true;

			}

			if ( prop === 'normal' ) {

				customProps.set( 'normal', value );
				return true;

			}

			return Reflect.set( fn, prop, value, receiver );

		},

		apply( target, thisArg, args ) {

			return Reflect.apply( fn, thisArg, args ); // Delegate calls to original Proxy

		},

		getOwnPropertyDescriptor( target, prop ) {

			if ( prop === 'defaults' ) {

				return {
					value: customProps.get( 'defaults' ),
					writable: true,
					enumerable: true,
					configurable: true,
				};

			}

			if ( prop === 'opacity' ) {

				Reflect.getOwnPropertyDescriptor( opacity, prop );

			}

			if ( prop === 'roughness' ) {

				Reflect.getOwnPropertyDescriptor( roughness, prop );

			}

			if ( prop === 'normal' ) {

				Reflect.getOwnPropertyDescriptor( normal, prop );

			}

			return Reflect.getOwnPropertyDescriptor( fn, prop );

		}
	} );

} // TSLFn

export {
	mx_noise_float as noise
} from 'three/tsl';

export {
	noised,
	vnoise,
	hsl,
	toHsl,
	dynamic,
	spherical,
	applyEuler,
	remapExp,
	matRotX,
	matRotY,
	matRotZ,
	matRotYXZ,
	matTrans,
	matScale,
	selectPlanar,
	overlayPlanar,
	showFallbackWarning,
	hideFallbackWarning,
	normalVector,
	prepare,
	TSLFn
};
