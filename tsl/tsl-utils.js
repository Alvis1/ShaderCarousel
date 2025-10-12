// TSL Utility Functions

import { Fn, vec3, float } from 'three/tsl';

// Helper function to prepare parameters with defaults
export function prepare(params, defaults) {
    if (!params) params = {};
    
    const result = {};
    for (const key in defaults) {
        if (key.startsWith('$')) continue; // Skip special keys like $name
        result[key] = params[key] !== undefined ? params[key] : defaults[key];
    }
    return result;
}

// TSL Function wrapper
export function TSLFn(fn, defaults) {
    return function(params) {
        return fn(params);
    };
}

// Simplex-like noise function using TSL
// This is a simplified procedural noise function
export const noise = Fn(([position, scale = 1.0, offset = 0.0]) => {
    const p = position.mul(scale).add(offset);
    
    // Simple hash-based noise approximation
    const K1 = vec3(0.4, 0.34, 0.65);
    const x = p.dot(K1);
    
    const frac = x.fract();
    const sinVal = frac.mul(43758.5453).sin();
    
    return sinVal;
});
