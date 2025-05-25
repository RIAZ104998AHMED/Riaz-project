document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const imageUpload = document.getElementById('imageUpload');
    const fileInfo = document.getElementById('fileInfo');
    const simpleDegrees = document.getElementById('simpleDegrees');
    const simpleRotateBtn = document.getElementById('simpleRotateBtn');
    const advancedRotateBtn = document.getElementById('advancedRotateBtn');
    const angleInput = document.getElementById('angleInput');
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const downloadBtn = document.getElementById('downloadBtn');

    let uploadedImage = null;
    let currentRotation = 0;

    // Initialize canvas with placeholder
    function initCanvas() {
        canvas.width = 300;
        canvas.height = 200;
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#999';
        ctx.textAlign = 'center';
        ctx.font = '16px Arial';
        ctx.fillText('Upload an image to begin', canvas.width/2, canvas.height/2);
    }

    initCanvas();

    // Event Listeners
    imageUpload.addEventListener('change', handleImageUpload);
    simpleRotateBtn.addEventListener('click', () => rotateImage(parseInt(simpleDegrees.value)));
    advancedRotateBtn.addEventListener('click', () => {
        let degrees = parseInt(angleInput.value);
        if (isNaN(degrees)) degrees = 0;
        degrees = Math.max(0, Math.min(360, degrees));
        rotateImage(degrees);
    });
    downloadBtn.addEventListener('click', downloadImage);

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
        
        currentRotation = 0;
        canvas.width = uploadedImage.width;
        canvas.height = uploadedImage.height;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(uploadedImage, 0, 0);
    }

    function rotateImage(degrees) {
        if (!uploadedImage) {
            alert('Please upload an image first!');
            return;
        }

        currentRotation += degrees;
        currentRotation %= 360;
        
        const radians = currentRotation * Math.PI / 180;
        const sin = Math.abs(Math.sin(radians));
        const cos = Math.abs(Math.cos(radians));

        // Calculate new canvas size
        const newWidth = Math.floor(uploadedImage.width * cos + uploadedImage.height * sin);
        const newHeight = Math.floor(uploadedImage.width * sin + uploadedImage.height * cos);

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
        ctx.clearRect(0, 0, canvas.width, canvas.height);
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
            link.download = `rotated-image-${currentRotation}deg.png`;
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