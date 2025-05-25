document.addEventListener('DOMContentLoaded', function() {
    // Navigation between pages
    document.getElementById('nav-spline').addEventListener('click', function(e) {
        e.preventDefault();
        document.getElementById('spline-page').classList.add('active');
        document.getElementById('retouch-page').classList.remove('active');
    });

    document.getElementById('nav-retouch').addEventListener('click', function(e) {
        e.preventDefault();
        document.getElementById('retouch-page').classList.add('active');
        document.getElementById('spline-page').classList.remove('active');
    });

    // Initialize both applications
    initSplineApp();
    initRetouchApp();
});

// ==================== SPLINE DRAWING APP ====================
function initSplineApp() {
    const canvas = document.getElementById('spline-canvas');
    const ctx = canvas.getContext('2d');
    const clearBtn = document.getElementById('clear-spline');
    const interpolateBtn = document.getElementById('interpolate');
    const tensionSlider = document.getElementById('tension');
    const tensionValue = document.getElementById('tension-value');
    const toggleAdvancedBtn = document.getElementById('toggle-advanced');
    const advancedControls = document.getElementById('advanced-controls');
    const pointControls = document.getElementById('point-controls');

    let points = [];
    let isInterpolated = false;
    let isAdvancedMode = false;
    let selectedPointIndex = -1;

    // Update tension value display
    tensionSlider.addEventListener('input', function() {
        tensionValue.textContent = this.value;
        if (isInterpolated && points.length > 1) {
            draw();
        }
    });

    // Toggle advanced mode
    toggleAdvancedBtn.addEventListener('click', function() {
        isAdvancedMode = !isAdvancedMode;
        advancedControls.classList.toggle('hidden');
        this.textContent = isAdvancedMode ? 'Hide Advanced Options' : 'Advanced Options';
    });

    // Clear canvas
    clearBtn.addEventListener('click', function() {
        points = [];
        isInterpolated = false;
        pointControls.innerHTML = '';
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    });

    // Interpolate points with spline
    interpolateBtn.addEventListener('click', function() {
        if (points.length > 1) {
            isInterpolated = true;
            draw();
        }
    });

    // Handle canvas clicks
    canvas.addEventListener('click', function(e) {
        if (isAdvancedMode && selectedPointIndex >= 0) {
            // Move selected point
            points[selectedPointIndex] = getCanvasCoordinates(e);
            selectedPointIndex = -1;
        } else {
            // Add new point
            points.push(getCanvasCoordinates(e));
            if (isAdvancedMode) {
                addPointControl(points.length - 1);
            }
        }
        
        isInterpolated = false;
        draw();
    });

    // Get canvas coordinates from mouse event
    function getCanvasCoordinates(e) {
        const rect = canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }

    // Add control for a point (advanced mode)
    function addPointControl(index) {
        const control = document.createElement('div');
        control.className = 'point-control';
        control.innerHTML = `
            <span>Point ${index + 1}</span>
            <button class="select-point" data-index="${index}">Select</button>
            <button class="delete-point" data-index="${index}">Delete</button>
            <input type="range" class="convexity-slider" data-index="${index}" min="-1" max="1" step="0.1" value="0">
            <span class="convexity-value">0</span>
        `;
        pointControls.appendChild(control);

        // Add event listeners for the new controls
        control.querySelector('.select-point').addEventListener('click', function() {
            selectedPointIndex = parseInt(this.getAttribute('data-index'));
        });

        control.querySelector('.delete-point').addEventListener('click', function() {
            const idx = parseInt(this.getAttribute('data-index'));
            points.splice(idx, 1);
            pointControls.innerHTML = '';
            points.forEach((_, i) => addPointControl(i));
            draw();
        });

        const slider = control.querySelector('.convexity-slider');
        const valueDisplay = control.querySelector('.convexity-value');
        
        slider.addEventListener('input', function() {
            valueDisplay.textContent = this.value;
            if (isInterpolated) {
                draw();
            }
        });
    }

    // Draw points and lines
    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw the original points
        ctx.fillStyle = 'red';
        points.forEach(point => {
            ctx.beginPath();
            ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
            ctx.fill();
        });

        if (points.length > 0) {
            // Draw the broken line
            ctx.strokeStyle = 'blue';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(points[0].x, points[0].y);
            
            for (let i = 1; i < points.length; i++) {
                ctx.lineTo(points[i].x, points[i].y);
            }
            
            ctx.stroke();

            // Draw the spline if interpolated
            if (isInterpolated && points.length > 1) {
                const tension = parseFloat(tensionSlider.value);
                drawSpline(points, tension);
            }
        }
    }

    // Draw a cardinal spline through the points
    function drawSpline(points, tension) {
        ctx.strokeStyle = 'green';
        ctx.lineWidth = 3;
        ctx.beginPath();
        
        // Move to the first point
        ctx.moveTo(points[0].x, points[0].y);
        
        // Draw curve segments between points
        for (let i = 0; i < points.length - 1; i++) {
            const p0 = i > 0 ? points[i - 1] : points[0];
            const p1 = points[i];
            const p2 = points[i + 1];
            const p3 = i < points.length - 2 ? points[i + 2] : p2;
            
            // Get convexity value for this segment if in advanced mode
            let convexity = 0;
            if (isAdvancedMode) {
                const slider = document.querySelector(`.convexity-slider[data-index="${i}"]`);
                if (slider) {
                    convexity = parseFloat(slider.value);
                }
            }
            
            // Calculate control points with tension and convexity
            const cp1x = p1.x + (p2.x - p0.x) / 6 * (1 + convexity) * (1 - tension);
            const cp1y = p1.y + (p2.y - p0.y) / 6 * (1 + convexity) * (1 - tension);
            const cp2x = p2.x - (p3.x - p1.x) / 6 * (1 - convexity) * (1 - tension);
            const cp2y = p2.y - (p3.y - p1.y) / 6 * (1 - convexity) * (1 - tension);
            
            // Draw the bezier curve segment
            ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
        }
        
        ctx.stroke();
    }
}

