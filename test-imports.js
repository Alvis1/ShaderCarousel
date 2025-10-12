// Test imports to see what's available

console.log('Testing imports...');

try {
    // Try importing from three/webgpu
    import('three/webgpu').then(module => {
        console.log('three/webgpu exports:', Object.keys(module));
        console.log('Has Fn?', 'Fn' in module);
        console.log('Has vec3?', 'vec3' in module);
        console.log('Has float?', 'float' in module);
        console.log('Has MeshBasicNodeMaterial?', 'MeshBasicNodeMaterial' in module);
    }).catch(err => {
        console.error('Failed to import three/webgpu:', err);
    });
} catch (err) {
    console.error('Error:', err);
}
