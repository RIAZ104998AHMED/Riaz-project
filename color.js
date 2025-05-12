class ImageFilterApp {
    constructor() {
      this.canvas = document.getElementById('imageCanvas');
      this.ctx = this.canvas.getContext('2d');
      this.uploadInput = document.getElementById('imageUpload');
      this.filterButtons = document.querySelectorAll('[data-filter]');
      this.downloadBtn = document.getElementById('downloadBtn');
      this.resetBtn = document.getElementById('resetBtn');
      this.edgeThreshold = document.getElementById('edgeThreshold');
      this.pixelSize = document.getElementById('pixelSize');
      
      this.originalImageData = null;
      this.currentImage = null;
      
      this.init();
    }
  
    init() {
      this.uploadInput.addEventListener('change', this.handleImageUpload.bind(this));
      this.filterButtons.forEach(btn => {
        btn.addEventListener('click', () => this.applyFilter(btn.dataset.filter));
      });
      this.downloadBtn.addEventListener('click', this.downloadImage.bind(this));
      this.resetBtn.addEventListener('click', this.resetImage.bind(this));
    }
  
    handleImageUpload(e) {
      const file = e.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          this.currentImage = img;
          this.setCanvasSize(img.width, img.height);
          this.drawImage(img);
          this.originalImageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    }
  
    setCanvasSize(width, height) {
      const maxWidth = 800;
      const maxHeight = 600;
      let ratio = 1;
      
      if (width > maxWidth) {
        ratio = maxWidth / width;
      }
      if (height * ratio > maxHeight) {
        ratio = maxHeight / height;
      }
      
      this.canvas.width = width * ratio;
      this.canvas.height = height * ratio;
    }
  
    drawImage(img) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);
    }
  
    applyFilter(filter) {
      if (!this.currentImage) {
        alert('Please upload an image first');
        return;
      }
      
      this.drawImage(this.currentImage);
      const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
      
      switch(filter) {
        case 'grayscale':
          this.applyGrayscale(imageData.data);
          break;
        case 'sepia':
          this.applySepia(imageData.data);
          break;
        case 'invert':
          this.applyInvert(imageData.data);
          break;
        case 'vintage':
          this.applyVintage(imageData.data);
          break;
        case 'edge':
          this.applyEdgeDetection();
          return; // Edge detection handles its own putImageData
        case 'pixelate':
          this.applyPixelate(parseInt(this.pixelSize.value));
          return;
        case 'emboss':
          this.applyEmboss();
          return;
      }
      
      this.ctx.putImageData(imageData, 0, 0);
    }
  
    // Basic Filters
    applyGrayscale(data) {
      for (let i = 0; i < data.length; i += 4) {
        const avg = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        data[i] = data[i + 1] = data[i + 2] = avg;
      }
    }
  
    applySepia(data) {
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        data[i] = Math.min(255, (r * 0.393) + (g * 0.769) + (b * 0.189));
        data[i + 1] = Math.min(255, (r * 0.349) + (g * 0.686) + (b * 0.168));
        data[i + 2] = Math.min(255, (r * 0.272) + (g * 0.534) + (b * 0.131));
      }
    }
  
    applyInvert(data) {
      for (let i = 0; i < data.length; i += 4) {
        data[i] = 255 - data[i];
        data[i + 1] = 255 - data[i + 1];
        data[i + 2] = 255 - data[i + 2];
      }
    }
  
    applyVintage(data) {
      for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.min(255, data[i] * 0.9);
        data[i + 1] = Math.min(255, data[i + 1] * 0.8);
        data[i + 2] = Math.min(255, data[i + 2] * 0.5);
        
        // Add slight noise
        const noise = Math.random() * 20 - 10;
        data[i] = Math.min(255, Math.max(0, data[i] + noise));
        data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
        data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
      }
    }
  
    // Advanced Filters
    applyEdgeDetection() {
      // 1. Convert to grayscale first
      const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
      const grayscaleData = new Uint8ClampedArray(imageData.data.length);
      
      for (let i = 0; i < imageData.data.length; i += 4) {
        const r = imageData.data[i];
        const g = imageData.data[i + 1];
        const b = imageData.data[i + 2];
        grayscaleData[i] = grayscaleData[i+1] = grayscaleData[i+2] = 
          Math.round(0.299 * r + 0.587 * g + 0.114 * b);
        grayscaleData[i+3] = 255;
      }
  
      // 2. Apply Sobel operator
      const sobelData = new Uint8ClampedArray(imageData.data.length);
      const kernelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
      const kernelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
      const threshold = parseInt(this.edgeThreshold.value);
  
      for (let y = 1; y < this.canvas.height - 1; y++) {
        for (let x = 1; x < this.canvas.width - 1; x++) {
          let pixelX = 0;
          let pixelY = 0;
          let idx = (y * this.canvas.width + x) * 4;
  
          // Convolution with Sobel kernels
          for (let ky = -1; ky <= 1; ky++) {
            for (let kx = -1; kx <= 1; kx++) {
              const kidx = (ky + 1) * 3 + (kx + 1);
              const tidx = ((y + ky) * this.canvas.width + (x + kx)) * 4;
              
              pixelX += grayscaleData[tidx] * kernelX[kidx];
              pixelY += grayscaleData[tidx] * kernelY[kidx];
            }
          }
  
          // Calculate gradient magnitude
          const magnitude = Math.sqrt(pixelX * pixelX + pixelY * pixelY) > threshold ? 255 : 0;
          
          sobelData[idx] = sobelData[idx+1] = sobelData[idx+2] = magnitude;
          sobelData[idx+3] = 255;
        }
      }
  
      // 3. Apply to canvas
      imageData.data.set(sobelData);
      this.ctx.putImageData(imageData, 0, 0);
    }
  
    applyPixelate(pixelSize) {
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');
      tempCanvas.width = this.canvas.width;
      tempCanvas.height = this.canvas.height;
      tempCtx.drawImage(this.canvas, 0, 0);
      
      // Downsample
      const smallWidth = Math.ceil(this.canvas.width / pixelSize);
      const smallHeight = Math.ceil(this.canvas.height / pixelSize);
      tempCtx.drawImage(tempCanvas, 0, 0, smallWidth, smallHeight);
      
      // Upsample
      this.ctx.imageSmoothingEnabled = false;
      this.ctx.drawImage(tempCanvas, 0, 0, smallWidth, smallHeight, 
        0, 0, this.canvas.width, this.canvas.height);
      this.ctx.imageSmoothingEnabled = true;
    }
  
    applyEmboss() {
      const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
      const embossData = new Uint8ClampedArray(imageData.data.length);
      const kernel = [-2, -1, 0, -1, 1, 1, 0, 1, 2];
      
      // Convert to grayscale first
      const grayscaleData = new Uint8ClampedArray(imageData.data.length);
      for (let i = 0; i < imageData.data.length; i += 4) {
        const r = imageData.data[i];
        const g = imageData.data[i + 1];
        const b = imageData.data[i + 2];
        grayscaleData[i] = grayscaleData[i+1] = grayscaleData[i+2] = 
          Math.round(0.299 * r + 0.587 * g + 0.114 * b);
        grayscaleData[i+3] = 255;
      }
  
      for (let y = 1; y < this.canvas.height - 1; y++) {
        for (let x = 1; x < this.canvas.width - 1; x++) {
          let embossValue = 0;
          let idx = (y * this.canvas.width + x) * 4;
  
          // Apply emboss kernel
          for (let ky = -1; ky <= 1; ky++) {
            for (let kx = -1; kx <= 1; kx++) {
              const kidx = (ky + 1) * 3 + (kx + 1);
              const tidx = ((y + ky) * this.canvas.width + (x + kx)) * 4;
              embossValue += grayscaleData[tidx] * kernel[kidx];
            }
          }
  
          // Normalize and add offset
          embossValue = Math.min(255, Math.max(0, embossValue + 128));
          
          embossData[idx] = embossData[idx+1] = embossData[idx+2] = embossValue;
          embossData[idx+3] = 255;
        }
      }
  
      imageData.data.set(embossData);
      this.ctx.putImageData(imageData, 0, 0);
    }
  
    downloadImage() {
      if (!this.currentImage) {
        alert('No image to download');
        return;
      }
      
      const link = document.createElement('a');
      link.download = 'filtered-image.png';
      link.href = this.canvas.toDataURL('image/png');
      link.click();
    }
  
    resetImage() {
      if (this.originalImageData) {
        this.ctx.putImageData(this.originalImageData, 0, 0);
      }
    }
  }
  
  // Initialize the app when DOM is loaded
  document.addEventListener('DOMContentLoaded', () => {
    new ImageFilterApp();
  });