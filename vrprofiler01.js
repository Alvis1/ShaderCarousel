class VRProfiler {
    constructor() {
        this.lastTime = performance.now();
        this.frameTime = 0;
        this.fps = 0;
        this.createUI();
        this.startProfiling();
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
        this.uiElement.innerHTML = 'Frame Time: 0.00 ms<br>FPS: 0';
        document.body.appendChild(this.uiElement);
    }

    startProfiling() {
        const animate = () => {
            const currentTime = performance.now();
            this.frameTime = currentTime - this.lastTime;
            this.lastTime = currentTime;
            this.fps = 1000 / this.frameTime;
            this.updateUI();
            requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
    }

    updateUI() {
        this.uiElement.innerHTML = `Frame Time: ${this.frameTime.toFixed(2)} ms<br>FPS: ${this.fps.toFixed(1)}`;
    }
}

// Initialize the profiler when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const profiler = new VRProfiler();
});
