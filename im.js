document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const uploadInput = document.getElementById('image-upload');
    const scaleFactorInput = document.getElementById('scale-factor');
    const scaleValue = document.getElementById('scale-value');
    const algorithmSelect = document.getElementById('algorithm');
    const antiAliasingSelect = document.getElementById('anti-aliasing');
    const downloadBtn = document.getElementById('download-btn');
    const originalCanvas = document.getElementById('original-canvas');
    const scaledCanvas = document.getElementById('scaled-canvas');
    const originalInfo = document.getElementById('original-info');
    const scaledInfo = document.getElementById('scaled-info');
    
    const originalCtx = originalCanvas.getContext('2d', { willReadFrequently: true });
    const scaledCtx = scaledCanvas.getContext('2d', { willReadFrequently: true });
    
    let originalImage = null;
    let isProcessing = false;
    
    // Event Listeners
    uploadInput.addEventListener('change', handleImageUpload);
    scaleFactorInput.addEventListener('input', updateScaleValue);
    scaleFactorInput.addEventListener('change', applyScaling);
    algorithmSelect.addEventListener('change', applyScaling);
    antiAliasingSelect.addEventListener('change', applyScaling);
    downloadBtn.addEventListener('click', downloadImage);
    
    // Initialize
    updateScaleValue();
    
    // Functions
    function handleImageUpload(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            originalImage = new Image();
            originalImage.onload = () => {
                displayOriginalImage();
                applyScaling();
            };
            originalImage.onerror = () => {
                alert('Error loading image');
            };
            originalImage.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }
    
    function displayOriginalImage() {
        originalCanvas.width = originalImage.naturalWidth;
        originalCanvas.height = originalImage.naturalHeight;
        originalCtx.drawImage(originalImage, 0, 0);
        
        originalInfo.textContent = `${originalImage.naturalWidth} × ${originalImage.naturalHeight} pixels`;
    }
    
    function updateScaleValue() {
        const value = scaleFactorInput.value;
        scaleValue.textContent = `${value}%`;
    }
    
    function applyScaling() {
        if (!originalImage || isProcessing) return;
        
        isProcessing = true;
        const scaleFactor = parseInt(scaleFactorInput.value) / 100;
        const algorithm = algorithmSelect.value;
        const antiAliasing = antiAliasingSelect.value;
        
        // Calculate new dimensions
        const newWidth = Math.max(1, Math.floor(originalImage.naturalWidth * scaleFactor));
        const newHeight = Math.max(1, Math.floor(originalImage.naturalHeight * scaleFactor));
        
        // Update scaled canvas size
        scaledCanvas.width = newWidth;
        scaledCanvas.height = newHeight;
        
        // Show processing indicator
        scaledInfo.textContent = "Processing...";
        
        // Use setTimeout to allow UI to update before heavy computation
        setTimeout(() => {
            try {
                if (antiAliasing === 'none') {
                    scaleImage(originalImage, scaledCtx, newWidth, newHeight, algorithm);
                } else {
                    applyAntiAliasing(originalImage, scaledCtx, newWidth, newHeight, algorithm, antiAliasing);
                }
                
                scaledInfo.textContent = `${newWidth} × ${newHeight} pixels | ${algorithm} | ${antiAliasing}`;
            } catch (error) {
                console.error('Scaling error:', error);
                scaledInfo.textContent = "Error processing image";
            } finally {
                isProcessing = false;
            }
        }, 50);
    }
    
    function scaleImage(source, targetCtx, targetWidth, targetHeight, algorithm) {
        // Create temporary canvas for the source image
        const sourceCanvas = document.createElement('canvas');
        sourceCanvas.width = source.naturalWidth;
        sourceCanvas.height = source.naturalHeight;
        const sourceCtx = sourceCanvas.getContext('2d');
        sourceCtx.drawImage(source, 0, 0);
        
        // Apply different scaling algorithms
        switch (algorithm) {
            case 'nearest':
                targetCtx.imageSmoothingEnabled = false;
                targetCtx.drawImage(sourceCanvas, 0, 0, targetWidth, targetHeight);
                break;
                
            case 'bilinear':
                targetCtx.imageSmoothingEnabled = true;
                targetCtx.imageSmoothingQuality = 'low';
                targetCtx.drawImage(sourceCanvas, 0, 0, targetWidth, targetHeight);
                break;
                
            case 'bicubic':
                // Custom bicubic implementation for better quality
                bicubicInterpolation(sourceCanvas, targetCtx, targetWidth, targetHeight);
                break;
                
            case 'lanczos':
                // Custom Lanczos implementation for sharp results
                lanczosResampling(sourceCanvas, targetCtx, targetWidth, targetHeight);
                break;
        }
    }
    
    function applyAntiAliasing(source, targetCtx, targetWidth, targetHeight, algorithm, aaMethod) {
        let superSamplingFactor = 2;
        
        if (aaMethod === 'ssaa') {
            // Super Sampling Anti-Aliasing (render at higher resolution then downscale)
            const ssWidth = targetWidth * superSamplingFactor;
            const ssHeight = targetHeight * superSamplingFactor;
            
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = ssWidth;
            tempCanvas.height = ssHeight;
            const tempCtx = tempCanvas.getContext('2d');
            
            // Scale up with selected algorithm
            scaleImage(source, tempCtx, ssWidth, ssHeight, algorithm);
            
            // Then scale down with bilinear filtering
            targetCtx.imageSmoothingEnabled = true;
            targetCtx.imageSmoothingQuality = 'high';
            targetCtx.drawImage(tempCanvas, 0, 0, ssWidth, ssHeight, 0, 0, targetWidth, targetHeight);
        } else if (aaMethod === 'msaa') {
            // Multi-Sample Anti-Aliasing (custom implementation)
            multiSampleScale(source, targetCtx, targetWidth, targetHeight, algorithm);
        }
    }
    
    // Advanced scaling algorithms
    function bicubicInterpolation(sourceCanvas, targetCtx, targetWidth, targetHeight) {
        const sourceData = sourceCanvas.getContext('2d').getImageData(
            0, 0, sourceCanvas.width, sourceCanvas.height).data;
        const targetImageData = targetCtx.createImageData(targetWidth, targetHeight);
        
        const widthRatio = sourceCanvas.width / targetWidth;
        const heightRatio = sourceCanvas.height / targetHeight;
        
        for (let y = 0; y < targetHeight; y++) {
            for (let x = 0; x < targetWidth; x++) {
                const srcX = x * widthRatio;
                const srcY = y * heightRatio;
                
                const px = Math.floor(srcX);
                const py = Math.floor(srcY);
                const fx = srcX - px;
                const fy = srcY - py;
                
                // Get surrounding 4x4 pixels
                const pixels = [];
                for (let j = -1; j <= 2; j++) {
                    for (let i = -1; i <= 2; i++) {
                        const sampleX = Math.max(0, Math.min(sourceCanvas.width - 1, px + i));
                        const sampleY = Math.max(0, Math.min(sourceCanvas.height - 1, py + j));
                        
                        const pos = (sampleY * sourceCanvas.width + sampleX) * 4;
                        pixels.push({
                            r: sourceData[pos],
                            g: sourceData[pos + 1],
                            b: sourceData[pos + 2],
                            a: sourceData[pos + 3]
                        });
                    }
                }
                
                // Bicubic interpolation for each channel
                const r = bicubicInterpolate(pixels.map(p => p.r), fx, fy);
                const g = bicubicInterpolate(pixels.map(p => p.g), fx, fy);
                const b = bicubicInterpolate(pixels.map(p => p.b), fx, fy);
                const a = bicubicInterpolate(pixels.map(p => p.a), fx, fy);
                
                const pos = (y * targetWidth + x) * 4;
                targetImageData.data[pos] = r;
                targetImageData.data[pos + 1] = g;
                targetImageData.data[pos + 2] = b;
                targetImageData.data[pos + 3] = a;
            }
        }
        
        targetCtx.putImageData(targetImageData, 0, 0);
    }
    
    function bicubicInterpolate(pixels, fx, fy) {
        // Convert 4x4 grid to 1D array (row-major order)
        const cubic = (t, a, b, c, d) => {
            t = Math.max(0, Math.min(1, t));
            return t * t * t * (-a + 3 * b - 3 * c + d) / 6 +
                   t * t * (3 * a - 6 * b + 3 * c) / 6 +
                   t * (-a + c) / 2 +
                   b;
        };
        
        // Interpolate along x for each row
        const rowInterp = [];
        for (let row = 0; row < 4; row++) {
            const offset = row * 4;
            rowInterp[row] = cubic(fx, 
                pixels[offset], pixels[offset + 1], pixels[offset + 2], pixels[offset + 3]);
        }
        
        // Then interpolate the results along y
        return cubic(fy, rowInterp[0], rowInterp[1], rowInterp[2], rowInterp[3]);
    }
    
    function lanczosResampling(sourceCanvas, targetCtx, targetWidth, targetHeight) {
        const sourceData = sourceCanvas.getContext('2d').getImageData(
            0, 0, sourceCanvas.width, sourceCanvas.height).data;
        const targetImageData = targetCtx.createImageData(targetWidth, targetHeight);
        
        const widthRatio = sourceCanvas.width / targetWidth;
        const heightRatio = sourceCanvas.height / targetHeight;
        
        // Lanczos kernel radius (typically 2 or 3)
        const a = 2;
        
        for (let y = 0; y < targetHeight; y++) {
            for (let x = 0; x < targetWidth; x++) {
                const srcX = x * widthRatio;
                const srcY = y * heightRatio;
                
                let r = 0, g = 0, b = 0, a = 0;
                let weightSum = 0;
                
                // Sample surrounding pixels within the kernel radius
                const xMin = Math.max(0, Math.floor(srcX) - a + 1);
                const xMax = Math.min(sourceCanvas.width - 1, Math.floor(srcX) + a);
                const yMin = Math.max(0, Math.floor(srcY) - a + 1);
                const yMax = Math.min(sourceCanvas.height - 1, Math.floor(srcY) + a);
                
                for (let j = yMin; j <= yMax; j++) {
                    for (let i = xMin; i <= xMax; i++) {
                        const dx = srcX - i;
                        const dy = srcY - j;
                        
                        // Lanczos kernel function
                        const lx = lanczosKernel(dx, a);
                        const ly = lanczosKernel(dy, a);
                        const weight = lx * ly;
                        
                        const pos = (j * sourceCanvas.width + i) * 4;
                        r += sourceData[pos] * weight;
                        g += sourceData[pos + 1] * weight;
                        b += sourceData[pos + 2] * weight;
                        a += sourceData[pos + 3] * weight;
                        
                        weightSum += weight;
                    }
                }
                
                // Normalize
                const pos = (y * targetWidth + x) * 4;
                targetImageData.data[pos] = Math.max(0, Math.min(255, r / weightSum));
                targetImageData.data[pos + 1] = Math.max(0, Math.min(255, g / weightSum));
                targetImageData.data[pos + 2] = Math.max(0, Math.min(255, b / weightSum));
                targetImageData.data[pos + 3] = Math.max(0, Math.min(255, a / weightSum));
            }
        }
        
        targetCtx.putImageData(targetImageData, 0, 0);
    }
    
    function lanczosKernel(x, a) {
        if (x === 0) return 1;
        if (Math.abs(x) >= a) return 0;
        
        const pix = Math.PI * x;
        return a * Math.sin(pix) * Math.sin(pix / a) / (pix * pix);
    }
    
    function multiSampleScale(source, targetCtx, targetWidth, targetHeight, algorithm) {
        // Create temporary canvas
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = targetWidth;
        tempCanvas.height = targetHeight;
        const tempCtx = tempCanvas.getContext('2d');
        
        // First do a standard scale
        scaleImage(source, tempCtx, targetWidth, targetHeight, algorithm);
        
        // Then apply edge detection and smoothing
        const imageData = tempCtx.getImageData(0, 0, targetWidth, targetHeight);
        const data = imageData.data;
        
        // Simple edge-preserving smoothing
        for (let y = 1; y < targetHeight - 1; y++) {
            for (let x = 1; x < targetWidth - 1; x++) {
                const pos = (y * targetWidth + x) * 4;
                
                // Only smooth non-edge areas
                if (!isEdgePixel(data, pos, targetWidth)) {
                    // Simple 3x3 box blur for non-edge pixels
                    let r = 0, g = 0, b = 0, count = 0;
                    
                    for (let j = -1; j <= 1; j++) {
                        for (let i = -1; i <= 1; i++) {
                            const samplePos = ((y + j) * targetWidth + (x + i)) * 4;
                            r += data[samplePos];
                            g += data[samplePos + 1];
                            b += data[samplePos + 2];
                            count++;
                        }
                    }
                    
                    data[pos] = r / count;
                    data[pos + 1] = g / count;
                    data[pos + 2] = b / count;
                }
            }
        }
        
        tempCtx.putImageData(imageData, 0, 0);
        targetCtx.drawImage(tempCanvas, 0, 0);
    }
    
    function isEdgePixel(data, pos, width) {
        // Simple edge detection using gradient
        const left = pos - 4;
        const right = pos + 4;
        const top = pos - width * 4;
        const bottom = pos + width * 4;
        
        const gradient = (
            Math.abs(data[pos] - data[left]) +
            Math.abs(data[pos] - data[right]) +
            Math.abs(data[pos] - data[top]) +
            Math.abs(data[pos] - data[bottom])
        ) / 4;
        
        return gradient > 30; // Threshold for edge detection
    }
    
    function downloadImage() {
        if (!originalImage) {
            alert('Please upload an image first');
            return;
        }
        
        const link = document.createElement('a');
        link.download = `scaled-image-${scaleFactorInput.value}percent.png`;
        link.href = scaledCanvas.toDataURL('image/png');
        link.click();
    }
});