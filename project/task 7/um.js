document.addEventListener('DOMContentLoaded', function() {
    // Canvas elements
    const originalCanvas = document.getElementById('originalCanvas');
    const processedCanvas = document.getElementById('processedCanvas');
    const originalCtx = originalCanvas.getContext('2d');
    const processedCtx = processedCanvas.getContext('2d');
    
    // Control elements
    const amountSlider = document.getElementById('amount');
    const radiusSlider = document.getElementById('radius');
    const thresholdSlider = document.getElementById('threshold');
    const amountValue = document.getElementById('amountValue');
    const radiusValue = document.getElementById('radiusValue');
    const thresholdValue = document.getElementById('thresholdValue');
    const uploadBtn = document.getElementById('uploadBtn');
    const resetBtn = document.getElementById('resetBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const fileInput = document.getElementById('fileInput');
    
    // Default image
    let originalImage = new Image();
    originalImage.src = 'https://via.placeholder.com/500x300?text=Upload+an+image';
    originalImage.onload = function() {
        drawOriginalImage();
        applyUnsharpMasking();
    };
    
    // Event listeners
    amountSlider.addEventListener('input', updateAmount);
    radiusSlider.addEventListener('input', updateRadius);
    thresholdSlider.addEventListener('input', updateThreshold);
    uploadBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleImageUpload);
    resetBtn.addEventListener('click', resetParameters);
    downloadBtn.addEventListener('click', downloadProcessedImage);
    
    // Update functions for sliders
    function updateAmount() {
        amountValue.textContent = amountSlider.value;
        applyUnsharpMasking();
    }
    
    function updateRadius() {
        radiusValue.textContent = radiusSlider.value;
        applyUnsharpMasking();
    }
    
    function updateThreshold() {
        thresholdValue.textContent = thresholdSlider.value;
        applyUnsharpMasking();
    }
    
    // Handle image upload
    function handleImageUpload(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(event) {
                originalImage.src = event.target.result;
                originalImage.onload = function() {
                    drawOriginalImage();
                    applyUnsharpMasking();
                };
            };
            reader.readAsDataURL(file);
        }
    }
    
    // Reset parameters to default
    function resetParameters() {
        amountSlider.value = 100;
        radiusSlider.value = 1.0;
        thresholdSlider.value = 0;
        amountValue.textContent = '100';
        radiusValue.textContent = '1.0';
        thresholdValue.textContent = '0';
        applyUnsharpMasking();
    }
    
    // Draw original image
    function drawOriginalImage() {
        originalCanvas.width = originalImage.width;
        originalCanvas.height = originalImage.height;
        processedCanvas.width = originalImage.width;
        processedCanvas.height = originalImage.height;
        originalCtx.drawImage(originalImage, 0, 0);
    }
    
    // Apply unsharp masking
    function applyUnsharpMasking() {
        if (!originalImage.complete) return;
        
        const amount = parseFloat(amountSlider.value) / 100;
        const radius = parseFloat(radiusSlider.value);
        const threshold = parseInt(thresholdSlider.value);
        
        // Copy original image data
        originalCtx.drawImage(originalImage, 0, 0);
        const imageData = originalCtx.getImageData(0, 0, originalCanvas.width, originalCanvas.height);
        const data = imageData.data;
        
        // Create a blurred version
        const blurredData = boxBlur(imageData, radius);
        
        // Apply unsharp masking
        for (let i = 0; i < data.length; i += 4) {
            // Calculate difference between original and blurred
            const diffR = data[i] - blurredData[i];
            const diffG = data[i+1] - blurredData[i+1];
            const diffB = data[i+2] - blurredData[i+2];
            
            // Only apply if difference exceeds threshold
            if (Math.abs(diffR) > threshold || Math.abs(diffG) > threshold || Math.abs(diffB) > threshold) {
                data[i] = Math.min(255, Math.max(0, data[i] + diffR * amount));
                data[i+1] = Math.min(255, Math.max(0, data[i+1] + diffG * amount));
                data[i+2] = Math.min(255, Math.max(0, data[i+2] + diffB * amount));
            }
        }
        
        // Draw processed image
        processedCtx.putImageData(imageData, 0, 0);
    }
    
    // Box blur algorithm
    function boxBlur(imageData, radius) {
        const width = imageData.width;
        const height = imageData.height;
        const data = imageData.data;
        const blurredData = new Uint8ClampedArray(data.length);
        
        const radiusInt = Math.floor(radius);
        const area = (2 * radiusInt + 1) * (2 * radiusInt + 1);
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let r = 0, g = 0, b = 0;
                
                for (let dy = -radiusInt; dy <= radiusInt; dy++) {
                    for (let dx = -radiusInt; dx <= radiusInt; dx++) {
                        const nx = Math.min(width - 1, Math.max(0, x + dx));
                        const ny = Math.min(height - 1, Math.max(0, y + dy));
                        const idx = (ny * width + nx) * 4;
                        
                        r += data[idx];
                        g += data[idx + 1];
                        b += data[idx + 2];
                    }
                }
                
                const idx = (y * width + x) * 4;
                blurredData[idx] = r / area;
                blurredData[idx + 1] = g / area;
                blurredData[idx + 2] = b / area;
                blurredData[idx + 3] = data[idx + 3];
            }
        }
        
        return blurredData;
    }
    
    // Download processed image
    function downloadProcessedImage() {
        const link = document.createElement('a');
        link.download = 'unsharp_masked_image.png';
        link.href = processedCanvas.toDataURL('image/png');
        link.click();
    }
});