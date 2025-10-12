/**
 * Universal TSL Shader Component for A-Frame WebGPU
 * 
 * Usage examples:
 * 
 * <!-- Using shader name (loads from ./tsl/ directory) -->
 * <a-sphere tsl-shader="src: marble; count: 2; size: 0.5; color: #ff0000"></a-sphere>
 * 
 * <!-- Using full path -->
 * <a-box tsl-shader="src: ./tsl/polka-dots.js; count: 4; blur: 0.3"></a-box>
 * 
 * <!-- Using relative path -->
 * <a-plane tsl-shader="src: ../shaders/custom-shader.js; size: 0.8"></a-plane>
 */

// Wait for A-Frame to be available
function registerTSLComponent() {
    if (typeof AFRAME === 'undefined') {
        console.warn('[TSL Shader] A-Frame not yet available, waiting...');
        setTimeout(registerTSLComponent, 100);
        return;
    }

    AFRAME.registerComponent('tsl-shader', {
    schema: {
        // Shader source - can be shader name or full/relative path to .js file
        src: {type: 'string', default: 'polka-dots'},
        
        // Common TSL shader parameters
        count: {type: 'number', default: 2},
        size: {type: 'number', default: 0.5},
        blur: {type: 'number', default: 0.25},
        color: {type: 'color', default: '#000000'},
        background: {type: 'color', default: '#ffffff'},
        
        // Material properties
        roughness: {type: 'number', default: 0.5},
        metalness: {type: 'number', default: 0.0},
        
        // Additional shader-specific parameters
        flat: {type: 'number', default: 0},
        seed: {type: 'number', default: 0},
        
        // Debug mode
        debug: {type: 'boolean', default: false}
    },
    
    init() {
        this.setupMaterial();
    },
    
    async setupMaterial() {
        const data = this.data;
        
        try {
            let shaderPath, shaderFunctionName, shaderFunction;
            
            // Determine shader path and function name
            if (data.src.includes('/') || data.src.endsWith('.js')) {
                // Full or relative path provided
                shaderPath = data.src;
                // Extract function name from filename (convert kebab-case to camelCase)
                const filename = data.src.split('/').pop().replace('.js', '');
                shaderFunctionName = this.kebabToCamel(filename);
            } else {
                // Just shader name provided - load from tsl directory
                shaderPath = `./tsl/${data.src}.js`;
                shaderFunctionName = this.kebabToCamel(data.src);
            }
            
            if (data.debug) {
                console.log(`[TSL Shader] Loading: ${shaderPath} -> ${shaderFunctionName}`);
            }
            
            // Import the shader module
            const shaderModule = await import(shaderPath);
            shaderFunction = shaderModule[shaderFunctionName];
            
            if (!shaderFunction) {
                console.error(`[TSL Shader] Function '${shaderFunctionName}' not found in ${shaderPath}`);
                console.log('[TSL Shader] Available exports:', Object.keys(shaderModule));
                
                // Try common alternative names
                const alternatives = [
                    data.src,
                    data.src.toLowerCase(),
                    this.kebabToCamel(data.src.replace(/-/g, '_')),
                    'default'
                ];
                
                for (const alt of alternatives) {
                    if (shaderModule[alt]) {
                        shaderFunction = shaderModule[alt];
                        console.log(`[TSL Shader] Found function using alternative name: ${alt}`);
                        break;
                    }
                }
                
                if (!shaderFunction) {
                    console.error('[TSL Shader] Could not resolve shader function');
                    return;
                }
            }
            
            // Create TSL material
            const material = new THREE.MeshStandardNodeMaterial({
                roughness: data.roughness,
                metalness: data.metalness
            });
            
            // Prepare shader parameters (only include defined/non-default values)
            const shaderParams = {};
            const paramKeys = ['count', 'size', 'blur', 'color', 'background', 'flat', 'seed'];
            
            paramKeys.forEach(key => {
                const value = data[key];
                if (value !== undefined) {
                    if (key === 'color' || key === 'background') {
                        shaderParams[key] = new THREE.Color(value);
                    } else {
                        shaderParams[key] = value;
                    }
                }
            });
            
            if (data.debug) {
                console.log('[TSL Shader] Parameters:', shaderParams);
            }
            
            // Apply TSL shader with parameters
            material.colorNode = shaderFunction(shaderParams);
            
            // Apply to mesh
            this.applyMaterial(material);
            
            if (data.debug) {
                console.log('[TSL Shader] Material applied successfully');
            }
            
        } catch (error) {
            console.error('[TSL Shader] Error setting up material:', error);
            console.error('[TSL Shader] Stack trace:', error.stack);
            
            // Fallback to basic material
            this.applyFallbackMaterial();
        }
    },
    
    applyMaterial(material) {
        const mesh = this.el.getObject3D('mesh');
        if (mesh) {
            mesh.material = material;
            mesh.material.needsUpdate = true;
        } else {
            // Wait for mesh to be created
            this.el.addEventListener('object3dset', () => {
                const newMesh = this.el.getObject3D('mesh');
                if (newMesh) {
                    newMesh.material = material;
                    newMesh.material.needsUpdate = true;
                }
            });
        }
    },
    
    applyFallbackMaterial() {
        const fallbackMaterial = new THREE.MeshStandardMaterial({
            color: this.data.color,
            roughness: this.data.roughness,
            metalness: this.data.metalness
        });
        
        this.applyMaterial(fallbackMaterial);
        console.warn('[TSL Shader] Applied fallback material');
    },
    
    kebabToCamel(str) {
        return str.replace(/-([a-z])/g, function (g) { 
            return g[1].toUpperCase(); 
        });
    },
    
    update() {
        // Re-setup material when component data changes
        this.setupMaterial();
    },
    
    remove() {
        // Clean up material when component is removed
        const mesh = this.el.getObject3D('mesh');
        if (mesh && mesh.material) {
            if (mesh.material.dispose) {
                mesh.material.dispose();
            }
        }
    }
});

        }
    });
}

// Start the registration process
registerTSLComponent();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AFRAME.components['tsl-shader'];
}