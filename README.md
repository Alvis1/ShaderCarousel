# TSL Shader Carousel

A complete system for integrating TSL (Three.js Shading Language) shaders from the [tsl-textures](https://github.com/boytchev/tsl-textures) repository into A-Frame scenes without modification.

## Features

✅ **Automatic A-Frame component generation** - TSL shaders become A-Frame components automatically  
✅ **Zero modification required** - Use TSL shaders directly from the repository  
✅ **Type-safe parameter mapping** - Automatic schema generation from shader defaults  
✅ **Error handling** - Graceful fallbacks if shaders fail  
✅ **Runtime shader addition** - Add new shaders dynamically  
✅ **Full compatibility** - Works with all tsl-textures repository shaders  

## Quick Start

1. **Include the system in your HTML:**
```html
<script src="aframe170.min.js"></script>
<script type="module" src="tsl-shader-registry.js"></script>
```

2. **Use TSL shaders as A-Frame components:**
```html
<a-sphere camouflage-material="scale: 2; colorA: #c2bea8"></a-sphere>
<a-box stars-material="density: 2; color: #fff5f0"></a-box>
<a-plane marble-material="turbulence: 0.5; veins: 4"></a-plane>
```

## Adding New Shaders

To add a new TSL shader from the repository:

1. **Create the shader file** (e.g., `tsl/newshader.js`):
```javascript
import { prepare, TSLFn } from './tsl-utils.js';
// ... shader implementation from tsl-textures repo
export { newshader };
```

2. **Register in `tsl-shader-registry.js`:**
```javascript
import { newshader } from './tsl/newshader.js';
// In autoRegisterShaders():
this.registerShader('newshader', newshader, newshader.defaults);
```

That's it! The shader is now available as `newshader-material` component.

## System Architecture

### Core Components

1. **`tsl-shader-loader.js`** - Generic A-Frame component factory
2. **`tsl-shader-registry.js`** - Shader registration and management
3. **`tsl/tsl-utils.js`** - Compatible utility functions
4. **Individual shader files** - Direct from tsl-textures repository

### Component Generation

The system automatically:
- Analyzes shader `defaults` to generate A-Frame schema
- Converts colors, numbers, and vectors to appropriate types
- Creates component lifecycle methods (init, update, remove)
- Handles material creation and application
- Provides error recovery with fallback materials

### Parameter Mapping

| Shader Type | A-Frame Type | Example |
|-------------|--------------|---------|
| `THREE.Color` | `color` | `colorA: "#ff0000"` |
| `number` | `number` | `scale: 2.5` |
| `boolean` | `boolean` | `flat: true` |
| `Vector3` | `vec3` | `position: "1 2 3"` |

## Available Shaders

Currently registered shaders:

- **`camouflage-material`** - Military camouflage pattern
- **`stars-material`** - Starfield texture
- **`marble-material`** - Marble stone texture  
- **`wood-material`** - Wood grain pattern

## Browser Console

Access the shader manager in console:
```javascript
// List all registered shaders
tslShaderManager.getAvailableShaders()

// Get component name for a shader
tslShaderManager.getComponentName('camouflage')

// Generate example HTML
tslShaderManager.generateExampleHTML('stars')

// Log all registered shaders
tslShaderManager.logRegisteredShaders()
```

## Performance Notes

- TSL shaders run on GPU for optimal performance
- Compatible with WebGPU and WebGL backends
- Automatic fallback to simple materials on error
- Memory efficient component reuse

## Compatibility

- ✅ A-Frame 1.7.0+
- ✅ Three.js r175+ (WebGPU build)
- ✅ All modern browsers with WebGPU support
- ✅ WebGL fallback support
- ✅ VR/AR compatible

## File Structure

```
ShaderCarousel/
├── index.html                 # Demo scene
├── aframe170.min.js          # A-Frame framework
├── tsl-shader-loader.js      # Core component system
├── tsl-shader-registry.js    # Shader management
└── tsl/
    ├── tsl-utils.js          # Utility functions
    ├── camouflage.js         # TSL shader
    ├── stars.js              # TSL shader
    ├── marble.js             # TSL shader
    └── wood.js               # TSL shader
```

## License

This system is designed to work with shaders from the [tsl-textures](https://github.com/boytchev/tsl-textures) repository. Please respect the licensing terms of that project.