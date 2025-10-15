class VRProfiler {
    constructor() {
        this.lastTime = performance.now();
        this.frameTime = 0;
        this.fps = 0;
        this.meshCount = 0;
        this.performanceData = [];
        this.logInterval = null;
        this.carouselStoppedCheckInterval = null;
        this.cycleCheckInterval = null;
        this.downloadProposed = false;
        this.meshCountTimer = null;
        this.lastShaderName = null;
        this.lastShaderParams = null;
        
        // Scale cycling properties
        this.scales = [1, 3, 6, 10];
        this.currentScaleIndex = 0;
        this.currentScale = this.scales[0];
        this.completedCycles = 0;
        this.targetCycles = 4;
        this.maxMeshCount = null; // Will be read from carousel properties
        this.meshCountReached = false;
        this.cycleCompleteTimer = null;
        
        // Track all created entities for proper cleanup
        this.trackedEntities = new Set();
        
        // Store original template info (captured once at startup)
        this.originalTemplateInfo = null;
        
        this.createUI();
        this.captureOriginalTemplate();
        this.startProfiling();
        this.startLogging();
        this.startCycleMonitoring();
        this.startEntityTracking();
    }

    captureOriginalTemplate() {
        // Wait for carousel to initialize, then capture the template info
        setTimeout(() => {
            const carousel = document.querySelector('[carousel]');
            if (!carousel) {
                console.warn('Carousel not found, retrying...');
                setTimeout(() => this.captureOriginalTemplate(), 100);
                return;
            }

            // Get the first child - this is the template before any cloning happens
            const template = carousel.querySelector('[tsl-shader]');
            if (template) {
                this.originalTemplateInfo = {
                    tagName: template.tagName.toLowerCase(),
                    radius: template.getAttribute('radius'),
                    shaderAttr: template.getAttribute('tsl-shader')
                };
                console.log('✓ Captured original template info:', this.originalTemplateInfo);
            } else {
                console.error('Could not find template with tsl-shader attribute');
            }
        }, 500);
    }

    startEntityTracking() {
        // Monitor for new entities added to the carousel
        const carouselEntity = document.querySelector('[carousel]');
        if (!carouselEntity) {
            // Retry if carousel not ready yet
            setTimeout(() => this.startEntityTracking(), 100);
            return;
        }

        // Use MutationObserver to track when new children are added
        this.entityObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    // Only track A-Frame entities that are not templates
                    if (node.nodeType === Node.ELEMENT_NODE && 
                        node.tagName && 
                        !node.hasAttribute('tsl-shader')) {
                        this.trackedEntities.add(node);
                    }
                });
            });
        });

        this.entityObserver.observe(carouselEntity, {
            childList: true,
            subtree: false
        });

        console.log('Entity tracking started');
    }

    createUI() {
        this.uiElement = document.createElement('div');
        this.uiElement.id = 'vr-profiler-window';
        this.uiElement.style.position = 'fixed';
        this.uiElement.style.top = '10px';
        this.uiElement.style.right = '10px';
        this.uiElement.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        this.uiElement.style.color = 'white';
        this.uiElement.style.padding = '10px';
        this.uiElement.style.borderRadius = '5px';
        this.uiElement.style.fontFamily = 'monospace';
        this.uiElement.style.fontSize = '12px';
        this.uiElement.style.zIndex = '1000';
        this.uiElement.style.cursor = 'default';
        this.uiElement.style.minWidth = '200px';
        this.uiElement.style.maxWidth = '300px';
        this.uiElement.style.lineHeight = '1.3';
        this.uiElement.innerHTML = 'Time: 0.0s<br>Frame Time: 0.00 ms<br>FPS: 0<br>Meshes: 0';
        document.body.appendChild(this.uiElement);
    }

    startProfiling() {
        const animate = () => {
            const currentTime = performance.now();
            this.frameTime = currentTime - this.lastTime;
            this.lastTime = currentTime;
            this.fps = 1000 / this.frameTime;
            this.updateMeshCount();
            this.updateUI();
            requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
    }

    updateMeshCount() {
        // Cache mesh count and update less frequently (every 1 second)
        if (!this.meshCountTimer || performance.now() - this.meshCountTimer > 1000) {
            this.meshCountTimer = performance.now();
            
            // Find the entity with the carousel component
            const carouselEntity = document.querySelector('[carousel]');
            
            if (carouselEntity && carouselEntity.object3D) {
                // Count only visible meshes in the carousel's object3D
                this.meshCount = 0;
                carouselEntity.object3D.traverse((child) => {
                    // Check if it's a mesh and is visible
                    if ((child.isMesh || child.type === 'Mesh') && child.visible) {
                        // Also check if the parent entity is visible (A-Frame entities have visible attribute)
                        let parentEntity = child.el || child.parent?.el;
                        if (!parentEntity || parentEntity.getAttribute('visible') !== false) {
                            this.meshCount++;
                        }
                    }
                });
            } else {
                // Fallback: count A-Frame mesh entities under carousel entity
                this.meshCount = this.countCarouselA_FrameMeshes();
            }
        }
    }

    getCurrentShaderInfo() {
        const carouselEntity = document.querySelector('[carousel]');
        if (!carouselEntity) {
            return { name: null, params: null };
        }

        // Find the first visible entity with tsl-shader component in the carousel
        const shaderEntities = carouselEntity.querySelectorAll('[tsl-shader]:not([visible="false"])');
        
        if (shaderEntities.length === 0) {
            return { name: null, params: null };
        }

        // Get the first visible shader entity (most recent one added)
        const firstShaderEntity = shaderEntities[0];
        const tslShaderComponent = firstShaderEntity.components['tsl-shader'];
        
        if (!tslShaderComponent) {
            return { name: null, params: null };
        }

        // Parse the shader attribute string
        const attrValue = firstShaderEntity.getAttribute('tsl-shader');
        const parsedParams = {};
        
        if (typeof attrValue === 'string') {
            const pairs = attrValue.split(';').map(s => s.trim()).filter(s => s);
            pairs.forEach(pair => {
                const [key, ...valueParts] = pair.split(':');
                const value = valueParts.join(':').trim();
                if (key && value) {
                    parsedParams[key.trim()] = value;
                }
            });
        }
        
        let shaderName = 'Unknown';
        
        // Extract shader name from src path
        if (parsedParams.src) {
            const pathParts = parsedParams.src.split('/');
            const fileName = pathParts[pathParts.length - 1];
            shaderName = fileName.replace('.js', '').replace(/-/g, ' ');
            // Capitalize first letter of each word
            shaderName = shaderName.split(' ').map(word => 
                word.charAt(0).toUpperCase() + word.slice(1)
            ).join(' ');
        }

        // Extract meaningful parameters (excluding default/empty values)
        const params = {};
        const importantParams = ['count', 'size', 'blur', 'scale', 'roughness', 'metalness', 'speed', 'smooth', 'wave', 'rings', 'fibers'];
        
        for (const param of importantParams) {
            if (parsedParams[param] !== undefined && parsedParams[param] !== '0') {
                params[param] = parsedParams[param];
            }
        }

        // Add color parameters if they're not default
        if (parsedParams.color && parsedParams.color !== '#000000') {
            params.color = parsedParams.color;
        }
        if (parsedParams.background && parsedParams.background !== '#ffffff') {
            params.bg = parsedParams.background;
        }

        return { name: shaderName, params: params };
    }

    getUsedShaders() {
        const shaderUsage = {};
        const shaderDetails = {};
        
        for (const entry of this.performanceData) {
            if (entry.shaderName && entry.shaderName !== null) {
                if (!shaderUsage[entry.shaderName]) {
                    shaderUsage[entry.shaderName] = 0;
                    shaderDetails[entry.shaderName] = entry.shaderParams;
                }
                shaderUsage[entry.shaderName]++;
            }
        }
        
        // Convert to array with usage statistics
        return Object.entries(shaderUsage).map(([name, count]) => ({
            name: name,
            sampleCount: count,
            percentage: parseFloat(((count / this.performanceData.length) * 100).toFixed(1)),
            parameters: shaderDetails[name]
        })).sort((a, b) => b.sampleCount - a.sampleCount);
    }

    destroy() {
        // Clear all intervals
        if (this.logInterval) {
            clearInterval(this.logInterval);
            this.logInterval = null;
        }
        if (this.carouselStoppedCheckInterval) {
            clearInterval(this.carouselStoppedCheckInterval);
            this.carouselStoppedCheckInterval = null;
        }
        if (this.cycleCheckInterval) {
            clearInterval(this.cycleCheckInterval);
            this.cycleCheckInterval = null;
        }
        
        // Clear timeout
        if (this.cycleCompleteTimer) {
            clearTimeout(this.cycleCompleteTimer);
            this.cycleCompleteTimer = null;
        }
        
        // Disconnect entity observer
        if (this.entityObserver) {
            this.entityObserver.disconnect();
            this.entityObserver = null;
        }
        
        // Remove UI element
        if (this.uiElement && this.uiElement.parentNode) {
            this.uiElement.parentNode.removeChild(this.uiElement);
        }
        
        // Clear data
        this.performanceData = [];
        this.trackedEntities.clear();
    }

    countCarouselA_FrameMeshes() {
        // Count visible A-Frame mesh entities specifically under the carousel entity
        const carouselEntity = document.querySelector('[carousel]');
        if (carouselEntity) {
            const meshEntities = carouselEntity.querySelectorAll('a-box:not([visible="false"]), a-sphere:not([visible="false"]), a-cylinder:not([visible="false"]), a-plane:not([visible="false"]), a-circle:not([visible="false"]), a-ring:not([visible="false"]), a-torus:not([visible="false"]), a-cone:not([visible="false"]), a-tetrahedron:not([visible="false"]), a-octahedron:not([visible="false"]), a-dodecahedron:not([visible="false"]), a-icosahedron:not([visible="false"]), a-obj-model:not([visible="false"]), a-gltf-model:not([visible="false"]), [geometry]:not([visible="false"])');
            return meshEntities.length;
        }
        return 0;
    }

    updateUI() {
        const currentTimeSeconds = (performance.now() / 1000).toFixed(1);
        const shaderInfo = this.getCurrentShaderInfo();
        
        // Get current carousel rotation angle
        const carouselEntity = document.querySelector('[carousel]');
        let rotationAngle = null;
        if (carouselEntity && carouselEntity.components && carouselEntity.components.carousel) {
            rotationAngle = carouselEntity.components.carousel.angle % 360;
        }
        
        let displayText = '';
        
        // Shader info at the top
        if (shaderInfo.name) {
            displayText += `Shader: ${shaderInfo.name}<br>`;
            if (shaderInfo.params && Object.keys(shaderInfo.params).length > 0) {
                const paramEntries = Object.entries(shaderInfo.params);
                // Limit to first 3 most important parameters to avoid UI overflow
                const displayParams = paramEntries.slice(0, 3);
                const paramStr = displayParams
                    .map(([key, value]) => {
                        // Format value nicely
                        if (typeof value === 'number') {
                            return `${key}: ${value.toString()}`;
                        } else if (typeof value === 'string' && value.startsWith('#')) {
                            return `${key}: ${value}`;
                        }
                        return `${key}: ${value}`;
                    })
                    .join(', ');
                displayText += `<small>${paramStr}${paramEntries.length > 3 ? '...' : ''}</small><br>`;
            }
            displayText += '<br>'; // Add separator line
        }
        
        // Scale cycling info
        displayText += `<strong>Scale: ${this.currentScale} | Cycle: ${this.completedCycles}/${this.targetCycles}</strong><br><br>`;
        
        // Performance metrics
        displayText += `Time: ${currentTimeSeconds}s<br>Frame Time: ${this.frameTime.toFixed(2)} ms<br>FPS: ${this.fps.toFixed(1)}<br>Meshes: ${this.meshCount}`;
        
        // Show rotation angle and sampling status
        if (rotationAngle !== null) {
            const isAt90 = Math.abs(rotationAngle - 90) < this.angleThreshold;
            const isAt270 = Math.abs(rotationAngle - 270) < this.angleThreshold;
            const sampling = (isAt90 || isAt270) ? ' 🔴' : '';
            displayText += `<br>Angle: ${rotationAngle.toFixed(1)}°${sampling}`;
            displayText += `<br>Samples: ${this.performanceData.length}`;
        }
        
        this.uiElement.innerHTML = displayText;
    }

    startLogging() {
        // Track last logged angle to prevent duplicate samples
        this.lastLoggedAngle = null;
        // Wider threshold to catch fast rotation (520°/sec = 26° per 50ms)
        this.angleThreshold = 30; // Degrees of tolerance for angle detection
        
        this.logInterval = setInterval(() => {
            // Get current carousel rotation angle
            const carouselEntity = document.querySelector('[carousel]');
            if (!carouselEntity || !carouselEntity.components || !carouselEntity.components.carousel) {
                return; // Carousel not ready yet
            }
            
            const carousel = carouselEntity.components.carousel;
            const currentAngle = carousel.angle % 360; // Normalize to 0-359 degrees
            
            // Check if we're at 90 or 270 degrees (with tolerance)
            const isAt90 = Math.abs(currentAngle - 90) < this.angleThreshold;
            const isAt270 = Math.abs(currentAngle - 270) < this.angleThreshold;
            
            // Only log if we're at target angle and haven't logged this angle recently
            if (isAt90 || isAt270) {
                const targetAngle = isAt90 ? 90 : 270;
                
                // Prevent duplicate samples at same angle position
                if (this.lastLoggedAngle === targetAngle) {
                    return;
                }
                
                // Prevent memory leak by limiting array size
                if (this.performanceData.length > 10000) {
                    this.performanceData.shift(); // Remove oldest entry
                }
                
                const timestamp = performance.now();
                const timeSeconds = parseFloat((timestamp / 1000).toFixed(1));
                const shaderInfo = this.getCurrentShaderInfo();
                
                const logEntry = {
                    timeSeconds: timeSeconds,
                    timestampMs: parseFloat(timestamp.toFixed(2)),
                    frameTime: parseFloat(this.frameTime.toFixed(2)),
                    fps: parseFloat(this.fps.toFixed(1)),
                    meshCount: this.meshCount,
                    rotationAngle: targetAngle, // Record which angle we sampled at
                    scale: this.currentScale, // Record the current scale
                    cycleNumber: this.completedCycles
                };

                // Only include shader info if it changed
                if (shaderInfo.name !== this.lastShaderName || 
                    JSON.stringify(shaderInfo.params) !== JSON.stringify(this.lastShaderParams)) {
                    logEntry.shaderName = shaderInfo.name;
                    logEntry.shaderParams = shaderInfo.params;
                    this.lastShaderName = shaderInfo.name;
                    this.lastShaderParams = shaderInfo.params;
                }
                
                this.performanceData.push(logEntry);
                this.lastLoggedAngle = targetAngle;
                
                console.log(`Sample taken at ${targetAngle}° - FPS: ${logEntry.fps}, Scale: ${this.currentScale}, Cycle: ${this.completedCycles}, Shader: ${shaderInfo.name || 'None'}`);
            } else {
                // Reset last logged angle when we're between target angles (at 0° or 180°)
                if (currentAngle < this.angleThreshold || 
                    currentAngle > (360 - this.angleThreshold) ||
                    Math.abs(currentAngle - 180) < this.angleThreshold) {
                    this.lastLoggedAngle = null;
                }
            }
        }, 50); // Check every 50ms to catch fast rotation (520°/sec)
    }

    startCycleMonitoring() {
        this.cycleCheckInterval = setInterval(() => {
            const carouselEntity = document.querySelector('[carousel]');
            if (!carouselEntity || !carouselEntity.components || !carouselEntity.components.carousel) {
                return; // Carousel not ready yet
            }
            
            const carousel = carouselEntity.components.carousel;
            
            // Get maxCount from carousel data if not already retrieved
            if (this.maxMeshCount === null) {
                this.maxMeshCount = carousel.data.maxCount || 5;
                console.log(`Carousel maxCount detected: ${this.maxMeshCount}`);
            }
            
            // Check if we've reached the target mesh count
            if (this.meshCount >= this.maxMeshCount) {
                // If we just reached the count, start the 3-second timer
                if (!this.meshCountReached && !this.cycleCompleteTimer) {
                    this.meshCountReached = true;
                    console.log(`Mesh count reached (${this.meshCount}/${this.maxMeshCount}), waiting 3 seconds before next cycle...`);
                    
                    // Wait 3 seconds before completing the cycle
                    this.cycleCompleteTimer = setTimeout(() => {
                        this.onCycleComplete();
                        this.meshCountReached = false;
                        this.cycleCompleteTimer = null;
                    }, 3000);
                }
            } else {
                // Reset if mesh count drops below max (shouldn't happen, but safety check)
                if (this.meshCountReached) {
                    console.log(`Mesh count dropped below max, resetting timer`);
                    if (this.cycleCompleteTimer) {
                        clearTimeout(this.cycleCompleteTimer);
                        this.cycleCompleteTimer = null;
                    }
                    this.meshCountReached = false;
                }
            }
        }, 100);
    }

    onCycleComplete() {
        this.completedCycles++;
        console.log(`Cycle ${this.completedCycles} completed!`);
        
        // Check if we've completed all target cycles
        if (this.completedCycles >= this.targetCycles) {
            console.log('All 4 cycles completed! Offering download...');
            this.proposeDownload();
        } else {
            // Move to the next scale
            this.currentScaleIndex++;
            if (this.currentScaleIndex < this.scales.length) {
                this.currentScale = this.scales[this.currentScaleIndex];
                console.log(`Changing scale to ${this.currentScale}`);
                
                // Clear existing meshes and recreate with new scale
                this.clearCarouselMeshes(this.currentScale, () => {
                    this.showNotification(`Scale changed to ${this.currentScale}. Restarting carousel...`, 2000);
                });
            }
        }
    }

    clearCarouselMeshes(newScale, callback) {
        const scene = document.querySelector('a-scene');
        const oldCarousel = document.querySelector('[carousel]');
        
        if (!oldCarousel) {
            console.warn('Carousel entity not found');
            if (callback) callback();
            return;
        }

        console.log(`🗑️ Destroying entire carousel entity with ${this.trackedEntities.size} tracked entities`);

        // Store the carousel configuration
        const carouselConfig = oldCarousel.getAttribute('carousel');
        
        // Use the original template info that we captured at startup
        // This ensures we always have the correct template, not a cloned entity
        if (!this.originalTemplateInfo) {
            console.error('Original template info not available! Cannot recreate carousel.');
            if (callback) callback();
            return;
        }

        console.log('Using original template info:', this.originalTemplateInfo);

        // Properly dispose of all Three.js resources in the carousel
        this.disposeEntityTree(oldCarousel);

        // Remove the entire carousel entity from DOM
        oldCarousel.parentNode.removeChild(oldCarousel);
        
        // Clear our tracking
        this.trackedEntities.clear();

        console.log(`✓ Old carousel destroyed and garbage collected`);

        // Wait a bit for cleanup, then recreate the carousel from scratch
        setTimeout(() => {
            console.log(`🔄 Creating fresh carousel entity with scale ${newScale}`);
            
            // Create a brand new carousel entity
            const newCarousel = document.createElement('a-entity');
            
            // Create a completely fresh template using the original template info
            const freshTemplate = document.createElement(this.originalTemplateInfo.tagName);
            freshTemplate.setAttribute('radius', this.originalTemplateInfo.radius);
            
            // Parse the ORIGINAL shader attribute and update scale
            console.log(`Parsing original shader attribute: ${this.originalTemplateInfo.shaderAttr}`);
            const pairs = this.originalTemplateInfo.shaderAttr.split(';').map(s => s.trim()).filter(s => s);
            const params = {};
            
            pairs.forEach(pair => {
                const [key, ...valueParts] = pair.split(':');
                const value = valueParts.join(':').trim();
                if (key && value) {
                    params[key.trim()] = value;
                }
            });
            
            console.log(`Extracted params from original:`, params);
            
            // Update scale to new value
            params.scale = newScale.toString();
            
            console.log(`Updated params with new scale ${newScale}:`, params);
            
            const newShaderAttr = Object.entries(params)
                .map(([key, value]) => `${key}: ${value}`)
                .join('; ');
            
            freshTemplate.setAttribute('tsl-shader', newShaderAttr);
            console.log(`✓ Created fresh template with shader attr: ${newShaderAttr}`);
            
            // Add template to carousel FIRST
            newCarousel.appendChild(freshTemplate);
            
            // NOW set the carousel attribute after template is present
            newCarousel.setAttribute('carousel', carouselConfig);
            
            // Add carousel to the scene
            scene.appendChild(newCarousel);
            
            console.log(`✓ Fresh carousel created and added to scene`);
            
            // Execute the callback if provided
            if (callback) {
                callback();
            }
            
            console.log(`✓ Carousel ready - scale is ${newScale}`);
        }, 100);
    }

    disposeEntityTree(entity) {
        // Recursively dispose of entity and all its children
        if (!entity) return;

        let disposedCount = 0;

        // Get all children first (including nested)
        const allEntities = [entity, ...entity.querySelectorAll('*')];

        allEntities.forEach(el => {
            // Dispose Three.js object3D if it exists
            if (el.object3D) {
                el.object3D.traverse((obj) => {
                    // Dispose geometry
                    if (obj.geometry) {
                        obj.geometry.dispose();
                    }

                    // Dispose material(s) and textures
                    if (obj.material) {
                        if (Array.isArray(obj.material)) {
                            obj.material.forEach(mat => this.disposeMaterialAndTextures(mat));
                        } else {
                            this.disposeMaterialAndTextures(obj.material);
                        }
                    }
                });

                // Remove from scene graph
                if (el.object3D.parent) {
                    el.object3D.parent.remove(el.object3D);
                }

                disposedCount++;
            }

            // Remove A-Frame components
            if (el.components) {
                Object.keys(el.components).forEach(name => {
                    if (el.components[name].remove) {
                        el.components[name].remove();
                    }
                });
            }
        });

        console.log(`  Disposed ${disposedCount} entities with their geometries and materials`);
    }

    disposeMaterialAndTextures(material) {
        // Dispose all texture types
        const textureProperties = [
            'map', 'lightMap', 'bumpMap', 'normalMap', 'specularMap',
            'envMap', 'alphaMap', 'aoMap', 'displacementMap', 'emissiveMap',
            'gradientMap', 'metalnessMap', 'roughnessMap'
        ];

        textureProperties.forEach(prop => {
            if (material[prop] && material[prop].dispose) {
                material[prop].dispose();
            }
        });

        // Dispose the material itself
        if (material.dispose) {
            material.dispose();
        }
    }

    updateShaderScale(newScale) {
        // Since we destroy and recreate the carousel, we need to update the template
        // before the next cycle starts. The clearCarouselMeshes will preserve this.
        const carouselEntity = document.querySelector('[carousel]');
        if (!carouselEntity) {
            console.warn('⚠️ Carousel entity not found when trying to update scale');
            return;
        }

        // Find the template entity with tsl-shader component
        const template = carouselEntity.querySelector('[tsl-shader]');
        
        if (!template) {
            console.warn('⚠️ Template entity not found when trying to update scale');
            return;
        }
        
        const currentAttr = template.getAttribute('tsl-shader');
        console.log(`📝 Current shader attribute before update: ${currentAttr}`);
        
        if (typeof currentAttr === 'string') {
            // Parse the attribute string
            const pairs = currentAttr.split(';').map(s => s.trim()).filter(s => s);
            const params = {};
            
            pairs.forEach(pair => {
                const [key, ...valueParts] = pair.split(':');
                const value = valueParts.join(':').trim();
                if (key && value) {
                    params[key.trim()] = value;
                }
            });
            
            const oldScale = params.scale || 'not set';
            
            // Update the scale parameter
            params.scale = newScale.toString();
            
            // Reconstruct the attribute string
            const newAttrString = Object.entries(params)
                .map(([key, value]) => `${key}: ${value}`)
                .join('; ');
            
            // Set the updated attribute on the template
            template.setAttribute('tsl-shader', newAttrString);
            
            // Verify the update
            const verifyAttr = template.getAttribute('tsl-shader');
            console.log(`✓ Updated template shader scale: ${oldScale} → ${newScale}`);
            console.log(`✓ Verified new attribute: ${verifyAttr}`);
        } else {
            console.warn('⚠️ Shader attribute is not a string, cannot update scale');
        }
    }

    proposeDownload() {
        // Stop logging
        if (this.logInterval) {
            clearInterval(this.logInterval);
            this.logInterval = null;
        }
        
        // Stop checking carousel status
        if (this.carouselStoppedCheckInterval) {
            clearInterval(this.carouselStoppedCheckInterval);
            this.carouselStoppedCheckInterval = null;
        }
        
        // Stop cycle monitoring
        if (this.cycleCheckInterval) {
            clearInterval(this.cycleCheckInterval);
            this.cycleCheckInterval = null;
        }

        // Make the info box clickable for download
        this.uiElement.style.cursor = 'pointer';
        this.uiElement.style.backgroundColor = 'rgba(76, 175, 80, 0.8)'; // Green background to indicate clickable
        this.uiElement.style.border = '2px solid #4CAF50';
        
        // Add click handler to the info box
        this.uiElement.addEventListener('click', () => {
            this.downloadStats();
        });
        
        // Update the UI to show it's clickable
        this.uiElement.innerHTML += '<br><small>📊 Click to download stats</small>';
        
        // Show a notification
        this.showNotification('4 cycles completed! Click the info box to download performance stats.');
    }

    downloadStats() {
        try {
            // Prevent multiple downloads
            if (this.uiElement.style.cursor === 'not-allowed') {
                return;
            }
            
            // Indicate download in progress
            this.uiElement.style.cursor = 'not-allowed';
            this.uiElement.style.backgroundColor = 'rgba(255, 152, 0, 0.8)'; // Orange background
            this.uiElement.innerHTML = this.uiElement.innerHTML.replace('📊 Click to download stats', '⬇️ Downloading...');
            
            // Calculate statistics per scale
            const scaleStats = {};
            this.scales.forEach(scale => {
                const scaleData = this.performanceData.filter(entry => entry.scale === scale);
                if (scaleData.length > 0) {
                    scaleStats[`scale_${scale}`] = {
                        scale: scale,
                        sampleCount: scaleData.length,
                        averageFPS: parseFloat((scaleData.reduce((sum, entry) => sum + entry.fps, 0) / scaleData.length).toFixed(1)),
                        averageFrameTime: parseFloat((scaleData.reduce((sum, entry) => sum + entry.frameTime, 0) / scaleData.length).toFixed(2)),
                        minFPS: parseFloat(Math.min(...scaleData.map(e => e.fps)).toFixed(1)),
                        maxFPS: parseFloat(Math.max(...scaleData.map(e => e.fps)).toFixed(1))
                    };
                }
            });
            
            const stats = {
                summary: {
                    totalSamples: this.performanceData.length,
                    completedCycles: this.completedCycles,
                    scalesUsed: this.scales,
                    startTimeSeconds: this.performanceData.length > 0 ? 
                        this.performanceData[0].timeSeconds : 0,
                    endTimeSeconds: this.performanceData.length > 0 ? 
                        this.performanceData[this.performanceData.length - 1].timeSeconds : 0,
                    overallAverageFPS: this.performanceData.length > 0 ? 
                        parseFloat((this.performanceData.reduce((sum, entry) => sum + entry.fps, 0) / this.performanceData.length).toFixed(1)) : 0,
                    overallAverageFrameTime: this.performanceData.length > 0 ? 
                        parseFloat((this.performanceData.reduce((sum, entry) => sum + entry.frameTime, 0) / this.performanceData.length).toFixed(2)) : 0,
                    minFPS: this.performanceData.length > 0 ? parseFloat(Math.min(...this.performanceData.map(e => e.fps)).toFixed(1)) : 0,
                    maxFPS: this.performanceData.length > 0 ? parseFloat(Math.max(...this.performanceData.map(e => e.fps)).toFixed(1)) : 0
                },
                scaleStatistics: scaleStats,
                data: this.performanceData
            };

            const dataStr = JSON.stringify(stats, null, 2);
            const dataBlob = new Blob([dataStr], {type: 'application/json'});
            const url = URL.createObjectURL(dataBlob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = `performance-stats-scales-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            URL.revokeObjectURL(url);
            
            // Update UI to show download completed
            setTimeout(() => {
                this.uiElement.style.backgroundColor = 'rgba(33, 150, 243, 0.8)'; // Blue background
                this.uiElement.innerHTML = this.uiElement.innerHTML.replace('⬇️ Downloading...', '✅ Downloaded');
                this.showNotification('Performance stats downloaded successfully!');
            }, 500);
        } catch (error) {
            console.error('Failed to download stats:', error);
            this.showNotification('Error downloading stats. Check console.');
            this.uiElement.style.cursor = 'pointer';
            this.uiElement.style.backgroundColor = 'rgba(244, 67, 54, 0.8)'; // Red background
            this.uiElement.innerHTML = this.uiElement.innerHTML.replace('⬇️ Downloading...', '❌ Error - Try again');
        }
    }

    showNotification(message, duration = 3000) {
        const notification = document.createElement('div');
        notification.textContent = message;
        notification.style.position = 'fixed';
        notification.style.top = '50%';
        notification.style.left = '50%';
        notification.style.transform = 'translate(-50%, -50%)';
        notification.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
        notification.style.color = 'white';
        notification.style.padding = '20px';
        notification.style.borderRadius = '10px';
        notification.style.fontFamily = 'Arial, sans-serif';
        notification.style.fontSize = '16px';
        notification.style.zIndex = '10000';
        notification.style.maxWidth = '300px';
        notification.style.textAlign = 'center';
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, duration);
    }
}

// Initialize the profiler when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const profiler = new VRProfiler();
});
