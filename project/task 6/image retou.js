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
    let imageX = 0;
    let imageY = 0;
    let imageWidth = 0;
    let imageHeight = 0;
    
    // Initialize canvas size
    function initCanvasSize() {
        const container = document.querySelector('.canvas-container');
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        overlay.width = container.clientWidth;
        overlay.height = container.clientHeight;
    }
    
    // Initialize event listeners
    function initEventListeners() {
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
    }
    
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
                    imageWidth = img.width * scale;
                    imageHeight = img.height * scale;
                    
                    // Center the image
                    imageX = (canvas.width - imageWidth) / 2;
                    imageY = (canvas.height - imageHeight) / 2;
                    
                    // Draw the image
                    ctx.drawImage(img, imageX, imageY, imageWidth, imageHeight);
                    
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
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        overlayCtx.clearRect(0, 0, overlay.width, overlay.height);
        
        if (originalImageData) {
            ctx.putImageData(originalImageData, 0, 0);
            imageHistory = [ctx.getImageData(0, 0, canvas.width, canvas.height)];
            historyIndex = 0;
        } else {
            imageHistory = [];
            historyIndex = -1;
        }
        
        currentImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        updateUndoRedoButtons();
    }
    
    // Check if point is within image bounds
    function isPointInImage(x, y) {
        return x >= imageX && x <= imageX + imageWidth && 
               y >= imageY && y <= imageY + imageHeight;
    }
    
    // Get canvas coordinates
    function getCanvasCoordinates(e) {
        const rect = overlay.getBoundingClientRect();
        return [
            e.clientX - rect.left,
            e.clientY - rect.top
        ];
    }
    
    // Drawing functions
    function startDrawing(e) {
        if (!currentImageData) return;
        
        const [x, y] = getCanvasCoordinates(e);
        
        if (!isPointInImage(x, y)) {
            isDrawing = false;
            return;
        }
        
        isDrawing = true;
        lastX = x;
        lastY = y;
        
        if (currentTool === 'clone') {
            cloneSource = { x: lastX, y: lastY };
            updateBrushPreview(e);
        }
        
        saveState();
    }
    
    function draw(e) {
        if (!isDrawing || !currentImageData) return;
        
        const [x, y] = getCanvasCoordinates(e);
        
        if (!isPointInImage(x, y)) {
            endDrawing();
            return;
        }
        
        overlayCtx.clearRect(0, 0, overlay.width, overlay.height);
        
        switch (currentTool) {
            case 'blur':
                applyBlur(lastX, lastY, x, y);
                break;
            case 'clone':
                applyCloneStamp(x, y);
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
        updateBrushPreview(e);
    }
    
    function endDrawing() {
        isDrawing = false;
        overlayCtx.clearRect(0, 0, overlay.width, overlay.height);
        currentImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    }
    
    // Update brush preview
    function updateBrushPreview(e) {
        const [x, y] = getCanvasCoordinates(e);
        overlayCtx.clearRect(0, 0, overlay.width, overlay.height);
        
        if (currentTool === 'clone' && !isDrawing) {
            overlayCtx.strokeStyle = 'red';
            overlayCtx.lineWidth = 2;
            overlayCtx.beginPath();
            overlayCtx.arc(cloneSource.x, cloneSource.y, brushSize / 2, 0, Math.PI * 2);
            overlayCtx.stroke();
            
            overlayCtx.beginPath();
            overlayCtx.moveTo(cloneSource.x - brushSize, cloneSource.y);
            overlayCtx.lineTo(cloneSource.x + brushSize, cloneSource.y);
            overlayCtx.moveTo(cloneSource.x, cloneSource.y - brushSize);
            overlayCtx.lineTo(cloneSource.x, cloneSource.y + brushSize);
            overlayCtx.stroke();
        }
        
        if (isPointInImage(x, y)) {
            overlayCtx.strokeStyle = currentTool === 'clone' ? 'blue' : 'green';
            overlayCtx.lineWidth = 1;
            overlayCtx.beginPath();
            overlayCtx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
            overlayCtx.stroke();
        }
    }
    
    // Tool implementations (simplified for brevity)
    function applyBlur(x1, y1, x2, y2) {
        // Simplified blur implementation
        ctx.globalAlpha = intensity;
        ctx.filter = `blur(${brushSize/10}px)`;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.lineWidth = brushSize;
        ctx.stroke();
        ctx.globalAlpha = 1.0;
        ctx.filter = 'none';
    }
    
    function applyCloneStamp(x, y) {
        const offsetX = x - cloneSource.x;
        const offsetY = y - cloneSource.y;
        
        ctx.save();
        ctx.globalAlpha = intensity;
        ctx.drawImage(canvas, 
            cloneSource.x - brushSize/2, cloneSource.y - brushSize/2, 
            brushSize, brushSize,
            x - brushSize/2, y - brushSize/2,
            brushSize, brushSize);
        ctx.restore();
    }
    
    function applyLightenDarken(x1, y1, x2, y2, isLighten) {
        ctx.globalCompositeOperation = isLighten ? 'lighten' : 'darken';
        ctx.globalAlpha = intensity;
        ctx.strokeStyle = isLighten ? 'white' : 'black';
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.lineWidth = brushSize;
        ctx.stroke();
        ctx.globalAlpha = 1.0;
        ctx.globalCompositeOperation = 'source-over';
    }
    
    function applySharpen(x1, y1, x2, y2) {
        // Simplified sharpen effect
        ctx.globalAlpha = intensity;
        ctx.filter = 'contrast(1.5)';
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.lineWidth = brushSize/2;
        ctx.stroke();
        ctx.globalAlpha = 1.0;
        ctx.filter = 'none';
    }
    
    function applyRedEyeReduction(x1, y1, x2, y2) {
        ctx.globalCompositeOperation = 'multiply';
        ctx.globalAlpha = intensity;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.beginPath();
        ctx.arc((x1+x2)/2, (y1+y2)/2, brushSize/2, 0, Math.PI*2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
        ctx.globalCompositeOperation = 'source-over';
    }
    
    // Undo/redo functionality
    function saveState() {
        if (historyIndex < imageHistory.length - 1) {
            imageHistory = imageHistory.slice(0, historyIndex + 1);
        }
        
        imageHistory.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
        historyIndex = imageHistory.length - 1;
        
        if (imageHistory.length > 20) {
            imageHistory.shift();
            historyIndex--;
        }
        
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
        
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = imageWidth;
        tempCanvas.height = imageHeight;
        const tempCtx = tempCanvas.getContext('2d');
        
        tempCtx.drawImage(canvas, imageX, imageY, imageWidth, imageHeight, 
                          0, 0, imageWidth, imageHeight);
        
        const link = document.createElement('a');
        link.download = 'retouched-image.png';
        link.href = tempCanvas.toDataURL('image/png');
        link.click();
    }
    
    // Initialize everything
    window.addEventListener('resize', initCanvasSize);
    initCanvasSize();
    initEventListeners();
});