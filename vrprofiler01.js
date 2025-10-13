class VRProfiler {
    constructor() {
        this.lastTime = performance.now();
        this.frameTime = 0;
        this.fps = 0;
        this.meshCount = 0;
        this.performanceData = [];
        this.logInterval = null;
        this.carouselStoppedCheckInterval = null;
        this.downloadProposed = false;
        this.meshCountTimer = null;
        this.lastShaderName = null;
        this.lastShaderParams = null;
        this.createUI();
        this.startProfiling();
        this.startLogging();
        this.checkCarouselStatus();
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

        const shaderData = tslShaderComponent.data;
        let shaderName = 'Unknown';
        
        // Extract shader name from src path
        if (shaderData.src) {
            const pathParts = shaderData.src.split('/');
            const fileName = pathParts[pathParts.length - 1];
            shaderName = fileName.replace('.js', '').replace(/-/g, ' ');
            // Capitalize first letter of each word
            shaderName = shaderName.split(' ').map(word => 
                word.charAt(0).toUpperCase() + word.slice(1)
            ).join(' ');
        }

        // Extract meaningful parameters (excluding default/empty values)
        const params = {};
        const importantParams = ['count', 'size', 'blur', 'scale', 'roughness', 'metalness', 'speed', 'smooth', 'wave'];
        
        for (const param of importantParams) {
            if (shaderData[param] !== undefined && shaderData[param] !== 0) {
                params[param] = shaderData[param];
            }
        }

        // Add color parameters if they're not default
        if (shaderData.color && shaderData.color !== '#000000') {
            params.color = shaderData.color;
        }
        if (shaderData.background && shaderData.background !== '#ffffff') {
            params.bg = shaderData.background;
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
        
        // Remove UI element
        if (this.uiElement && this.uiElement.parentNode) {
            this.uiElement.parentNode.removeChild(this.uiElement);
        }
        
        // Clear data
        this.performanceData = [];
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
        
        // Performance metrics
        displayText += `Time: ${currentTimeSeconds}s<br>Frame Time: ${this.frameTime.toFixed(2)} ms<br>FPS: ${this.fps.toFixed(1)}<br>Meshes: ${this.meshCount}`;
        
        this.uiElement.innerHTML = displayText;
    }

    startLogging() {
        this.logInterval = setInterval(() => {
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
                meshCount: this.meshCount
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
        }, 500); // Log every 500ms (half second)
    }

    checkCarouselStatus() {
        this.carouselStoppedCheckInterval = setInterval(() => {
            const carouselEntity = document.querySelector('[carousel]');
            if (carouselEntity && carouselEntity.components && carouselEntity.components.carousel) {
                const carousel = carouselEntity.components.carousel;
                if (carousel.stopped && !this.downloadProposed) {
                    // Carousel has stopped, wait 2 seconds then propose download
                    setTimeout(() => {
                        this.proposeDownload();
                    }, 2000);
                    this.downloadProposed = true;
                }
            }
        }, 100); // Check every 100ms
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
        this.showNotification('Carousel stopped! Click the info box to download performance stats.');
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
            
            const stats = {
                summary: {
                    totalSamples: this.performanceData.length,
                    startTimeSeconds: this.performanceData.length > 0 ? 
                        this.performanceData[0].timeSeconds : 0,
                    endTimeSeconds: this.performanceData.length > 0 ? 
                        this.performanceData[this.performanceData.length - 1].timeSeconds : 0,
                    averageFPS: this.performanceData.length > 0 ? 
                        parseFloat((this.performanceData.reduce((sum, entry) => sum + entry.fps, 0) / this.performanceData.length).toFixed(1)) : 0,
                    averageFrameTime: this.performanceData.length > 0 ? 
                        parseFloat((this.performanceData.reduce((sum, entry) => sum + entry.frameTime, 0) / this.performanceData.length).toFixed(2)) : 0,
                    minFPS: this.performanceData.length > 0 ? parseFloat(Math.min(...this.performanceData.map(e => e.fps)).toFixed(1)) : 0,
                    maxFPS: this.performanceData.length > 0 ? parseFloat(Math.max(...this.performanceData.map(e => e.fps)).toFixed(1)) : 0
                },
                data: this.performanceData
            };

            const dataStr = JSON.stringify(stats, null, 2);
            const dataBlob = new Blob([dataStr], {type: 'application/json'});
            const url = URL.createObjectURL(dataBlob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = `performance-stats-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
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

    showNotification(message) {
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
        }, 3000); // Remove after 3 seconds
    }
}

// Initialize the profiler when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const profiler = new VRProfiler();
});
