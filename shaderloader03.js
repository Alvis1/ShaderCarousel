// ShaderLoader03.js - TSL Shader Component for A-Frame WebGPU
// Simple loader for TSL shaders

document.addEventListener('DOMContentLoaded', () => {
    AFRAME.registerComponent('tsl-shader', {
        schema: {
            type: 'string'
        },
        
        multiple: true,
        
        init() {
            this.setupMaterial();
        },
        
        async setupMaterial() {
            const attrValue = this.el.getAttribute('tsl-shader');
            
            // Parse the attribute string manually
            const params = {};
            if (typeof attrValue === 'string') {
                const pairs = attrValue.split(';').map(s => s.trim()).filter(s => s);
                pairs.forEach(pair => {
                    const [key, ...valueParts] = pair.split(':');
                    const value = valueParts.join(':').trim();
                    if (key && value) {
                        params[key.trim()] = value;
                    }
                });
            }
            
            const src = params.src || 'polka-dots';
            const roughness = parseFloat(params.roughness) || 0.5;
            const metalness = parseFloat(params.metalness) || 0.0;
            
            try {
                let shaderPath, shaderFunctionName;
                
                if (src.includes('/') || src.endsWith('.js')) {
                    shaderPath = src;
                    const filename = src.split('/').pop().replace('.js', '');
                    shaderFunctionName = this.kebabToCamel(filename);
                } else {
                    shaderPath = `./tsl/${src}.js`;
                    shaderFunctionName = this.kebabToCamel(src);
                }
                
                const shaderModule = await import(shaderPath);
                let shaderFunction = shaderModule[shaderFunctionName];
                
                if (!shaderFunction) {
                    const alternatives = [src, src.toLowerCase(), 'default'];
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
                    roughness: roughness,
                    metalness: metalness
                });
                
                // Pass all parameters except src, roughness, metalness to the shader
                const shaderParams = {};
                Object.keys(params).forEach(key => {
                    if (key !== 'src' && key !== 'roughness' && key !== 'metalness') {
                        const value = params[key];
                        // Try to parse as number
                        const numValue = parseFloat(value);
                        if (!isNaN(numValue) && value.trim() === numValue.toString()) {
                            shaderParams[key] = numValue;
                        } 
                        // Check if it's a color (starts with #)
                        else if (value.startsWith('#')) {
                            shaderParams[key] = new THREE.Color(value);
                        }
                        // Otherwise keep as string
                        else {
                            shaderParams[key] = value;
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
