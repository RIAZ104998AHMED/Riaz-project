document.addEventListener('DOMContentLoaded', function() {
    // Canvas setup
    const canvas = document.getElementById('main-canvas');
    const overlay = document.getElementById('overlay-canvas');
    const ctx = canvas.getContext('2d');
    const overlayCtx = overlay.getContext('2d');
    
    // UI elements
    const uploadInput = document.getElementById('image-upload');
    const clearBtn = document.getElementById('clear-canvas');
    const toolSelect = document.getElementById('retouch-tool');
    const brushSizeSlider = document.getElementById('brush-size');
    const brushSizeValue = document.getElementById('brush-size-value');
    const intensitySlider = document.getElementById('intensity');
    const intensityValue = document.getElementById('intensity-value');
    const undoBtn = document.getElementById('undo-btn');
    const redoBtn = document.getElementById('redo-btn');
    const downloadBtn = document.getElementById('download-btn');
    
    // Application state
    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;
    let currentTool = 'blur';
    let brushSize = 20;
    let intensity = 0.5;
    let cloneSource = { x: 0, y: 0 };
    let imageHistory = [];
    let historyIndex = -1;
    let currentImageData = null;
    let originalImageData = null;
    
    // Initialize canvas size
    function initCanvasSize() {
        const container = document.querySelector('.canvas-container');
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        overlay.width = container.clientWidth;
        overlay.height = container.clientHeight;
    }
    
    window.addEventListener('resize', initCanvasSize);
    initCanvasSize();
    
    // Event listeners for UI controls
    brushSizeSlider.addEventListener('input', function() {
        brushSize = parseInt(this.value);
        brushSizeValue.textContent = brushSize;
    });
    
    intensitySlider.addEventListener('input', function() {
        intensity = parseInt(this.value) / 100;
        intensityValue.textContent = this.value;
    });
    
    toolSelect.addEventListener('change', function() {
        currentTool = this.value;
        overlayCtx.clearRect(0, 0, overlay.width, overlay.height);
    });
    
    uploadInput.addEventListener('change', handleImageUpload);
    clearBtn.addEventListener('click', resetCanvas);
    undoBtn.addEventListener('click', undoAction);
    redoBtn.addEventListener('click', redoAction);
    downloadBtn.addEventListener('click', downloadImage);
    
    // Drawing events
    overlay.addEventListener('mousedown', startDrawing);
    overlay.addEventListener('mousemove', draw);
    overlay.addEventListener('mouseup', endDrawing);
    overlay.addEventListener('mouseout', endDrawing);
    overlay.addEventListener('mousemove', updateBrushPreview);
    
    // Handle image upload
    function handleImageUpload(e) {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = function(event) {
                const img = new Image();
                img.onload = function() {
                    resetCanvas();
                    
                    // Calculate dimensions to maintain aspect ratio
                    const scale = Math.min(
                        canvas.width / img.width,
                        canvas.height / img.height
                    );
                    const width = img.width * scale;
                    const height = img.height * scale;
                    
                    // Center the image
                    const x = (canvas.width - width) / 2;
                    const y = (canvas.height - height) / 2;
                    
                    // Draw the image
                    ctx.drawImage(img, x, y, width, height);
                    
                    // Save initial state
                    saveState();
                    originalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    currentImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    }
    
    // Reset the canvas
    function resetCanvas() {
        if (originalImageData) {
            ctx.putImageData(originalImageData, 0, 0);
            imageHistory = [ctx.getImageData(0, 0, canvas.width, canvas.height)];
            historyIndex = 0;
        } else {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            imageHistory = [];
            historyIndex = -1;
        }
        overlayCtx.clearRect(0, 0, overlay.width, overlay.height);
        currentImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        updateUndoRedoButtons();
    }
    
    // Drawing functions
    function startDrawing(e) {
        if (!currentImageData) return;
        
        isDrawing = true;
        [lastX, lastY] = getCanvasCoordinates(e);
        
        if (currentTool === 'clone') {
            cloneSource = { x: lastX, y: lastY };
            updateBrushPreview(e);
        }
        
        saveState();
    }
    
    function draw(e) {
        if (!isDrawing || !currentImageData) return;
        
        const [x, y] = getCanvasCoordinates(e);
        
        // Clear overlay
        overlayCtx.clearRect(0, 0, overlay.width, overlay.height);
        
        // Apply the selected tool
        switch (currentTool) {
            case 'blur':
                applyBlur(lastX, lastY, x, y);
                break;
            case 'clone':
                applyCloneStamp(x, y);
                updateBrushPreview(e);
                break;
            case 'lighten':
                applyLightenDarken(lastX, lastY, x, y, true);
                break;
            case 'darken':
                applyLightenDarken(lastX, lastY, x, y, false);
                break;
            case 'sharpen':
                applySharpen(lastX, lastY, x, y);
                break;
            case 'red-eye':
                applyRedEyeReduction(lastX, lastY, x, y);
                break;
        }
        
        lastX = x;
        lastY = y;
    }
    
    function endDrawing() {
        isDrawing = false;
        overlayCtx.clearRect(0, 0, overlay.width, overlay.height);
        
        // Update current image data
        if (currentImageData) {
            currentImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        }
    }
    
    // Helper function to get canvas coordinates
    function getCanvasCoordinates(e) {
        const rect = overlay.getBoundingClientRect();
        return [
            e.clientX - rect.left,
            e.clientY - rect.top
        ];
    }
    
    // Update brush preview
    function updateBrushPreview(e) {
        const [x, y] = getCanvasCoordinates(e);
        
        // Clear overlay
        overlayCtx.clearRect(0, 0, overlay.width, overlay.height);
        
        if (currentTool === 'clone' && !isDrawing) {
            // Draw source marker
            overlayCtx.strokeStyle = 'red';
            overlayCtx.lineWidth = 2;
            overlayCtx.beginPath();
            overlayCtx.arc(cloneSource.x, cloneSource.y, brushSize / 2, 0, Math.PI * 2);
            overlayCtx.stroke();
            
            // Draw crosshair at source
            overlayCtx.beginPath();
            overlayCtx.moveTo(cloneSource.x - brushSize, cloneSource.y);
            overlayCtx.lineTo(cloneSource.x + brushSize, cloneSource.y);
            overlayCtx.moveTo(cloneSource.x, cloneSource.y - brushSize);
            overlayCtx.lineTo(cloneSource.x, cloneSource.y + brushSize);
            overlayCtx.stroke();
        }
        
        // Draw brush preview at current position
        overlayCtx.strokeStyle = currentTool === 'clone' ? 'blue' : 'green';
        overlayCtx.lineWidth = 1;
        overlayCtx.beginPath();
        overlayCtx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
        overlayCtx.stroke();
    }
    
    // Retouching tools implementations
    function applyBlur(x1, y1, x2, y2) {
        const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
        
        for (let i = 0; i <= steps; i++) {
            const x = Math.round(x1 + (x2 - x1) * i / steps);
            const y = Math.round(y1 + (y2 - y1) * i / steps);
            
            // Get the area to blur
            const radius = brushSize / 2;
            const startX = Math.max(0, x - radius);
            const startY = Math.max(0, y - radius);
            const endX = Math.min(canvas.width, x + radius);
            const endY = Math.min(canvas.height, y + radius);
            const width = endX - startX;
            const height = endY - startY;
            
            if (width <= 0 || height <= 0) continue;
            
            // Get image data for the area
            const areaData = ctx.getImageData(startX, startY, width, height);
            const tempData = new ImageData(width, height);
            
            // Apply box blur
            const radiusPixels = Math.floor(brushSize / 2);
            const diameter = radiusPixels * 2 + 1;
            
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    let r = 0, g = 0, b = 0, a = 0;
                    let count = 0;
                    
                    for (let dy = -radiusPixels; dy <= radiusPixels; dy++) {
                        for (let dx = -radiusPixels; dx <= radiusPixels; dx++) {
                            const sx = x + dx;
                            const sy = y + dy;
                            
                            if (sx >= 0 && sx < width && sy >= 0 && sy < height) {
                                const idx = (sy * width + sx) * 4;
                                r += areaData.data[idx];
                                g += areaData.data[idx + 1];
                                b += areaData.data[idx + 2];
                                a += areaData.data[idx + 3];
                                count++;
                            }
                        }
                    }
                    
                    const idx = (y * width + x) * 4;
                    tempData.data[idx] = r / count;
                    tempData.data[idx + 1] = g / count;
                    tempData.data[idx + 2] = b / count;
                    tempData.data[idx + 3] = a / count;
                }
            }
            
            // Blend with original based on intensity
            for (let i = 0; i < areaData.data.length; i += 4) {
                areaData.data[i] = areaData.data[i] * (1 - intensity) + tempData.data[i] * intensity;
                areaData.data[i + 1] = areaData.data[i + 1] * (1 - intensity) + tempData.data[i + 1] * intensity;
                areaData.data[i + 2] = areaData.data[i + 2] * (1 - intensity) + tempData.data[i + 2] * intensity;
            }
            
            ctx.putImageData(areaData, startX, startY);
        }
    }
    
    function applyCloneStamp(x, y) {
        const radius = brushSize / 2;
        const startX = Math.max(0, x - radius);
        const startY = Math.max(0, y - radius);
        const endX = Math.min(canvas.width, x + radius);
        const endY = Math.min(canvas.height, y + radius);
        const width = endX - startX;
        const height = endY - startY;
        
        if (width <= 0 || height <= 0) return;
        
        // Calculate source area
        const offsetX = x - cloneSource.x;
        const offsetY = y - cloneSource.y;
        const sourceStartX = Math.max(0, startX - offsetX);
        const sourceStartY = Math.max(0, startY - offsetY);
        const sourceEndX = Math.min(canvas.width, endX - offsetX);
        const sourceEndY = Math.min(canvas.height, endY - offsetY);
        const sourceWidth = sourceEndX - sourceStartX;
        const sourceHeight = sourceEndY - sourceStartY;
        
        if (sourceWidth <= 0 || sourceHeight <= 0) return;
        
        // Get source and destination image data
        const sourceData = ctx.getImageData(sourceStartX, sourceStartY, sourceWidth, sourceHeight);
        const destData = ctx.getImageData(startX, startY, width, height);
        
        // Blend source into destination
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const sx = x;
                const sy = y;
                
                if (sx >= sourceWidth || sy >= sourceHeight) continue;
                
                const sIdx = (sy * sourceWidth + sx) * 4;
                const dIdx = (y * width + x) * 4;
                
                destData.data[dIdx] = destData.data[dIdx] * (1 - intensity) + sourceData.data[sIdx] * intensity;
                destData.data[dIdx + 1] = destData.data[dIdx + 1] * (1 - intensity) + sourceData.data[sIdx + 1] * intensity;
                destData.data[dIdx + 2] = destData.data[dIdx + 2] * (1 - intensity) + sourceData.data[sIdx + 2] * intensity;
            }
        }
        
        ctx.putImageData(destData, startX, startY);
    }
    
    function applyLightenDarken(x1, y1, x2, y2, isLighten) {
        const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
        
        for (let i = 0; i <= steps; i++) {
            const x = Math.round(x1 + (x2 - x1) * i / steps);
            const y = Math.round(y1 + (y2 - y1) * i / steps);
            
            // Get the area to modify
            const radius = brushSize / 2;
            const startX = Math.max(0, x - radius);
            const startY = Math.max(0, y - radius);
            const endX = Math.min(canvas.width, x + radius);
            const endY = Math.min(canvas.height, y + radius);
            const width = endX - startX;
            const height = endY - startY;
            
            if (width <= 0 || height <= 0) continue;
            
            const areaData = ctx.getImageData(startX, startY, width, height);
            
            // Apply lighten or darken
            for (let i = 0; i < areaData.data.length; i += 4) {
                if (isLighten) {
                    areaData.data[i] += (255 - areaData.data[i]) * intensity;
                    areaData.data[i + 1] += (255 - areaData.data[i + 1]) * intensity;
                    areaData.data[i + 2] += (255 - areaData.data[i + 2]) * intensity;
                } else {
                    areaData.data[i] *= (1 - intensity);
                    areaData.data[i + 1] *= (1 - intensity);
                    areaData.data[i + 2] *= (1 - intensity);
                }
            }
            
            ctx.putImageData(areaData, startX, startY);
        }
    }
    
    function applySharpen(x1, y1, x2, y2) {
        const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
        
        for (let i = 0; i <= steps; i++) {
            const x = Math.round(x1 + (x2 - x1) * i / steps);
            const y = Math.round(y1 + (y2 - y1) * i / steps);
            
            // Get the area to sharpen
            const radius = brushSize / 2;
            const startX = Math.max(0, x - radius);
            const startY = Math.max(0, y - radius);
            const endX = Math.min(canvas.width, x + radius);
            const endY = Math.min(canvas.height, y + radius);
            const width = endX - startX;
            const height = endY - startY;
            
            if (width <= 0 || height <= 0) continue;
            
            const areaData = ctx.getImageData(startX, startY, width, height);
            const tempData = new ImageData(width, height);
            
            // Apply simple sharpen kernel
            const kernel = [
                [0, -1, 0],
                [-1, 5, -1],
                [0, -1, 0]
            ];
            
            for (let y = 1; y < height - 1; y++) {
                for (let x = 1; x < width - 1; x++) {
                    let r = 0, g = 0, b = 0;
                    
                    for (let ky = -1; ky <= 1; ky++) {
                        for (let kx = -1; kx <= 1; kx++) {
                            const idx = ((y + ky) * width + (x + kx)) * 4;
                            const weight = kernel[ky + 1][kx + 1];
                            
                            r += areaData.data[idx] * weight;
                            g += areaData.data[idx + 1] * weight;
                            b += areaData.data[idx + 2] * weight;
                        }
                    }
                    
                    const idx = (y * width + x) * 4;
                    tempData.data[idx] = Math.max(0, Math.min(255, r));
                    tempData.data[idx + 1] = Math.max(0, Math.min(255, g));
                    tempData.data[idx + 2] = Math.max(0, Math.min(255, b));
                    tempData.data[idx + 3] = areaData.data[idx + 3];
                }
            }
            
            // Blend with original based on intensity
            for (let i = 0; i < areaData.data.length; i += 4) {
                areaData.data[i] = areaData.data[i] * (1 - intensity) + tempData.data[i] * intensity;
                areaData.data[i + 1] = areaData.data[i + 1] * (1 - intensity) + tempData.data[i + 1] * intensity;
                areaData.data[i + 2] = areaData.data[i + 2] * (1 - intensity) + tempData.data[i + 2] * intensity;
            }
            
            ctx.putImageData(areaData, startX, startY);
        }
    }
    
    function applyRedEyeReduction(x1, y1, x2, y2) {
        const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
        
        for (let i = 0; i <= steps; i++) {
            const x = Math.round(x1 + (x2 - x1) * i / steps);
            const y = Math.round(y1 + (y2 - y1) * i / steps);
            
            // Get the area to process
            const radius = brushSize / 2;
            const startX = Math.max(0, x - radius);
            const startY = Math.max(0, y - radius);
            const endX = Math.min(canvas.width, x + radius);
            const endY = Math.min(canvas.height, y + radius);
            const width = endX - startX;
            const height = endY - startY;
            
            if (width <= 0 || height <= 0) continue;
            
            const areaData = ctx.getImageData(startX, startY, width, height);
            
            // Apply red eye reduction
            for (let i = 0; i < areaData.data.length; i += 4) {
                const r = areaData.data[i];
                const g = areaData.data[i + 1];
                const b = areaData.data[i + 2];
                
                // Detect red pixels
                if (r > g * 1.4 && r > b * 1.4) {
                    // Convert to grayscale with reduced intensity
                    const gray = (g + b) / 2 * intensity;
                    areaData.data[i] = gray;
                    areaData.data[i + 1] = gray * 0.8;
                    areaData.data[i + 2] = gray * 0.8;
                }
            }
            
            ctx.putImageData(areaData, startX, startY);
        }
    }
    
    // Undo/redo functionality
    function saveState() {
        // Remove any states after current index
        if (historyIndex < imageHistory.length - 1) {
            imageHistory = imageHistory.slice(0, historyIndex + 1);
        }
        
        // Save current state
        imageHistory.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
        historyIndex = imageHistory.length - 1;
        
        // Update button states
        updateUndoRedoButtons();
    }
    
    function undoAction() {
        if (historyIndex > 0) {
            historyIndex--;
            ctx.putImageData(imageHistory[historyIndex], 0, 0);
            currentImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            updateUndoRedoButtons();
        }
    }
    
    function redoAction() {
        if (historyIndex < imageHistory.length - 1) {
            historyIndex++;
            ctx.putImageData(imageHistory[historyIndex], 0, 0);
            currentImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            updateUndoRedoButtons();
        }
    }
    
    function updateUndoRedoButtons() {
        undoBtn.disabled = historyIndex <= 0;
        redoBtn.disabled = historyIndex >= imageHistory.length - 1;
    }
    
    // Download the retouched image
    function downloadImage() {
        if (!currentImageData) return;
        
        const link = document.createElement('a');
        link.download = 'retouched-image.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    }
});