// A-Frame TSL Material Component
// This component bridges A-Frame entities with Three.js TSL shaders

AFRAME.registerComponent('tsl-shader', {
    schema: {
        shader: {type: 'string', default: 'polka-dots'},
        count: {type: 'number', default: 2},
        size: {type: 'number', default: 0.5},
        blur: {type: 'number', default: 0.25},
        color: {type: 'color', default: '#000000'},
        background: {type: 'color', default: '#ffffff'},
        roughness: {type: 'number', default: 0.5},
        metalness: {type: 'number', default: 0.0},
        flat: {type: 'number', default: 0}
    },
    
    init: function() {
        this.setupMaterial();
    },
    
    setupMaterial: async function() {
        const data = this.data;
        
        try {
            // Import Three.js WebGPU and TSL
            const THREE = await import('https://unpkg.com/three@0.169.0/build/three.webgpu.js');
            
            // Import the specific TSL shader
            const shaderPath = `./tsl/${data.shader}.js`;
            const shaderModule = await import(shaderPath);
            
            // Get the shader function (convert kebab-case to camelCase)
            const shaderFunctionName = this.kebabToCamel(data.shader);
            const shaderFunction = shaderModule[shaderFunctionName];
            
            if (!shaderFunction) {
                console.warn(`TSL shader function '${shaderFunctionName}' not found in ${data.shader}.js`);
                return;
            }
            
            // Create TSL material
            const material = new THREE.MeshStandardNodeMaterial({
                roughness: data.roughness,
                metalness: data.metalness,
            });
            
            // Configure shader parameters
            const shaderParams = {
                count: data.count,
                size: data.size,
                blur: data.blur,
                color: new THREE.Color(data.color),
                background: new THREE.Color(data.background),
                flat: data.flat
            };
            
            // Apply TSL shader to material's color node
            material.colorNode = shaderFunction(shaderParams);
            
            // Get the mesh and apply material
            const mesh = this.el.getObject3D('mesh');
            if (mesh) {
                mesh.material = material;
                mesh.material.needsUpdate = true;
            } else {
                // If mesh doesn't exist yet, wait for it
                this.el.addEventListener('object3dset', () => {
                    const newMesh = this.el.getObject3D('mesh');
                    if (newMesh) {
                        newMesh.material = material;
                        newMesh.material.needsUpdate = true;
                    }
                });
            }
            
        } catch (error) {
            console.error('Error setting up TSL material:', error);
            console.log('Available shaders should be in ./tsl/ directory');
        }
    },
    
    update: function() {
        // Re-setup material when component data changes
        this.setupMaterial();
    },
    
    kebabToCamel: function(str) {
        return str.replace(/-([a-z])/g, function (g) { 
            return g[1].toUpperCase(); 
        });
    }
});

// Utility function to enable WebGPU in A-Frame
function enableWebGPU() {
    const sceneEl = document.querySelector('a-scene');
    if (sceneEl && !sceneEl.hasAttribute('webgpu')) {
        sceneEl.setAttribute('webgpu', 'true');
        sceneEl.setAttribute('renderer', 'colorManagement: true; antialias: true;');
    }
}

// Enable WebGPU when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', enableWebGPU);
} else {
    enableWebGPU();
}

export { enableWebGPU };