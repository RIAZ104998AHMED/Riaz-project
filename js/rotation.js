document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const imageUpload = document.getElementById('imageUpload');
    const fileInfo = document.getElementById('fileInfo');
    const simpleDegrees = document.getElementById('simpleDegrees');
    const simpleRotateBtn = document.getElementById('simpleRotateBtn');
    const advancedDegrees = document.getElementById('advancedDegrees');
    const advancedRotateBtn = document.getElementById('advancedRotateBtn');
    const angleDisplay = document.getElementById('angleDisplay');
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const downloadBtn = document.getElementById('downloadBtn');

    let uploadedImage = null;

    // Initialize canvas with placeholder
    canvas.width = 300;
    canvas.height = 200;
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#999';
    ctx.textAlign = 'center';
    ctx.font = '16px Arial';
    ctx.fillText('Upload an image to begin', canvas.width/2, canvas.height/2);

    // Event Listeners
    imageUpload.addEventListener('change', handleImageUpload);
    simpleRotateBtn.addEventListener('click', () => rotateImage(parseInt(simpleDegrees.value)));
    advancedRotateBtn.addEventListener('click', () => rotateImage(parseInt(advancedDegrees.value)));
    advancedDegrees.addEventListener('input', updateAngleDisplay);
    downloadBtn.addEventListener('click', downloadImage);

    function updateAngleDisplay() {
        angleDisplay.textContent = `${advancedDegrees.value}°`;
    }

    function handleImageUpload(e) {
        const file = e.target.files[0];
        if (!file) {
            fileInfo.textContent = 'No file selected';
            return;
        }

        fileInfo.textContent = `Selected: ${file.name}`;
        downloadBtn.disabled = true;

        const reader = new FileReader();
        reader.onerror = () => {
            fileInfo.textContent = 'Error reading file';
            console.error('FileReader error');
        };
        reader.onload = (event) => {
            uploadedImage = new Image();
            uploadedImage.onerror = () => {
                fileInfo.textContent = 'Error loading image';
                console.error('Image load error');
            };
            uploadedImage.onload = () => {
                resetCanvasToOriginal();
                downloadBtn.disabled = false;
            };
            uploadedImage.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }

    function resetCanvasToOriginal() {
        if (!uploadedImage) return;
        
        canvas.width = uploadedImage.width;
        canvas.height = uploadedImage.height;
        ctx.drawImage(uploadedImage, 0, 0);
    }

    function rotateImage(degrees) {
        if (!uploadedImage) {
            alert('Please upload an image first!');
            return;
        }

        const radians = degrees * Math.PI / 180;
        const sin = Math.abs(Math.sin(radians));
        const cos = Math.abs(Math.cos(radians));

        // Calculate new canvas size
        let newWidth, newHeight;
        if (degrees % 90 === 0) {
            // Simple rotation (90° increments)
            newWidth = degrees % 180 === 0 ? uploadedImage.width : uploadedImage.height;
            newHeight = degrees % 180 === 0 ? uploadedImage.height : uploadedImage.width;
        } else {
            // Advanced rotation (any angle)
            newWidth = Math.floor(uploadedImage.width * cos + uploadedImage.height * sin);
            newHeight = Math.floor(uploadedImage.width * sin + uploadedImage.height * cos);
        }

        // Create temporary canvas for rotation
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = newWidth;
        tempCanvas.height = newHeight;

        // Rotate and draw
        tempCtx.translate(newWidth / 2, newHeight / 2);
        tempCtx.rotate(radians);
        tempCtx.drawImage(uploadedImage, -uploadedImage.width / 2, -uploadedImage.height / 2);

        // Update main canvas
        canvas.width = newWidth;
        canvas.height = newHeight;
        ctx.drawImage(tempCanvas, 0, 0);

        downloadBtn.disabled = false;
    }

    function downloadImage() {
        if (!uploadedImage) {
            alert('No image to download!');
            return;
        }

        try {
            const link = document.createElement('a');
            link.download = `rotated-${new Date().getTime()}.png`;
            link.href = canvas.toDataURL('image/png');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error('Download failed:', error);
            alert('Failed to download image. Please try again.');
        }
    }
});