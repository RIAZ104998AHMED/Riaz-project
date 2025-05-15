let originalImage = null;
let cvReady = false;
let processing = false;

function onOpenCvReady() {
    cvReady = true;
    document.getElementById('status').textContent = 'OpenCV.js is ready. Upload an image to begin.';
    console.log('OpenCV.js is ready');
}

document.addEventListener('DOMContentLoaded', function() {
    const imageUpload = document.getElementById('imageUpload');
    const processBtn = document.getElementById('processBtn');
    const resetBtn = document.getElementById('resetBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const segmentationMode = document.getElementById('segmentationMode');
    const originalCanvas = document.getElementById('originalCanvas');
    const segmentedCanvas = document.getElementById('segmentedCanvas');
    const statusElement = document.getElementById('status');
    
    const originalCtx = originalCanvas.getContext('2d');
    const segmentedCtx = segmentedCanvas.getContext('2d');
    
    // Load image when file is selected
    imageUpload.addEventListener('change', function(e) {
        if (e.target.files.length === 0) return;
        
        const file = e.target.files[0];
        const reader = new FileReader();
        
        reader.onload = function(event) {
            const img = new Image();
            img.onload = function() {
                // Set canvas dimensions to match image
                const maxWidth = 800;
                const scale = Math.min(1, maxWidth / img.width);
                
                originalCanvas.width = img.width * scale;
                originalCanvas.height = img.height * scale;
                segmentedCanvas.width = img.width * scale;
                segmentedCanvas.height = img.height * scale;
                
                // Draw original image
                originalCtx.drawImage(img, 0, 0, originalCanvas.width, originalCanvas.height);
                originalImage = img;
                
                statusElement.textContent = 'Image loaded. Select segmentation mode and click "Process Image".';
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    });
    
    // Process image button
    processBtn.addEventListener('click', async function() {
        if (processing) return;
        
        if (!originalImage) {
            statusElement.textContent = 'Please upload an image first.';
            return;
        }
        
        if (!cvReady) {
            statusElement.textContent = 'OpenCV.js is still loading. Please wait...';
            return;
        }
        
        processing = true;
        processBtn.disabled = true;
        const mode = segmentationMode.value;
        statusElement.textContent = 'Processing image...';
        
        try {
            // Process based on selected mode
            switch(mode) {
                case 'geometric':
                    await detectGeometricShapes();
                    break;
                case 'contours':
                    await detectContours();
                    break;
                case 'advanced':
                    await advancedSegmentation();
                    break;
                default:
                    statusElement.textContent = 'Invalid segmentation mode selected.';
            }
        } catch (err) {
            console.error(err);
            statusElement.textContent = 'Error during processing: ' + err.message;
        } finally {
            processing = false;
            processBtn.disabled = false;
        }
    });
    
    // Reset button
    resetBtn.addEventListener('click', function() {
        if (originalImage) {
            originalCtx.drawImage(originalImage, 0, 0, originalCanvas.width, originalCanvas.height);
            segmentedCtx.clearRect(0, 0, segmentedCanvas.width, segmentedCanvas.height);
            statusElement.textContent = 'Image reset. You can process it again.';
        } else {
            statusElement.textContent = 'No image to reset. Please upload an image first.';
        }
    });
    
    // Download button
    downloadBtn.addEventListener('click', function() {
        if (!originalImage) {
            statusElement.textContent = 'No image to download. Please process an image first.';
            return;
        }
        
        const link = document.createElement('a');
        link.download = 'segmented-image.png';
        link.href = segmentedCanvas.toDataURL('image/png');
        link.click();
        statusElement.textContent = 'Download started.';
    });
    
    // Geometric shapes detection
    async function detectGeometricShapes() {
        return new Promise((resolve) => {
            try {
                // Create OpenCV mat from canvas
                const src = cv.imread(originalCanvas);
                const dst = new cv.Mat();
                const contours = new cv.MatVector();
                const hierarchy = new cv.Mat();
                
                // Convert to grayscale and apply threshold
                cv.cvtColor(src, dst, cv.COLOR_RGBA2GRAY);
                cv.threshold(dst, dst, 120, 200, cv.THRESH_BINARY);
                
                // Find contours
                cv.findContours(dst, contours, hierarchy, cv.RETR_CCOMP, cv.CHAIN_APPROX_SIMPLE);
                
                // Draw contours on segmented canvas
                segmentedCtx.clearRect(0, 0, segmentedCanvas.width, segmentedCanvas.height);
                
                // Convert OpenCV mat to canvas image
                cv.imshow(segmentedCanvas, dst);
                
                // Draw contours with different colors
                for (let i = 0; i < contours.size(); ++i) {
                    const color = new cv.Scalar(
                        Math.round(Math.random() * 255),
                        Math.round(Math.random() * 255),
                        Math.round(Math.random() * 255)
                    );
                    cv.drawContours(src, contours, i, color, 2, cv.LINE_8, hierarchy, 0);
                }
                
                // Draw the result
                cv.imshow(segmentedCanvas, src);
                
                statusElement.textContent = `Found ${contours.size()} geometric shapes.`;
                
                // Clean up
                src.delete();
                dst.delete();
                contours.delete();
                hierarchy.delete();
                resolve();
            } catch (err) {
                statusElement.textContent = 'Error during geometric shape detection: ' + err.message;
                console.error(err);
                resolve();
            }
        });
    }
    
    // Contour detection
    async function detectContours() {
        return new Promise((resolve) => {
            try {
                const src = cv.imread(originalCanvas);
                const dst = cv.Mat.zeros(src.rows, src.cols, cv.CV_8UC3);
                const contours = new cv.MatVector();
                const hierarchy = new cv.Mat();
                
                // Convert to grayscale, blur, and edge detection
                const gray = new cv.Mat();
                cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
                
                const blurred = new cv.Mat();
                cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);
                
                const edges = new cv.Mat();
                cv.Canny(blurred, edges, 50, 150);
                
                // Find contours
                cv.findContours(edges, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
                
                // Draw contours
                for (let i = 0; i < contours.size(); ++i) {
                    const color = new cv.Scalar(
                        Math.round(Math.random() * 255),
                        Math.round(Math.random() * 255),
                        Math.round(Math.random() * 255)
                    );
                    cv.drawContours(dst, contours, i, color, 2, cv.LINE_8, hierarchy, 0);
                }
                
                // Show result
                cv.imshow(segmentedCanvas, dst);
                statusElement.textContent = `Found ${contours.size()} object contours.`;
                
                // Clean up
                src.delete();
                dst.delete();
                gray.delete();
                blurred.delete();
                edges.delete();
                contours.delete();
                hierarchy.delete();
                resolve();
            } catch (err) {
                statusElement.textContent = 'Error during contour detection: ' + err.message;
                console.error(err);
                resolve();
            }
        });
    }

    // Advanced segmentation (simplified and working version)
    async function advancedSegmentation() {
        return new Promise((resolve) => {
            try {
                statusElement.textContent = 'Starting advanced segmentation...';
                
                // Read source image
                const src = cv.imread(originalCanvas);
                const display = new cv.Mat();
                cv.cvtColor(src, display, cv.COLOR_RGBA2BGR); // Convert to BGR for OpenCV
                
                statusElement.textContent = 'Preprocessing image...';
                
                // Convert to grayscale and apply Otsu's thresholding
                const gray = new cv.Mat();
                cv.cvtColor(display, gray, cv.COLOR_BGR2GRAY);
                
                const binary = new cv.Mat();
                cv.threshold(gray, binary, 0, 255, cv.THRESH_BINARY_INV + cv.THRESH_OTSU);
                
                statusElement.textContent = 'Removing noise...';
                
                // Noise removal
                const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(3, 3));
                const opening = new cv.Mat();
                cv.morphologyEx(binary, opening, cv.MORPH_OPEN, kernel, new cv.Point(-1, -1), 2);
                
                statusElement.textContent = 'Finding sure background...';
                
                // Sure background area
                const sureBg = new cv.Mat();
                cv.dilate(opening, sureBg, kernel, new cv.Point(-1, -1), 3);
                
                statusElement.textContent = 'Finding sure foreground...';
                
                // Finding sure foreground area using distance transform
                const distTrans = new cv.Mat();
                cv.distanceTransform(opening, distTrans, cv.DIST_L2, 5);
                
                // Normalize the distance transform for display
                cv.normalize(distTrans, distTrans, 0, 1, cv.NORM_MINMAX);
                
                const sureFg = new cv.Mat();
                cv.threshold(distTrans, sureFg, 0.5, 255, cv.THRESH_BINARY);
                sureFg.convertTo(sureFg, cv.CV_8U);
                
                statusElement.textContent = 'Finding unknown regions...';
                
                // Finding unknown region
                const unknown = new cv.Mat();
                cv.subtract(sureBg, sureFg, unknown);
                
                statusElement.textContent = 'Creating markers...';
                
                // Marker labelling
                const markers = new cv.Mat();
                const numComponents = cv.connectedComponents(sureFg, markers);
                
                // Add one to all labels so that sure background is not 0, but 1
                markers.convertTo(markers, cv.CV_32S);
                for (let i = 0; i < markers.rows; i++) {
                    for (let j = 0; j < markers.cols; j++) {
                        markers.intPtr(i, j)[0] += 1;
                    }
                }
                
                // Mark the unknown region with 0
                for (let i = 0; i < markers.rows; i++) {
                    for (let j = 0; j < markers.cols; j++) {
                        if (unknown.ucharPtr(i, j)[0] === 255) {
                            markers.intPtr(i, j)[0] = 0;
                        }
                    }
                }
                
                statusElement.textContent = 'Applying watershed algorithm...';
                
                // Apply watershed
                cv.watershed(display, markers);
                
                statusElement.textContent = 'Creating output...';
                
                // Create output image
                const result = new cv.Mat(display.rows, display.cols, cv.CV_8UC3, new cv.Scalar(0, 0, 0));
                
                // Color the regions and mark boundaries
                for (let i = 0; i < markers.rows; i++) {
                    for (let j = 0; j < markers.cols; j++) {
                        const index = markers.intPtr(i, j)[0];
                        
                        if (index === -1) {
                            // Boundary - mark in red
                            result.ucharPtr(i, j)[0] = 0;   // B
                            result.ucharPtr(i, j)[1] = 0;   // G
                            result.ucharPtr(i, j)[2] = 255; // R
                        } else if (index > 1) {
                            // Regions - assign random color
                            const r = Math.floor(Math.random() * 255);
                            const g = Math.floor(Math.random() * 255);
                            const b = Math.floor(Math.random() * 255);
                            result.ucharPtr(i, j)[0] = b;
                            result.ucharPtr(i, j)[1] = g;
                            result.ucharPtr(i, j)[2] = r;
                        }
                        // Background (index=1) remains black
                    }
                }
                
                // Show result
                cv.imshow(segmentedCanvas, result);
                statusElement.textContent = 'Advanced segmentation complete!';
                
                // Clean up
                src.delete();
                display.delete();
                gray.delete();
                binary.delete();
                kernel.delete();
                opening.delete();
                sureBg.delete();
                distTrans.delete();
                sureFg.delete();
                unknown.delete();
                markers.delete();
                result.delete();
                
                resolve();
            } catch (err) {
                console.error('Advanced segmentation error:', err);
                statusElement.textContent = 'Error in advanced segmentation: ' + err.message;
                resolve();
            }
        });
    }

   });