# TSL Shader Carousel - A-Frame WebGPU

This project demonstrates how to use **Three.js Shading Language (TSL)** textures with **A-Frame WebGPU**.

## 🎯 What This Achieves

- ✅ **TSL Integration**: Use your existing TSL shaders (`polka-dots.js`, `circles.js`, etc.) with A-Frame
- ✅ **WebGPU Support**: Leverages A-Frame 1.7.0+ WebGPU renderer
- ✅ **Dynamic Shaders**: Switch between different TSL textures at runtime
- ✅ **Interactive Controls**: Modify shader parameters dynamically

## 🚀 Quick Start

### 1. Start the HTTPS Server
WebGPU requires HTTPS, so use the included server:

```bash
python3 serve.py
```

### 2. Open in Browser
Navigate to:
- **Full Showcase**: https://localhost:8443/tsl-showcase.html
- **Simple Example**: https://localhost:8443/simple-tsl-example.html

### 3. Trust the Certificate
Your browser will warn about the self-signed certificate - click "Advanced" and "Proceed to localhost" to continue.

## 📁 Files Overview

| File | Description |
|------|-------------|
| `tsl-showcase.html` | **Main demo** - Interactive TSL shader carousel |
| `simple-tsl-example.html` | Basic A-Frame + TSL example |
| `index-webgpu-tsl.html` | Advanced implementation |
| `aframe-tsl-component.js` | Reusable A-Frame component for TSL |
| `serve.py` | HTTPS server (required for WebGPU) |

## 🎨 Available TSL Shaders

Your `tsl/` directory contains many shaders that work with this setup:

- `polka-dots.js` - Polka dot patterns
- `circles.js` - Circular patterns  
- `zebra-lines.js` - Stripe patterns
- `tiger-fur.js` - Tiger fur texture
- `marble.js` - Marble textures
- `wood.js` - Wood grain
- `clouds.js` - Cloud formations
- And many more...

## 🔧 How It Works

### A-Frame TSL Component
The custom `tsl-shader` component bridges A-Frame and TSL:

```html
<a-sphere 
    tsl-shader="shader: polka-dots; count: 3; size: 0.6; color: #ff0000">
</a-sphere>
```

### Parameters
- `shader`: TSL shader name (matches filename without .js)
- `count`: Pattern count/frequency
- `size`: Pattern size
- `blur`: Edge blur amount  
- `color`: Primary color
- `background`: Background color
- `roughness`: Material roughness
- `metalness`: Material metallic property

### Dynamic Updates
Change shaders at runtime:

```javascript
// Switch shader
element.setAttribute('tsl-shader', 'shader', 'marble');

// Update parameters
element.setAttribute('tsl-shader', {
    count: 5,
    size: 0.8,
    color: '#ff0000'
});
```

## 🎮 Interactive Features

In `tsl-showcase.html`:
- **Next Shader**: Cycle through available TSL shaders
- **Randomize**: Generate random shader parameters
- **Mouse/WASD**: Navigate the 3D scene

## ⚙️ Technical Requirements

### Browser Support
- **Chrome/Edge**: WebGPU enabled by default (recent versions)
- **Firefox**: Enable `dom.webgpu.enabled` in `about:config`
- **Safari**: WebGPU support varies by version

### A-Frame Requirements
- A-Frame 1.7.0+ (includes WebGPU support)
- Three.js 0.169.0+ WebGPU build
- HTTPS connection (required for WebGPU)

### TSL Shader Compatibility
Your existing TSL shaders should work with minimal modifications:

1. **Export Format**: Ensure shaders export their main function
2. **Parameter Structure**: Use the `defaults` object pattern
3. **Three.js WebGPU**: Import from `three/webgpu` build

## 🔍 Troubleshooting

### WebGPU Not Working?
1. **Check Browser Support**: Ensure WebGPU is enabled
2. **HTTPS Required**: Must serve over HTTPS (use `serve.py`)  
3. **Certificate Warnings**: Accept the self-signed certificate
4. **Console Errors**: Check browser dev tools for specific errors

### Shader Not Loading?
1. **File Path**: Ensure TSL files are in `./tsl/` directory
2. **Export Name**: Function name should match filename (camelCase)
3. **Import Syntax**: Check the import/export statements
4. **Browser Console**: Look for import errors

### Performance Issues?
1. **Reduce Detail**: Lower geometry detail level
2. **Simplify Shaders**: Some TSL shaders are computationally heavy
3. **Device Limits**: WebGPU performance varies by hardware

## 🛠️ Customization

### Adding New Shaders
1. Create your TSL shader in `tsl/your-shader.js`
2. Add to the SHADERS array in `tsl-showcase.html`
3. Use in HTML: `tsl-shader="shader: your-shader"`

### Custom Component
For more control, extend the `tsl-shader` component:

```javascript
AFRAME.registerComponent('my-tsl-material', {
    // Your custom TSL implementation
});
```

## 📚 Resources

- [A-Frame WebGPU Documentation](https://aframe.io/docs/1.7.0/introduction/webgpu.html)
- [Three.js TSL Guide](https://threejs.org/docs/#manual/en/introduction/Three.js-Shading-Language)
- [WebGPU Browser Support](https://caniuse.com/webgpu)

## 🎉 Result

You now have a fully functional A-Frame WebGPU scene that can use your TSL shader collection! The shaders render as procedural materials on 3D objects with real-time parameter control.

**Yes, TSL textures absolutely work with A-Frame** - this implementation proves it! 🚀