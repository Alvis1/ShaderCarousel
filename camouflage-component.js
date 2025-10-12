// A-Frame component for applying TSL camouflage material

import * as THREE from 'three/webgpu';
import { camouflage } from './tsl/camouflage.js';

AFRAME.registerComponent('camouflage-material', {
    schema: {
        scale: { type: 'number', default: 2 },
        colorA: { type: 'color', default: '#c2bea8' },
        colorB: { type: 'color', default: '#9c895e' },
        colorC: { type: 'color', default: '#92a375' },
        colorD: { type: 'color', default: '#717561' },
        seed: { type: 'number', default: 0 }
    },

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
            console.warn('No mesh found on entity');
            return;
        }

        try {
            // Create parameters object for camouflage function
            const params = {
                scale: this.data.scale,
                colorA: new THREE.Color(this.data.colorA),
                colorB: new THREE.Color(this.data.colorB),
                colorC: new THREE.Color(this.data.colorC),
                colorD: new THREE.Color(this.data.colorD),
                seed: this.data.seed
            };

            // Create node material with camouflage shader
            const material = new THREE.MeshBasicNodeMaterial();
            material.colorNode = camouflage(params);

            // Apply material to mesh
            mesh.material = material;
            mesh.material.needsUpdate = true;
            
            console.log('Camouflage material applied successfully');
        } catch (error) {
            console.error('Error applying camouflage material:', error);
            
            // Fallback to a simple colored material
            const fallbackMaterial = new THREE.MeshBasicMaterial({
                color: new THREE.Color(this.data.colorA)
            });
            mesh.material = fallbackMaterial;
        }
    },

    remove: function() {
        const mesh = this.el.getObject3D('mesh');
        if (mesh && mesh.material) {
            mesh.material.dispose();
        }
    }
});
