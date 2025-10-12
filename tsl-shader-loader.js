// Generic TSL Shader Loader for A-Frame
// This system allows any TSL shader from tsl-textures to be used without modification

import * as THREE from 'three/webgpu';

class TSLShaderRegistry {
    constructor() {
        this.shaders = new Map();
        this.components = new Map();
    }

    // Register a TSL shader with its metadata
    registerShader(name, shaderFunction, defaults = {}) {
        this.shaders.set(name, {
            function: shaderFunction,
            defaults: defaults,
            name: name
        });

        // Auto-register A-Frame component
        this.createAFrameComponent(name);
    }

    // Create A-Frame component for a TSL shader
    createAFrameComponent(shaderName) {
        const shader = this.shaders.get(shaderName);
        if (!shader) {
            console.warn(`Shader ${shaderName} not found in registry`);
            return;
        }

        const componentName = `${shaderName.toLowerCase().replace(/([A-Z])/g, '-$1')}-material`;
        
        // Build schema from shader defaults
        const schema = this.buildSchemaFromDefaults(shader.defaults);

        const componentDefinition = {
            schema: schema,

            init: function() {
                // Wait for the mesh to be created
                this.el.addEventListener('object3dset', (evt) => {
                    if (evt.detail.type === 'mesh') {
                        this.applyMaterial();
                    }
                });
                
                // If mesh already exists, apply immediately
                if (this.el.getObject3D('mesh')) {
                    this.applyMaterial();
                }
            },

            update: function(oldData) {
                // Only update if data has changed
                if (Object.keys(oldData).length > 0) {
                    this.applyMaterial();
                }
            },

            applyMaterial: function() {
                const mesh = this.el.getObject3D('mesh');
                if (!mesh) {
                    console.warn(`No mesh found on entity for ${componentName}`);
                    return;
                }

                try {
                    // Create parameters object from component data
                    const params = this.buildShaderParams();

                    // Create node material with TSL shader
                    const material = new THREE.MeshBasicNodeMaterial();
                    material.colorNode = shader.function(params);

                    // Apply material to mesh
                    mesh.material = material;
                    mesh.material.needsUpdate = true;
                    
                    console.log(`${shader.name} material applied successfully`);
                } catch (error) {
                    console.error(`Error applying ${shader.name} material:`, error);
                    
                    // Fallback to a simple colored material
                    const fallbackColor = this.getFallbackColor();
                    const fallbackMaterial = new THREE.MeshBasicMaterial({
                        color: fallbackColor
                    });
                    mesh.material = fallbackMaterial;
                }
            },

            buildShaderParams: function() {
                const params = {};
                
                // Convert A-Frame component data to shader parameters
                for (const [key, value] of Object.entries(this.data)) {
                    // Handle different data types
                    if (typeof value === 'string' && value.startsWith('#')) {
                        // Color value
                        params[key] = new THREE.Color(value);
                    } else if (typeof value === 'number') {
                        params[key] = value;
                    } else if (typeof value === 'boolean') {
                        params[key] = value;
                    } else {
                        params[key] = value;
                    }
                }

                return params;
            },

            getFallbackColor: function() {
                // Try to find a color in the data to use as fallback
                for (const [key, value] of Object.entries(this.data)) {
                    if (typeof value === 'string' && value.startsWith('#')) {
                        return new THREE.Color(value);
                    }
                }
                return new THREE.Color(0x888888); // Default gray
            },

            remove: function() {
                const mesh = this.el.getObject3D('mesh');
                if (mesh && mesh.material) {
                    mesh.material.dispose();
                }
            }
        };

        // Register the A-Frame component
        if (typeof AFRAME !== 'undefined') {
            AFRAME.registerComponent(componentName, componentDefinition);
            this.components.set(shaderName, componentName);
            console.log(`Registered A-Frame component: ${componentName}`);
        } else {
            console.warn('AFRAME not available, component not registered');
        }
    }

    // Build A-Frame schema from shader defaults
    buildSchemaFromDefaults(defaults) {
        const schema = {};

        for (const [key, value] of Object.entries(defaults)) {
            // Skip special keys like $name
            if (key.startsWith('$')) continue;

            // Determine schema type based on value type
            if (value instanceof THREE.Color) {
                schema[key] = { 
                    type: 'color', 
                    default: `#${value.getHexString()}` 
                };
            } else if (typeof value === 'number') {
                schema[key] = { 
                    type: 'number', 
                    default: value 
                };
            } else if (typeof value === 'boolean') {
                schema[key] = { 
                    type: 'boolean', 
                    default: value 
                };
            } else {
                // Default to string for unknown types
                schema[key] = { 
                    type: 'string', 
                    default: String(value) 
                };
            }
        }

        return schema;
    }

    // Get list of registered shaders
    getRegisteredShaders() {
        return Array.from(this.shaders.keys());
    }

    // Get component name for a shader
    getComponentName(shaderName) {
        return this.components.get(shaderName);
    }
}

// Create global registry instance
window.TSLShaderRegistry = new TSLShaderRegistry();

export { TSLShaderRegistry };