// ==================== IMAGE RETOUCHING APP ====================
function initRetouchApp() {
    const canvas = document.getElementById('retouch-canvas');
    const overlay = document.getElementById('retouch-overlay');
    const ctx = canvas.getContext('2d');
    const overlayCtx = overlay.getContext('2d');
    const uploadInput = document.getElementById('image-upload');
    const clearBtn = document.getElementById('clear-retouch');
    const toolSelect = document.getElementById('retouch-tool');
    const brushSizeSlider = document.getElementById('brush-size');
    const brushSizeValue = document.getElementById('brush-size-value');
    const intensitySlider = document.getElementById('intensity');
    const intensityValue = document.getElementById('intensity-value');

    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;
    let imageData = null;
    let cloneSource = { x: 0, y: 0 };

    // Update brush size display
    brushSizeSlider.addEventListener('input', function() {
        brushSizeValue.textContent = this.value;
    });

    // Update intensity display
    intensitySlider.addEventListener('input', function() {
        intensityValue.textContent = this.value;
    });

    // Clear canvas
    clearBtn.addEventListener('click', function() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        overlayCtx.clearRect(0, 0, overlay.width, overlay.height);
        imageData = null;
    });

    // Handle image upload
    uploadInput.addEventListener('change', function(e) {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = function(event) {
                const img = new Image();
                img.onload = function() {
                    // Scale image to fit canvas while maintaining aspect ratio
                    const scale = Math.min(
                        canvas.width / img.width,
                        canvas.height / img.height
                    );
                    const width = img.width * scale;
                    const height = img.height * scale;
                    
                    // Center the image on the canvas
                    const x = (canvas.width - width) / 2;
                    const y = (canvas.height - height) / 2;
                    
                    ctx.drawImage(img, x, y, width, height);
                    imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    });

    // Drawing events
    overlay.addEventListener('mousedown', startDrawing);
    overlay.addEventListener('mousemove', draw);
    overlay.addEventListener('mouseup', stopDrawing);
    overlay.addEventListener('mouseout', stopDrawing);

    function startDrawing(e) {
        if (!imageData) return;
        
        isDrawing = true;
        [lastX, lastY] = getCanvasCoordinates(e);
        
        if (toolSelect.value === 'clone') {
            // Set clone source point
            cloneSource = { x: lastX, y: lastY };
            drawClonePreview(e);
        }
    }

    function draw(e) {
        if (!isDrawing || !imageData) return;
        
        const [x, y] = getCanvasCoordinates(e);
        const brushSize = parseInt(brushSizeSlider.value);
        const intensity = parseInt(intensitySlider.value) / 100;
        
        // Clear overlay
        overlayCtx.clearRect(0, 0, overlay.width, overlay.height);
        
        switch (toolSelect.value) {
            case 'blur':
                applyBlur(lastX, lastY, x, y, brushSize, intensity);
                break;
            case 'clone':
                applyCloneStamp(x, y, brushSize, intensity);
                drawClonePreview(e);
                break;
            case 'lighten':
                applyLightenDarken(lastX, lastY, x, y, brushSize, intensity, true);
                break;
            case 'darken':
                applyLightenDarken(lastX, lastY, x, y, brushSize, intensity, false);
                break;
        }
        
        lastX = x;
        lastY = y;
    }

    function stopDrawing() {
        isDrawing = false;
        overlayCtx.clearRect(0, 0, overlay.width, overlay.height);
        
        // Update image data after applying changes
        if (imageData) {
            imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        }
    }

    function drawClonePreview(e) {
        const [x, y] = getCanvasCoordinates(e);
        const brushSize = parseInt(brushSizeSlider.value);
        
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
        
        // Draw brush preview at current position
        overlayCtx.strokeStyle = 'blue';
        overlayCtx.beginPath();
        overlayCtx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
        overlayCtx.stroke();
    }

    function getCanvasCoordinates(e) {
        const rect = overlay.getBoundingClientRect();
        return [
            e.clientX - rect.left,
            e.clientY - rect.top
        ];
    }

    // Apply blur effect
    function applyBlur(x1, y1, x2, y2, size, intensity) {
        const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
        
        for (let i = 0; i <= steps; i++) {
            const x = Math.round(x1 + (x2 - x1) * i / steps);
            const y = Math.round(y1 + (y2 - y1) * i / steps);
            
            // Get the area to blur
            const radius = size / 2;
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
            const radiusPixels = Math.floor(size / 2);
            const diameter = radiusPixels * 2 + 1;
            const area = diameter * diameter;
            
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
                // Alpha channel remains unchanged
            }
            
            ctx.putImageData(areaData, startX, startY);
        }
    }

    // Apply clone stamp effect
    function applyCloneStamp(x, y, size, intensity) {
        const radius = size / 2;
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
                // Alpha channel remains unchanged
            }
        }
        
        ctx.putImageData(destData, startX, startY);
    }

    // Apply lighten/darken effect
    function applyLightenDarken(x1, y1, x2, y2, size, intensity, isLighten) {
        const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
        
        for (let i = 0; i <= steps; i++) {
            const x = Math.round(x1 + (x2 - x1) * i / steps);
            const y = Math.round(y1 + (y2 - y1) * i / steps);
            
            // Get the area to modify
            const radius = size / 2;
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
}