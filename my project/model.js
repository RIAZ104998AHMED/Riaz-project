document.addEventListener('DOMContentLoaded', function() {
    // Algorithm URLs mapping
    const algorithmUrls = {
        'rotation': 'http://127.0.0.1:5500/project/html/index.html',
        'filters': 'http://127.0.0.1:5500/project/task%202/test.html',
        'scaling': 'http://127.0.0.1:5500/project/task%203/im.html',
        'segmentation': 'http://127.0.0.1:5500/project/task%204/image%20seg.html',
        'splines': 'http://127.0.0.1:5500/project/task%205/spline.html',
        'retouching': 'http://127.0.0.1:5500/project/task%206/image%20retouching.html',
        'unsharp': 'http://127.0.0.1:5500/project/task%207/unshape%20masking.html',
        'filtering': 'http://127.0.0.1:5500/project/task%208/b%20and%20t.html',
        'cube3d': 'http://127.0.0.1:5500/project/task%209/3d%20cube.html'
    };
    
    // DOM elements
    const bioSection = document.getElementById('bio');
    const algorithmsMenu = document.getElementById('algorithms-menu');
    const viewAlgorithmsBtn = document.getElementById('view-algorithms');
    const backButton = document.getElementById('back-button');
    
    // Navigation functions
    viewAlgorithmsBtn.addEventListener('click', function() {
        bioSection.classList.remove('active');
        algorithmsMenu.classList.add('active');
        backButton.style.display = 'block';
    });
    
    backButton.addEventListener('click', function() {
        algorithmsMenu.classList.remove('active');
        bioSection.classList.add('active');
        backButton.style.display = 'none';
    });
    
    // Algorithm card click handler
    document.querySelectorAll('.algorithm-card').forEach(card => {
        card.addEventListener('click', function() {
            const algoName = this.getAttribute('data-algo');
            if (algorithmUrls[algoName]) {
                window.open(algorithmUrls[algoName], '_blank');
            }
        });
    });
});