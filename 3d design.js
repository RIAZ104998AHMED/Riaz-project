const cube = document.getElementById('cube');
const xRotation = document.getElementById('x-rotation');
const yRotation = document.getElementById('y-rotation');
const zRotation = document.getElementById('z-rotation');
const xValue = document.getElementById('x-value');
const yValue = document.getElementById('y-value');
const zValue = document.getElementById('z-value');
const facesSelect = document.getElementById('faces');
const updateFacesBtn = document.getElementById('update-faces');

let currentFaces = 6;

// Initialize the cube
createD6Cube();

// Event listeners for rotation controls
xRotation.addEventListener('input', updateRotation);
yRotation.addEventListener('input', updateRotation);
zRotation.addEventListener('input', updateRotation);

// Event listener for face selection
updateFacesBtn.addEventListener('click', () => {
    const selectedFaces = parseInt(facesSelect.value);
    createPolyhedron(selectedFaces);
});

// Update rotation display
function updateRotation() {
    const x = xRotation.value;
    const y = yRotation.value;
    const z = zRotation.value;
    
    xValue.textContent = `${x}°`;
    yValue.textContent = `${y}°`;
    zValue.textContent = `${z}°`;
    
    cube.style.transform = `rotateX(${x}deg) rotateY(${y}deg) rotateZ(${z}deg)`;
}

// Create a D6 cube
function createD6Cube() {
    cube.innerHTML = '';
    
    // Front face
    createFace(0, 0, 100, '1', 'rotateY(0deg)');
    // Back face
    createFace(0, 0, -100, '6', 'rotateY(180deg)');
    // Right face
    createFace(100, 0, 0, '3', 'rotateY(90deg)');
    // Left face
    createFace(-100, 0, 0, '4', 'rotateY(-90deg)');
    // Top face
    createFace(0, -100, 0, '5', 'rotateX(90deg)');
    // Bottom face
    createFace(0, 100, 0, '2', 'rotateX(-90deg)');
}

// Create a face for the cube
function createFace(x, y, z, text, rotation) {
    const face = document.createElement('div');
    face.className = 'face';
    face.textContent = text;
    face.style.transform = `translate3d(${x}px, ${y}px, ${z}px) ${rotation}`;
    cube.appendChild(face);
}

// Create a different polyhedron based on number of faces
function createPolyhedron(faces) {
    cube.innerHTML = '';
    currentFaces = faces;
    
    if (faces === 4) {
        createTetrahedron();
    } else if (faces === 6) {
        createD6Cube();
    } else if (faces === 8) {
        createOctahedron();
    } else if (faces === 12) {
        createDodecahedron();
    } else if (faces === 20) {
        createIcosahedron();
    }
}

// Tetrahedron (4 faces)
function createTetrahedron() {
    const size = 100;
    const angle = Math.PI / 180 * 70.5;
    
    // Base triangle
    createPolygonFace(0, size * Math.sin(angle), 0, '1', 'rotateX(0deg)', 3);
    createPolygonFace(size * Math.cos(angle), -size * Math.sin(angle), size * Math.sin(angle), '2', 'rotateY(120deg) rotateX(109.5deg)', 3);
    createPolygonFace(size * Math.cos(angle), -size * Math.sin(angle), -size * Math.sin(angle), '3', 'rotateY(-120deg) rotateX(109.5deg)', 3);
    createPolygonFace(-size * Math.cos(angle), -size * Math.sin(angle), 0, '4', 'rotateY(180deg) rotateX(109.5deg)', 3);
}

// Octahedron (8 faces)
function createOctahedron() {
    const size = 100;
    
    // Top pyramid
    createPolygonFace(0, -size, 0, '1', 'rotateX(0deg)', 4);
    createPolygonFace(0, 0, size, '2', 'rotateX(90deg) rotateY(0deg)', 3);
    createPolygonFace(size, 0, 0, '3', 'rotateX(90deg) rotateY(90deg)', 3);
    createPolygonFace(0, 0, -size, '4', 'rotateX(90deg) rotateY(180deg)', 3);
    createPolygonFace(-size, 0, 0, '5', 'rotateX(90deg) rotateY(270deg)', 3);
    
    // Bottom pyramid
    createPolygonFace(0, size, 0, '6', 'rotateX(180deg)', 4);
}

// Dodecahedron (12 faces) - simplified version
function createDodecahedron() {
    for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2;
        const x = 100 * Math.cos(angle);
        const z = 100 * Math.sin(angle);
        const y = (i % 2 === 0) ? 50 : -50;
        createPolygonFace(x, y, z, (i+1).toString(), `rotateY(${angle * 180/Math.PI}deg) rotateX(${i % 2 === 0 ? 20 : -20}deg)`, 5);
    }
}

// Icosahedron (20 faces) - simplified version
function createIcosahedron() {
    for (let i = 0; i < 20; i++) {
        const angle = (i / 20) * Math.PI * 2;
        const x = 100 * Math.cos(angle);
        const z = 100 * Math.sin(angle);
        const y = (i % 2 === 0) ? 30 : -30;
        createPolygonFace(x, y, z, (i+1).toString(), `rotateY(${angle * 180/Math.PI}deg) rotateX(${i % 2 === 0 ? 10 : -10}deg)`, 3);
    }
}

// Create a polygonal face
function createPolygonFace(x, y, z, text, rotation, sides) {
    const face = document.createElement('div');
    face.className = 'face';
    face.textContent = text;
    
    // Create polygon shape using clip-path
    const points = [];
    for (let i = 0; i < sides; i++) {
        const angle = (i / sides) * Math.PI * 2;
        const px = 50 + 45 * Math.cos(angle);
        const py = 50 + 45 * Math.sin(angle);
        points.push(`${px}% ${py}%`);
    }
    face.style.clipPath = `polygon(${points.join(', ')})`;
    
    face.style.transform = `translate3d(${x}px, ${y}px, ${z}px) ${rotation}`;
    cube.appendChild(face);
}