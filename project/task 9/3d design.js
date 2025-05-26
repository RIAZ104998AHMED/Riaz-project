document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const canvas = document.getElementById('cubeCanvas');
    const ctx = canvas.getContext('2d');
    const polyhedronType = document.getElementById('polyhedronType');
    const xRotation = document.getElementById('xRotation');
    const yRotation = document.getElementById('yRotation');
    const zRotation = document.getElementById('zRotation');
    const xValue = document.getElementById('xValue');
    const yValue = document.getElementById('yValue');
    const zValue = document.getElementById('zValue');
    const resetBtn = document.getElementById('resetBtn');
    
    // Canvas setup
    function resizeCanvas() {
        const size = Math.min(window.innerWidth * 0.8, 600);
        canvas.width = size;
        canvas.height = size;
        drawPolyhedron();
    }
    
    // Polyhedron data
    const polyhedrons = {
        '4': { // Tetrahedron
            vertices: [
                [1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]
            ],
            faces: [
                [0, 1, 2], [0, 2, 3], [0, 3, 1], [1, 3, 2]
            ],
            faceLabels: ['1', '2', '3', '4']
        },
        '6': { // Cube
            vertices: [
                [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
                [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]
            ],
            faces: [
                [0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4],
                [2, 3, 7, 6], [0, 3, 7, 4], [1, 2, 6, 5]
            ],
            faceLabels: ['1', '2', '3', '4', '5', '6']
        },
        '8': { // Octahedron
            vertices: [
                [1, 0, 0], [-1, 0, 0], [0, 1, 0],
                [0, -1, 0], [0, 0, 1], [0, 0, -1]
            ],
            faces: [
                [0, 2, 4], [0, 4, 3], [0, 3, 5], [0, 5, 2],
                [1, 2, 5], [1, 5, 3], [1, 3, 4], [1, 4, 2]
            ],
            faceLabels: ['1', '2', '3', '4', '5', '6', '7', '8']
        },
        '12': { // Dodecahedron
            // (Simplified vertices for demonstration)
            vertices: (function() {
                const phi = (1 + Math.sqrt(5)) / 2; // Golden ratio
                const vertices = [];
                
                // Generate all permutations of (±1, ±1, ±1)
                for (let x = -1; x <= 1; x += 2) {
                    for (let y = -1; y <= 1; y += 2) {
                        for (let z = -1; z <= 1; z += 2) {
                            vertices.push([x, y, z]);
                        }
                    }
                }
                
                // Add vertices with 0 and ±phi
                const addPermutations = (a, b, c) => {
                    vertices.push([a, b, c], [a, c, b], [b, a, c], 
                                 [b, c, a], [c, a, b], [c, b, a]);
                };
                
                addPermutations(0, 1/phi, phi);
                addPermutations(0, -1/phi, phi);
                addPermutations(0, 1/phi, -phi);
                addPermutations(0, -1/phi, -phi);
                
                return vertices;
            })(),
            faces: [
                // (Simplified face connections for demonstration)
                [0, 8, 10, 2, 18], [0, 18, 12, 4, 16], [0, 16, 14, 6, 8],
                [1, 9, 11, 3, 19], [1, 19, 13, 5, 17], [1, 17, 15, 7, 9],
                [2, 10, 7, 15, 3], [2, 3, 11, 6, 14], [2, 14, 4, 12, 18],
                [4, 12, 5, 13, 19], [4, 19, 1, 17, 16], [5, 12, 18, 0, 16],
                [6, 11, 9, 7, 10], [6, 14, 16, 17, 15], [7, 10, 8, 9, 11],
                [8, 0, 16, 17, 1], [9, 8, 6, 15, 7], [13, 5, 19, 3, 15]
            ],
            faceLabels: Array.from({length: 12}, (_, i) => (i+1).toString())
        },
        '20': { // Icosahedron
            vertices: (function() {
                const phi = (1 + Math.sqrt(5)) / 2; // Golden ratio
                const vertices = [];
                
                // Generate all permutations of (0, ±1, ±phi)
                const addPermutations = (a, b, c) => {
                    vertices.push([a, b, c], [a, c, b], [b, a, c], 
                                 [b, c, a], [c, a, b], [c, b, a]);
                };
                
                addPermutations(0, 1, phi);
                addPermutations(0, -1, phi);
                addPermutations(0, 1, -phi);
                addPermutations(0, -1, -phi);
                
                return vertices;
            })(),
            faces: [
                [0, 1, 2], [0, 2, 3], [0, 3, 4], [0, 4, 5], [0, 5, 1],
                [1, 5, 7], [1, 7, 6], [1, 6, 2], [2, 6, 8], [2, 8, 3],
                [3, 8, 9], [3, 9, 4], [4, 9, 10], [4, 10, 5], [5, 10, 7],
                [6, 7, 11], [6, 11, 8], [7, 10, 11], [8, 11, 9], [9, 11, 10]
            ],
            faceLabels: Array.from({length: 20}, (_, i) => (i+1).toString())
        }
    };
    
    // Rotation state
    let rotation = { x: 0, y: 0, z: 0 };
    
    // Event listeners
    polyhedronType.addEventListener('change', drawPolyhedron);
    xRotation.addEventListener('input', updateRotation);
    yRotation.addEventListener('input', updateRotation);
    zRotation.addEventListener('input', updateRotation);
    resetBtn.addEventListener('click', resetRotation);
    window.addEventListener('resize', resizeCanvas);
    
    // Initialize
    resizeCanvas();
    
    // Update rotation from sliders
    function updateRotation() {
        rotation.x = parseInt(xRotation.value);
        rotation.y = parseInt(yRotation.value);
        rotation.z = parseInt(zRotation.value);
        
        xValue.textContent = rotation.x;
        yValue.textContent = rotation.y;
        zValue.textContent = rotation.z;
        
        drawPolyhedron();
    }
    
    // Reset rotation
    function resetRotation() {
        rotation = { x: 0, y: 0, z: 0 };
        xRotation.value = 0;
        yRotation.value = 0;
        zRotation.value = 0;
        xValue.textContent = '0';
        yValue.textContent = '0';
        zValue.textContent = '0';
        drawPolyhedron();
    }
    
    // Draw the current polyhedron
    function drawPolyhedron() {
        const type = polyhedronType.value;
        const polyhedron = polyhedrons[type];
        
        if (!polyhedron) return;
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Project 3D points to 2D
        const projected = projectVertices(polyhedron.vertices);
        
        // Draw faces
        drawFaces(polyhedron.faces, projected, polyhedron.faceLabels);
    }
    
    // Project 3D vertices to 2D with current rotation
    function projectVertices(vertices) {
        const center = canvas.width / 2;
        const scale = center * 0.8;
        
        return vertices.map(vertex => {
            // Apply rotations
            let [x, y, z] = vertex;
            
            // Rotate around X axis
            const radX = rotation.x * Math.PI / 180;
            const cosX = Math.cos(radX);
            const sinX = Math.sin(radX);
            const y1 = y * cosX - z * sinX;
            const z1 = y * sinX + z * cosX;
            
            // Rotate around Y axis
            const radY = rotation.y * Math.PI / 180;
            const cosY = Math.cos(radY);
            const sinY = Math.sin(radY);
            const x2 = x * cosY + z1 * sinY;
            const z2 = -x * sinY + z1 * cosY;
            
            // Rotate around Z axis
            const radZ = rotation.z * Math.PI / 180;
            const cosZ = Math.cos(radZ);
            const sinZ = Math.sin(radZ);
            const x3 = x2 * cosZ - y1 * sinZ;
            const y3 = x2 * sinZ + y1 * cosZ;
            
            // Perspective projection
            const distance = 5;
            const factor = distance / (distance - z2);
            const px = x3 * factor * scale + center;
            const py = -y3 * factor * scale + center;
            
            return { x: px, y: py, z: z2 };
        });
    }
    
    // Draw all faces with back-face culling
    function drawFaces(faces, projected, labels) {
        // Calculate face depths and sort back to front
        const sortedFaces = faces.map((face, i) => {
            const depth = face.reduce((sum, index) => sum + projected[index].z, 0) / face.length;
            return { indices: face, depth, label: labels[i] };
        }).sort((a, b) => b.depth - a.depth);
        
        // Draw each face
        sortedFaces.forEach(face => {
            const points = face.indices.map(index => projected[index]);
            
            // Simple back-face culling
            if (isFaceVisible(points)) {
                drawFace(points, face.label);
            }
        });
    }
    
    // Check if face is visible (simple back-face culling)
    function isFaceVisible(points) {
        if (points.length < 3) return true;
        
        // Calculate normal vector using first 3 points
        const p0 = points[0];
        const p1 = points[1];
        const p2 = points[2];
        
        const ux = p1.x - p0.x;
        const uy = p1.y - p0.y;
        const vx = p2.x - p0.x;
        const vy = p2.y - p0.y;
        
        // Cross product (z component only)
        const crossZ = ux * vy - uy * vx;
        
        // Face is visible if cross product is positive
        return crossZ > 0;
    }
    
    // Draw a single face
    function drawFace(points, label) {
        if (points.length < 2) return;
        
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        
        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y);
        }
        
        ctx.closePath();
        
        // Face style
        ctx.fillStyle = `hsl(${Math.random() * 360}, 70%, 80%)`;
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        
        ctx.fill();
        ctx.stroke();
        
        // Draw label
        if (label) {
            const center = getFaceCenter(points);
            ctx.fillStyle = '#333';
            ctx.font = `${Math.max(12, canvas.width / 15)}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(label, center.x, center.y);
        }
    }
    
    // Calculate center point of a face
    function getFaceCenter(points) {
        const center = { x: 0, y: 0 };
        
        points.forEach(point => {
            center.x += point.x;
            center.y += point.y;
        });
        
        center.x /= points.length;
        center.y /= points.length;
        
        return center;
    }
});