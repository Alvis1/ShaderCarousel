# TSL Shader Carousel

A collection of **Three.js Shading Language (TSL)** procedural textures that work with **A-Frame WebGPU**. Includes 50+ interactive shaders like marble, wood grain, clouds, and animated patterns.

## 🚀 Quick Start

1. **Start the server** (WebGPU requires HTTPS):
   ```bash
   python3 serve.py
   ```

2. **Open in browser**: https://localhost:8443
   - Accept the certificate warning when prompted

3. **Explore the shaders**:
   - Use mouse to navigate the 3D scene
   - Press `N` to cycle through shaders
   - Press `R` to randomize parameters

## ✨ What's Included

- **50+ TSL Shaders**: Procedural materials like marble, wood, clouds, patterns
- **Interactive Demo**: Real-time shader switching and parameter control  
- **A-Frame Integration**: Use TSL shaders as materials in VR/AR scenes
- **WebGPU Support**: Modern GPU-accelerated rendering
## 🎨 Featured Shaders

The `tsl/` directory includes procedural materials like:

| Category | Shaders |
|----------|---------|
| **Patterns** | `polka-dots`, `circles`, `zebra-lines`, `grid` |
| **Textures** | `marble`, `wood`, `concrete`, `rust`, `satin` |
| **Nature** | `clouds`, `water-drops`, `tiger-fur`, `coral` |
| **Abstract** | `voronoi-cells`, `simplex-noise`, `fordite` |

## 🔧 Using TSL Shaders

### In A-Frame Scenes
```html
<a-sphere tsl-shader="shader: marble; color: #ffffff; roughness: 0.8"></a-sphere>
```

### Available Parameters
- `shader` - Shader name (e.g., "marble", "wood")
- `color` - Primary color  
- `size` - Pattern scale
- `count` - Pattern density
- `roughness` / `metalness` - Material properties

## ⚙️ Requirements

- **Modern Browser**: Chrome/Edge (WebGPU enabled), Firefox (enable in about:config)
- **HTTPS**: Required for WebGPU (use included `serve.py`)
- **A-Frame 1.7.0+** with Three.js WebGPU support

## � Troubleshooting

**WebGPU not working?** 
- Enable WebGPU in browser settings
- Ensure you're using HTTPS (run `serve.py`)
- Accept the self-signed certificate

**Shaders not loading?**
- Check browser console for errors
- Ensure TSL files are in `./tsl/` directory
- Verify shader export format

## 📂 Project Structure

```
├── index.html              # Main demo page
├── serve.py               # HTTPS server
├── tsl/                   # TSL shader collection
├── components/three/      # Three.js WebGPU builds
└── shaderloader03.js      # Shader loading utilities
```