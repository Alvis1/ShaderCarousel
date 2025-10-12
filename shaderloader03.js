// ShaderLoader03.js - TSL Shader Component for A-Frame WebGPU
// Simple loader for TSL shaders

document.addEventListener('DOMContentLoaded', () => {
    AFRAME.registerComponent('tsl-shader', {
        schema: {
            src: {type: 'string', default: 'polka-dots'},
            count: {type: 'number', default: 2},
            size: {type: 'number', default: 0.5},
            blur: {type: 'number', default: 0.25},
            color: {type: 'color', default: '#000000'},
            background: {type: 'color', default: '#ffffff'},
            roughness: {type: 'number', default: 0.5},
            metalness: {type: 'number', default: 0.0},
            flat: {type: 'number', default: 0},
            seed: {type: 'number', default: 0}
        },
        
        init() {
            this.setupMaterial();
        },
        
        async setupMaterial() {
            const data = this.data;
            
            try {
                let shaderPath, shaderFunctionName;
                
                if (data.src.includes('/') || data.src.endsWith('.js')) {
                    shaderPath = data.src;
                    const filename = data.src.split('/').pop().replace('.js', '');
                    shaderFunctionName = this.kebabToCamel(filename);
                } else {
                    shaderPath = `./tsl/${data.src}.js`;
                    shaderFunctionName = this.kebabToCamel(data.src);
                }
                
                const shaderModule = await import(shaderPath);
                let shaderFunction = shaderModule[shaderFunctionName];
                
                if (!shaderFunction) {
                    const alternatives = [data.src, data.src.toLowerCase(), 'default'];
                    for (const alt of alternatives) {
                        if (shaderModule[alt]) {
                            shaderFunction = shaderModule[alt];
                            break;
                        }
                    }
                }
                
                if (!shaderFunction) {
                    console.error(`Shader function not found: ${shaderFunctionName}`);
                    return;
                }
                
                const material = new THREE.MeshStandardNodeMaterial({
                    roughness: data.roughness,
                    metalness: data.metalness
                });
                
                const shaderParams = {};
                ['count', 'size', 'blur', 'color', 'background', 'flat', 'seed'].forEach(key => {
                    if (data[key] !== undefined) {
                        if (key === 'color' || key === 'background') {
                            shaderParams[key] = new THREE.Color(data[key]);
                        } else {
                            shaderParams[key] = data[key];
                        }
                    }
                });
                
                material.colorNode = shaderFunction(shaderParams);
                this.applyMaterial(material);
                
            } catch (error) {
                console.error('Error loading TSL shader:', error);
            }
        },
        
        applyMaterial(material) {
            const mesh = this.el.getObject3D('mesh');
            if (mesh) {
                mesh.material = material;
                mesh.material.needsUpdate = true;
            } else {
                this.el.addEventListener('object3dset', () => {
                    const newMesh = this.el.getObject3D('mesh');
                    if (newMesh) {
                        newMesh.material = material;
                        newMesh.material.needsUpdate = true;
                    }
                });
            }
        },
        
        kebabToCamel(str) {
            return str.replace(/-([a-z])/g, function (g) { 
                return g[1].toUpperCase(); 
            });
        },
        
        update() {
            this.setupMaterial();
        }
    });
});
