// TSL Shader Registry and Auto-Registration System
// This allows easy addition of new TSL shaders without modification

import { TSLShaderRegistry } from './tsl-shader-loader.js';

// Import TSL shaders
import { camouflage } from './tsl/camouflage.js';
import { stars } from './tsl/stars.js';
import { marble } from './tsl/marble.js';
import { wood } from './tsl/wood.js';

class TSLShaderManager {
    constructor() {
        this.registry = window.TSLShaderRegistry || new TSLShaderRegistry();
        this.autoRegisterShaders();
    }

    // Automatically register all available TSL shaders
    autoRegisterShaders() {
        // Register camouflage shader
        this.registerShader('camouflage', camouflage, camouflage.defaults);
        
        // Register additional shaders
        this.registerShader('stars', stars, stars.defaults);
        this.registerShader('marble', marble, marble.defaults);
        this.registerShader('wood', wood, wood.defaults);
        
        console.log('TSL Shader Manager: Auto-registered shaders:', this.registry.getRegisteredShaders());
    }

    // Register a single shader
    registerShader(name, shaderFunction, defaults) {
        try {
            this.registry.registerShader(name, shaderFunction, defaults);
            console.log(`✓ Registered TSL shader: ${name}`);
        } catch (error) {
            console.error(`✗ Failed to register TSL shader '${name}':`, error);
        }
    }

    // Batch register multiple shaders from an object
    registerShaders(shaderMap) {
        for (const [name, { shader, defaults }] of Object.entries(shaderMap)) {
            this.registerShader(name, shader, defaults);
        }
    }

    // Get list of available shaders
    getAvailableShaders() {
        return this.registry.getRegisteredShaders();
    }

    // Get component name for a shader
    getComponentName(shaderName) {
        return this.registry.getComponentName(shaderName);
    }

    // Add new shader at runtime (useful for dynamically loaded shaders)
    addShader(name, shaderFunction, defaults) {
        this.registerShader(name, shaderFunction, defaults);
        
        // Emit custom event for UI updates if needed
        window.dispatchEvent(new CustomEvent('tsl-shader-added', {
            detail: { name, componentName: this.getComponentName(name) }
        }));
    }

    // Helper to create example HTML for a shader
    generateExampleHTML(shaderName) {
        const componentName = this.getComponentName(shaderName);
        if (!componentName) {
            console.warn(`Shader '${shaderName}' not found`);
            return '';
        }

        const shader = this.registry.shaders.get(shaderName);
        const defaults = shader.defaults;
        
        let attributes = '';
        for (const [key, value] of Object.entries(defaults)) {
            if (key.startsWith('$')) continue; // Skip special keys
            
            if (value && typeof value === 'object' && value.getHexString) {
                // THREE.Color
                attributes += ` ${key}="#${value.getHexString()}"`;
            } else if (typeof value === 'number') {
                attributes += ` ${key}="${value}"`;
            } else if (typeof value === 'boolean') {
                attributes += ` ${key}="${value}"`;
            }
        }

        return `<a-sphere position="0 1.25 -5" radius="1.25" ${componentName}="${attributes.trim()}"></a-sphere>`;
    }

    // Log all registered shaders and their component names
    logRegisteredShaders() {
        console.log('\n=== TSL Shader Registry ===');
        for (const shaderName of this.getAvailableShaders()) {
            const componentName = this.getComponentName(shaderName);
            console.log(`${shaderName} -> ${componentName}`);
        }
        console.log('===========================\n');
    }
}

// Create global instance
const tslShaderManager = new TSLShaderManager();

// Export for use in other modules
export { tslShaderManager, TSLShaderManager };

// Make available globally for console access
window.tslShaderManager = tslShaderManager;