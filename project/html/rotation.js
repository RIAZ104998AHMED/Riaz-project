document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const imageUpload = document.getElementById('imageUpload');
    const presetRotation = document.getElementById('presetRotation');
    const customAngleGroup = document.getElementById('customAngleGroup');
    const customAngle = document.getElementById('customAngle');
    const rotateBtn = document.getElementById('rotateBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const autoResize = document.getElementById('autoResize');
    const originalCanvas = document.getElementById('originalCanvas');
    const rotatedCanvas = document.getElementById('rotatedCanvas');
    const originalCtx = originalCanvas.getContext('2d');
    const rotatedCtx = rotatedCanvas.getContext('2d');
    
    let currentImage = null;
    
    // Event listeners
    imageUpload.addEventListener('change', handleImageUpload);
    presetRotation.addEventListener('change', function() {
        customAngleGroup.classList.toggle('hidden', this.value !== 'custom');
    });
    rotateBtn.addEventListener('click', rotateImage);
    downloadBtn.addEventListener('click', downloadImage);
    
    // Handle image upload
    function handleImageUpload(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(event) {
            const img = new Image();
            img.onload = function() {
                currentImage = img;
                drawOriginalImage();
                // Reset rotation to 0 when new image is loaded
                presetRotation.value = '0';
                customAngleGroup.classList.add('hidden');
                // Auto-rotate if needed
                rotateImage();
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }
    
    // Draw original image on canvas
    function drawOriginalImage() {
        if (!currentImage) return;
        
        originalCanvas.width = currentImage.width;
        originalCanvas.height = currentImage.height;
        originalCtx.clearRect(0, 0, originalCanvas.width, originalCanvas.height);
        originalCtx.drawImage(currentImage, 0, 0);
    }
    
    // Rotate image based on selected options
    function rotateImage() {
        if (!currentImage) {
            alert('Please upload an image first.');
            return;
        }
        
        const angle = presetRotation.value === 'custom' 
            ? parseFloat(customAngle.value) 
            : parseFloat(presetRotation.value);
        
        if (angle % 90 === 0) {
            rotateBy90(angle);
        } else {
            rotateArbitrary(angle);
        }
    }
    
    // Rotate by 90, 180, or 270 degrees (optimized)
    function rotateBy90(angle) {
        const radians = angle * Math.PI / 180;
        const sin = Math.abs(Math.sin(radians));
        const cos = Math.abs(Math.cos(radians));
        
        // Calculate new canvas dimensions
        let newWidth, newHeight;
        if (angle % 180 === 0) {
            newWidth = currentImage.width;
            newHeight = currentImage.height;
        } else {
            newWidth = currentImage.height;
            newHeight = currentImage.width;
        }
        
        // Set canvas size
        rotatedCanvas.width = newWidth;
        rotatedCanvas.height = newHeight;
        rotatedCtx.clearRect(0, 0, rotatedCanvas.width, rotatedCanvas.height);
        
        // Move to center, rotate, then draw
        rotatedCtx.save();
        rotatedCtx.translate(rotatedCanvas.width / 2, rotatedCanvas.height / 2);
        rotatedCtx.rotate(radians);
        rotatedCtx.drawImage(
            currentImage, 
            -currentImage.width / 2, 
            -currentImage.height / 2
        );
        rotatedCtx.restore();
    }
    
    // Rotate by arbitrary angle (handles canvas resizing)
    function rotateArbitrary(angle) {
        const radians = angle * Math.PI / 180;
        const sin = Math.abs(Math.sin(radians));
        const cos = Math.abs(Math.cos(radians));
        
        // Calculate new canvas dimensions
        let newWidth, newHeight;
        if (autoResize.checked) {
            newWidth = Math.ceil(currentImage.width * cos + currentImage.height * sin);
            newHeight = Math.ceil(currentImage.width * sin + currentImage.height * cos);
        } else {
            // Keep original dimensions, but image might be cropped
            newWidth = currentImage.width;
            newHeight = currentImage.height;
        }
        
        // Set canvas size
        rotatedCanvas.width = newWidth;
        rotatedCanvas.height = newHeight;
        rotatedCtx.clearRect(0, 0, rotatedCanvas.width, rotatedCanvas.height);
        
        // Move to center, rotate, then draw
        rotatedCtx.save();
        rotatedCtx.translate(rotatedCanvas.width / 2, rotatedCanvas.height / 2);
        rotatedCtx.rotate(radians);
        rotatedCtx.drawImage(
            currentImage, 
            -currentImage.width / 2, 
            -currentImage.height / 2
        );
        rotatedCtx.restore();
    }
    
    // Download rotated image
    function downloadImage() {
        if (!rotatedCanvas.width || !rotatedCanvas.height) {
            alert('No rotated image to download.');
            return;
        }
        
        const link = document.createElement('a');
        link.download = 'rotated-image.png';
        link.href = rotatedCanvas.toDataURL('image/png');
        link.click();
    }
});