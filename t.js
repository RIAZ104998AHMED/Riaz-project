document.addEventListener('DOMContentLoaded', function() {
    // Canvas elements
    const originalCanvas = document.getElementById('originalCanvas');
    const transformedCanvas = document.getElementById('transformedCanvas');
    const originalCtx = originalCanvas.getContext('2d');
    const transformedCtx = transformedCanvas.getContext('2d');
    
    // Control elements
    const uploadBtn = document.getElementById('uploadBtn');
    const transformBtn = document.getElementById('transformBtn');
    const resetBtn = document.getElementById('resetBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const fileInput = document.getElementById('fileInput');
    const originalPointsStatus = document.getElementById('originalPointsStatus');
    const transformedPointsStatus = document.getElementById('transformedPointsStatus');
    
    // State variables
    let originalImage = new Image();
    let originalPoints = [];
    let transformedPoints = [];
    let pointMarkers = [];
    
    // Default image
    originalImage.src = 'https://via.placeholder.com/500x300?text=Upload+an+image';
    originalImage.onload = function() {
        initializeCanvases();
    };
    
    // Event listeners
    uploadBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleImageUpload);
    transformBtn.addEventListener('click', applyTransformation);
    resetBtn.addEventListener('click', resetPoints);
    downloadBtn.addEventListener('click', downloadResult);
    
    // Canvas click handlers
    originalCanvas.addEventListener('click', function(e) {
        if (originalPoints.length >= 3) return;
        
        const rect = originalCanvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        originalPoints.push({ x, y });
        updatePointMarkers();
        updateStatus();
    });
    
    transformedCanvas.addEventListener('click', function(e) {
        if (transformedPoints.length >= 3) return;
        
        const rect = transformedCanvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        transformedPoints.push({ x, y });
        updatePointMarkers();
        updateStatus();
    });
    
    // Initialize canvases with the same dimensions
    function initializeCanvases() {
        originalCanvas.width = originalImage.width;
        originalCanvas.height = originalImage.height;
        transformedCanvas.width = originalImage.width;
        transformedCanvas.height = originalImage.height;
        
        originalCtx.drawImage(originalImage, 0, 0);
        transformedCtx.fillStyle = '#f0f0f0';
        transformedCtx.fillRect(0, 0, transformedCanvas.width, transformedCanvas.height);
    }
    
    // Handle image upload
    function handleImageUpload(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(event) {
                originalImage.src = event.target.result;
                originalImage.onload = function() {
                    resetPoints();
                    initializeCanvases();
                };
            };
            reader.readAsDataURL(file);
        }
    }
    
    // Update point markers on canvases
    function updatePointMarkers() {
        // Clear existing markers
        pointMarkers.forEach(marker => marker.remove());
        pointMarkers = [];
        
        // Add markers for original points
        originalPoints.forEach((point, index) => {
            const marker = document.createElement('div');
            marker.className = 'point-marker';
            marker.style.left = originalCanvas.offsetLeft + point.x + 'px';
            marker.style.top = originalCanvas.offsetTop + point.y + 'px';
            marker.textContent = index + 1;
            marker.style.color = 'white';
            marker.style.textAlign = 'center';
            marker.style.lineHeight = '10px';
            marker.style.fontSize = '8px';
            document.body.appendChild(marker);
            pointMarkers.push(marker);
        });
        
        // Add markers for transformed points
        transformedPoints.forEach((point, index) => {
            const marker = document.createElement('div');
            marker.className = 'point-marker';
            marker.style.left = transformedCanvas.offsetLeft + point.x + 'px';
            marker.style.top = transformedCanvas.offsetTop + point.y + 'px';
            marker.textContent = index + 1;
            marker.style.color = 'white';
            marker.style.textAlign = 'center';
            marker.style.lineHeight = '10px';
            marker.style.fontSize = '8px';
            document.body.appendChild(marker);
            pointMarkers.push(marker);
        });
    }
    
    // Update status text
    function updateStatus() {
        originalPointsStatus.textContent = `(${originalPoints.length}/3 points selected)`;
        transformedPointsStatus.textContent = `(${transformedPoints.length}/3 points selected)`;
        
        transformBtn.disabled = !(originalPoints.length === 3 && transformedPoints.length === 3);
    }
    
    // Reset all points
    function resetPoints() {
        originalPoints = [];
        transformedPoints = [];
        pointMarkers.forEach(marker => marker.remove());
        pointMarkers = [];
        
        transformedCtx.fillStyle = '#f0f0f0';
        transformedCtx.fillRect(0, 0, transformedCanvas.width, transformedCanvas.height);
        
        updateStatus();
    }
    
    // Apply the transformation
    function applyTransformation() {
        if (originalPoints.length !== 3 || transformedPoints.length !== 3) return;
        
        // Calculate the affine transformation matrix
        const matrix = calculateAffineTransform(
            originalPoints[0], originalPoints[1], originalPoints[2],
            transformedPoints[0], transformedPoints[1], transformedPoints[2]
        );
        
        // Determine if we're scaling up or down
        const originalArea = triangleArea(originalPoints[0], originalPoints[1], originalPoints[2]);
        const transformedArea = triangleArea(transformedPoints[0], transformedPoints[1], transformedPoints[2]);
        const isScalingDown = transformedArea < originalArea;
        
        // Get image data
        const originalImageData = originalCtx.getImageData(0, 0, originalCanvas.width, originalCanvas.height);
        
        // Clear transformed canvas
        transformedCtx.clearRect(0, 0, transformedCanvas.width, transformedCanvas.height);
        
        // Apply transformation with appropriate filtering
        if (isScalingDown) {
            applyTrilinearFiltering(originalImageData, matrix);
        } else {
            applyBilinearFiltering(originalImageData, matrix);
        }
    }
    
    // Calculate affine transformation matrix
    function calculateAffineTransform(p1, p2, p3, q1, q2, q3) {
        // Solve the system of equations to find the affine transformation
        const A = [
            [p1.x, p1.y, 1, 0, 0, 0],
            [0, 0, 0, p1.x, p1.y, 1],
            [p2.x, p2.y, 1, 0, 0, 0],
            [0, 0, 0, p2.x, p2.y, 1],
            [p3.x, p3.y, 1, 0, 0, 0],
            [0, 0, 0, p3.x, p3.y, 1]
        ];
        
        const b = [q1.x, q1.y, q2.x, q2.y, q3.x, q3.y];
        
        // Solve Ax = b using Gaussian elimination
        const x = solveLinearSystem(A, b);
        
        return [
            [x[0], x[1], x[2]],
            [x[3], x[4], x[5]],
            [0, 0, 1]
        ];
    }
    
    // Solve linear system Ax = b
    function solveLinearSystem(A, b) {
        const n = A.length;
        const x = new Array(n);
        
        // Forward elimination
        for (let i = 0; i < n; i++) {
            // Search for maximum in this column
            let maxEl = Math.abs(A[i][i]);
            let maxRow = i;
            for (let k = i + 1; k < n; k++) {
                if (Math.abs(A[k][i]) > maxEl) {
                    maxEl = Math.abs(A[k][i]);
                    maxRow = k;
                }
            }
            
            // Swap maximum row with current row
            for (let k = i; k < n; k++) {
                const tmp = A[maxRow][k];
                A[maxRow][k] = A[i][k];
                A[i][k] = tmp;
            }
            const tmp = b[maxRow];
            b[maxRow] = b[i];
            b[i] = tmp;
            
            // Make all rows below this one 0 in current column
            for (let k = i + 1; k < n; k++) {
                const c = -A[k][i] / A[i][i];
                for (let j = i; j < n; j++) {
                    if (i === j) {
                        A[k][j] = 0;
                    } else {
                        A[k][j] += c * A[i][j];
                    }
                }
                b[k] += c * b[i];
            }
        }
        
        // Back substitution
        for (let i = n - 1; i >= 0; i--) {
            x[i] = b[i] / A[i][i];
            for (let k = i - 1; k >= 0; k--) {
                b[k] -= A[k][i] * x[i];
            }
        }
        
        return x;
    }
    
    // Calculate triangle area
    function triangleArea(a, b, c) {
        return Math.abs((a.x*(b.y-c.y) + b.x*(c.y-a.y) + c.x*(a.y-b.y))/2);
    }
    
    // Apply bilinear filtering (for scaling up)
    function applyBilinearFiltering(sourceImageData, matrix) {
        const width = transformedCanvas.width;
        const height = transformedCanvas.height;
        const outputImageData = transformedCtx.createImageData(width, height);
        
        // Calculate inverse matrix for backward mapping
        const invMatrix = invertMatrix(matrix);
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                // Transform destination pixel to source coordinates
                const srcX = invMatrix[0][0] * x + invMatrix[0][1] * y + invMatrix[0][2];
                const srcY = invMatrix[1][0] * x + invMatrix[1][1] * y + invMatrix[1][2];
                
                // Perform bilinear interpolation
                const x1 = Math.floor(srcX);
                const y1 = Math.floor(srcY);
                const x2 = Math.ceil(srcX);
                const y2 = Math.ceil(srcY);
                
                // Check bounds
                if (x1 < 0 || y1 < 0 || x2 >= sourceImageData.width || y2 >= sourceImageData.height) {
                    continue;
                }
                
                // Get surrounding pixels
                const idx11 = (y1 * sourceImageData.width + x1) * 4;
                const idx12 = (y1 * sourceImageData.width + x2) * 4;
                const idx21 = (y2 * sourceImageData.width + x1) * 4;
                const idx22 = (y2 * sourceImageData.width + x2) * 4;
                
                // Calculate weights
                const wx = srcX - x1;
                const wy = srcY - y1;
                
                // Interpolate each channel
                const outputIdx = (y * width + x) * 4;
                for (let c = 0; c < 3; c++) {
                    const val = bilinearInterpolate(
                        sourceImageData.data[idx11 + c],
                        sourceImageData.data[idx12 + c],
                        sourceImageData.data[idx21 + c],
                        sourceImageData.data[idx22 + c],
                        wx, wy
                    );
                    outputImageData.data[outputIdx + c] = val;
                }
                outputImageData.data[outputIdx + 3] = 255; // Alpha channel
            }
        }
        
        transformedCtx.putImageData(outputImageData, 0, 0);
    }
    
    // Apply trilinear filtering (for scaling down)
    function applyTrilinearFiltering(sourceImageData, matrix) {
        const width = transformedCanvas.width;
        const height = transformedCanvas.height;
        const outputImageData = transformedCtx.createImageData(width, height);
        
        // Calculate inverse matrix for backward mapping
        const invMatrix = invertMatrix(matrix);
        
        // Create mipmaps
        const mipmaps = generateMipmaps(sourceImageData);
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                // Transform destination pixel to source coordinates
                const srcX = invMatrix[0][0] * x + invMatrix[0][1] * y + invMatrix[0][2];
                const srcY = invMatrix[1][0] * x + invMatrix[1][1] * y + invMatrix[1][2];
                
                // Calculate the appropriate mipmap level based on scaling factor
                const scaleFactor = Math.sqrt(
                    Math.pow(invMatrix[0][0], 2) + Math.pow(invMatrix[0][1], 2) +
                    Math.pow(invMatrix[1][0], 2) + Math.pow(invMatrix[1][1], 2)
                ) / 2;
                
                const mipLevel = Math.min(Math.log2(scaleFactor), mipmaps.length - 1);
                const level1 = Math.floor(mipLevel);
                const level2 = Math.ceil(mipLevel);
                const t = mipLevel - level1;
                
                // Sample from both mip levels
                let r1, g1, b1, r2, g2, b2;
                
                if (level1 === level2) {
                    // Only one level to sample from
                    const sample = sampleMipmap(mipmaps[level1], srcX / Math.pow(2, level1), srcY / Math.pow(2, level1));
                    r1 = r2 = sample.r;
                    g1 = g2 = sample.g;
                    b1 = b2 = sample.b;
                } else {
                    // Sample from both levels
                    const sample1 = sampleMipmap(mipmaps[level1], srcX / Math.pow(2, level1), srcY / Math.pow(2, level1));
                    const sample2 = sampleMipmap(mipmaps[level2], srcX / Math.pow(2, level2), srcY / Math.pow(2, level2));
                    r1 = sample1.r; g1 = sample1.g; b1 = sample1.b;
                    r2 = sample2.r; g2 = sample2.g; b2 = sample2.b;
                }
                
                // Interpolate between levels
                const outputIdx = (y * width + x) * 4;
                outputImageData.data[outputIdx] = r1 * (1 - t) + r2 * t;
                outputImageData.data[outputIdx + 1] = g1 * (1 - t) + g2 * t;
                outputImageData.data[outputIdx + 2] = b1 * (1 - t) + b2 * t;
                outputImageData.data[outputIdx + 3] = 255; // Alpha channel
            }
        }
        
        transformedCtx.putImageData(outputImageData, 0, 0);
    }
    
    // Generate mipmaps for trilinear filtering
    function generateMipmaps(sourceImageData) {
        const mipmaps = [sourceImageData];
        let currentWidth = sourceImageData.width;
        let currentHeight = sourceImageData.height;
        
        while (currentWidth > 1 || currentHeight > 1) {
            const nextWidth = Math.max(1, Math.floor(currentWidth / 2));
            const nextHeight = Math.max(1, Math.floor(currentHeight / 2));
            const nextImageData = new ImageData(nextWidth, nextHeight);
            
            const srcData = mipmaps[mipmaps.length - 1].data;
            const dstData = nextImageData.data;
            
            for (let y = 0; y < nextHeight; y++) {
                for (let x = 0; x < nextWidth; x++) {
                    // Average 2x2 block from previous level
                    const srcX = x * 2;
                    const srcY = y * 2;
                    
                    const idx1 = (srcY * currentWidth + srcX) * 4;
                    const idx2 = (srcY * currentWidth + Math.min(srcX + 1, currentWidth - 1)) * 4;
                    const idx3 = (Math.min(srcY + 1, currentHeight - 1) * currentWidth + srcX) * 4;
                    const idx4 = (Math.min(srcY + 1, currentHeight - 1) * currentWidth + Math.min(srcX + 1, currentWidth - 1)) * 4;
                    
                    const dstIdx = (y * nextWidth + x) * 4;
                    
                    for (let c = 0; c < 3; c++) {
                        dstData[dstIdx + c] = (
                            srcData[idx1 + c] + srcData[idx2 + c] + 
                            srcData[idx3 + c] + srcData[idx4 + c]
                        ) / 4;
                    }
                    dstData[dstIdx + 3] = 255; // Alpha channel
                }
            }
            
            mipmaps.push(nextImageData);
            currentWidth = nextWidth;
            currentHeight = nextHeight;
        }
        
        return mipmaps;
    }
    
    // Sample from a mipmap with bilinear filtering
    function sampleMipmap(mipmap, x, y) {
        const x1 = Math.floor(x);
        const y1 = Math.floor(y);
        const x2 = Math.ceil(x);
        const y2 = Math.ceil(y);
        
        // Clamp coordinates
        const clampedX1 = Math.max(0, Math.min(mipmap.width - 1, x1));
        const clampedY1 = Math.max(0, Math.min(mipmap.height - 1, y1));
        const clampedX2 = Math.max(0, Math.min(mipmap.width - 1, x2));
        const clampedY2 = Math.max(0, Math.min(mipmap.height - 1, y2));
        
        // Get pixel indices
        const idx11 = (clampedY1 * mipmap.width + clampedX1) * 4;
        const idx12 = (clampedY1 * mipmap.width + clampedX2) * 4;
        const idx21 = (clampedY2 * mipmap.width + clampedX1) * 4;
        const idx22 = (clampedY2 * mipmap.width + clampedX2) * 4;
        
        // Calculate weights
        const wx = x - x1;
        const wy = y - y1;
        
        // Interpolate
        return {
            r: bilinearInterpolate(
                mipmap.data[idx11],
                mipmap.data[idx12],
                mipmap.data[idx21],
                mipmap.data[idx22],
                wx, wy
            ),
            g: bilinearInterpolate(
                mipmap.data[idx11 + 1],
                mipmap.data[idx12 + 1],
                mipmap.data[idx21 + 1],
                mipmap.data[idx22 + 1],
                wx, wy
            ),
            b: bilinearInterpolate(
                mipmap.data[idx11 + 2],
                mipmap.data[idx12 + 2],
                mipmap.data[idx21 + 2],
                mipmap.data[idx22 + 2],
                wx, wy
            )
        };
    }
    
    // Bilinear interpolation
    function bilinearInterpolate(v11, v12, v21, v22, wx, wy) {
        return v11 * (1 - wx) * (1 - wy) + 
               v12 * wx * (1 - wy) + 
               v21 * (1 - wx) * wy + 
               v22 * wx * wy;
    }
    
    // Invert a 3x3 matrix
    function invertMatrix(m) {
        const a = m[0][0], b = m[0][1], c = m[0][2];
        const d = m[1][0], e = m[1][1], f = m[1][2];
        const g = m[2][0], h = m[2][1], i = m[2][2];
        
        const det = a*(e*i - f*h) - b*(d*i - f*g) + c*(d*h - e*g);
        
        if (Math.abs(det) < 1e-10) {
            return [
                [1, 0, 0],
                [0, 1, 0],
                [0, 0, 1]
            ];
        }
        
        const invDet = 1 / det;
        
        return [
            [
                (e*i - f*h) * invDet,
                (c*h - b*i) * invDet,
                (b*f - c*e) * invDet
            ],
            [
                (f*g - d*i) * invDet,
                (a*i - c*g) * invDet,
                (c*d - a*f) * invDet
            ],
            [
                (d*h - e*g) * invDet,
                (b*g - a*h) * invDet,
                (a*e - b*d) * invDet
            ]
        ];
    }
    
    // Download the result
    function downloadResult() {
        const link = document.createElement('a');
        link.download = 'transformed_image.png';
        link.href = transformedCanvas.toDataURL('image/png');
        link.click();
    }
});