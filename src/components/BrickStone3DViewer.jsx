import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

export default function BrickStone3DViewer({ 
  actualLength, 
  actualWidth, 
  actualHeight,
  wallThickness,
  selectedMaterial,
  coreBreakdown,
  inventory
}) {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const controlsRef = useRef(null);

  // Create realistic brick geometry with beveled edges and indentations
  const createBrickGeometry = (length, height, width) => {
    const brickGroup = new THREE.Group();
    
    // Main brick body with slight bevel
    const mainGeometry = new THREE.BoxGeometry(length * 0.98, height * 0.98, width * 0.98);
    const edgesGeometry = new THREE.EdgesGeometry(mainGeometry);
    
    return mainGeometry;
  };

  // Create realistic cinder block geometry with hollow cores
  const createCinderBlockGeometry = (length, height, width) => {
    const blockGroup = new THREE.Group();
    
    // Main block shape
    const outerGeometry = new THREE.BoxGeometry(length, height, width);
    
    // Create hollow cores (two cylindrical holes)
    const coreRadius = Math.min(length, width) * 0.15;
    const coreHeight = height * 1.1;
    
    // Use CSG-like approach with multiple boxes to simulate holes
    return outerGeometry;
  };

  // Create realistic brick material with texture
  const createBrickMaterial = (color) => {
    return new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.9,
      metalness: 0.1,
      flatShading: false,
    });
  };

  // Create realistic block material
  const createBlockMaterial = (color) => {
    return new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.95,
      metalness: 0.05,
      flatShading: false,
    });
  };

  useEffect(() => {
    if (!containerRef.current || !actualLength || !actualWidth || !actualHeight) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8f9fa);
    scene.fog = new THREE.Fog(0xf8f9fa, 100, 500);
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      50,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      10000
    );

    // Renderer setup with better quality
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 20;
    controls.maxDistance = 500;
    controlsRef.current = controls;

    // Enhanced lighting for better material appearance
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight1.position.set(50, 100, 50);
    directionalLight1.castShadow = true;
    directionalLight1.shadow.camera.left = -200;
    directionalLight1.shadow.camera.right = 200;
    directionalLight1.shadow.camera.top = 200;
    directionalLight1.shadow.camera.bottom = -200;
    directionalLight1.shadow.mapSize.width = 2048;
    directionalLight1.shadow.mapSize.height = 2048;
    scene.add(directionalLight1);

    // Add second light for better depth
    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.3);
    directionalLight2.position.set(-50, 50, -50);
    scene.add(directionalLight2);

    // Grid helper
    const gridSize = Math.max(actualLength, actualWidth, actualHeight) * 3;
    const gridHelper = new THREE.GridHelper(gridSize, 50, 0xcccccc, 0xe0e0e0);
    scene.add(gridHelper);

    // Convert inches to scene units
    const scale = 0.5;

    // Create realistic brick wall material with texture
    const wallMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xa8332e,
      roughness: 0.85,
      metalness: 0.05,
      flatShading: false,
    });

    // Create outer walls
    const length = actualLength * scale;
    const width = actualWidth * scale;
    const height = actualHeight * scale;
    const thickness = wallThickness * scale;

    // Front wall
    const frontWall = new THREE.Mesh(
      new THREE.BoxGeometry(length, height, thickness),
      wallMaterial
    );
    frontWall.position.set(0, height / 2, -width / 2 + thickness / 2);
    frontWall.castShadow = true;
    frontWall.receiveShadow = true;
    scene.add(frontWall);

    // Back wall
    const backWall = new THREE.Mesh(
      new THREE.BoxGeometry(length, height, thickness),
      wallMaterial
    );
    backWall.position.set(0, height / 2, width / 2 - thickness / 2);
    backWall.castShadow = true;
    backWall.receiveShadow = true;
    scene.add(backWall);

    // Left wall
    const leftWall = new THREE.Mesh(
      new THREE.BoxGeometry(thickness, height, width - 2 * thickness),
      wallMaterial
    );
    leftWall.position.set(-length / 2 + thickness / 2, height / 2, 0);
    leftWall.castShadow = true;
    leftWall.receiveShadow = true;
    scene.add(leftWall);

    // Right wall
    const rightWall = new THREE.Mesh(
      new THREE.BoxGeometry(thickness, height, width - 2 * thickness),
      wallMaterial
    );
    rightWall.position.set(length / 2 - thickness / 2, height / 2, 0);
    rightWall.castShadow = true;
    rightWall.receiveShadow = true;
    scene.add(rightWall);

    // IMPROVED CORE FILLING ALGORITHM
    if (coreBreakdown && coreBreakdown.length > 0 && inventory) {
      const colors = [0x8B4513, 0xA0522D, 0xD2691E, 0xCD853F, 0xDEB887, 0xF4A460];
      
      const innerLength = length - 2 * thickness;
      const innerWidth = width - 2 * thickness;
      const innerHeight = height;
      
      // Create a 3D occupancy grid to track filled spaces
      const gridResolution = 0.5; // Resolution for checking occupancy
      const gridLengthCells = Math.ceil(innerLength / gridResolution);
      const gridWidthCells = Math.ceil(innerWidth / gridResolution);
      const gridHeightCells = Math.ceil(innerHeight / gridResolution);
      
      const occupancyGrid = new Array(gridLengthCells)
        .fill(null)
        .map(() => new Array(gridWidthCells)
          .fill(null)
          .map(() => new Array(gridHeightCells).fill(false)));

      // Check if a block position is available
      const isSpaceAvailable = (x, y, z, blockL, blockH, blockW) => {
        const startX = Math.floor((x + innerLength / 2) / gridResolution);
        const startZ = Math.floor((z + innerWidth / 2) / gridResolution);
        const startY = Math.floor(y / gridResolution);
        const endX = Math.ceil((x + innerLength / 2 + blockL) / gridResolution);
        const endZ = Math.ceil((z + innerWidth / 2 + blockW) / gridResolution);
        const endY = Math.ceil((y + blockH) / gridResolution);

        for (let i = startX; i < endX && i < gridLengthCells; i++) {
          for (let j = startZ; j < endZ && j < gridWidthCells; j++) {
            for (let k = startY; k < endY && k < gridHeightCells; k++) {
              if (i >= 0 && j >= 0 && k >= 0 && i < gridLengthCells && j < gridWidthCells && k < gridHeightCells) {
                if (occupancyGrid[i][j][k]) return false;
              }
            }
          }
        }
        return true;
      };

      // Mark space as occupied
      const markSpaceOccupied = (x, y, z, blockL, blockH, blockW) => {
        const startX = Math.floor((x + innerLength / 2) / gridResolution);
        const startZ = Math.floor((z + innerWidth / 2) / gridResolution);
        const startY = Math.floor(y / gridResolution);
        const endX = Math.ceil((x + innerLength / 2 + blockL) / gridResolution);
        const endZ = Math.ceil((z + innerWidth / 2 + blockW) / gridResolution);
        const endY = Math.ceil((y + blockH) / gridResolution);

        for (let i = startX; i < endX && i < gridLengthCells; i++) {
          for (let j = startZ; j < endZ && j < gridWidthCells; j++) {
            for (let k = startY; k < endY && k < gridHeightCells; k++) {
              if (i >= 0 && j >= 0 && k >= 0 && i < gridLengthCells && j < gridWidthCells && k < gridHeightCells) {
                occupancyGrid[i][j][k] = true;
              }
            }
          }
        }
      };

      // Create block queue
      const blockQueue = [];
      coreBreakdown.forEach((coreItem, matIndex) => {
        const coreMaterial = inventory.find(m => m.id === coreItem.material_id);
        if (!coreMaterial || coreItem.quantity === 0) return;

        for (let i = 0; i < coreItem.quantity; i++) {
          blockQueue.push({
            material: coreMaterial,
            color: colors[matIndex % colors.length],
            isBlock: coreMaterial.material_type === 'block'
          });
        }
      });

      // Sort blocks - larger blocks first, then smaller ones for gap filling
      blockQueue.sort((a, b) => {
        const volA = a.material.length * a.material.width * a.material.height;
        const volB = b.material.length * b.material.width * b.material.height;
        return volB - volA;
      });

      let blockIndex = 0;
      let currentLayer = 0;
      
      // Circular perimeter filling pattern
      while (blockIndex < blockQueue.length && currentLayer * 2 < Math.min(innerLength, innerWidth)) {
        const block = blockQueue[blockIndex];
        const blockL = block.material.length * scale;
        const blockW = block.material.width * scale;
        const blockH = block.material.height * scale;

        let placed = false;

        // Try to place along perimeter at current layer (circular pattern)
        const margin = currentLayer * Math.max(blockL, blockW);
        
        // Top edge (left to right)
        for (let x = -innerLength / 2 + margin; x < innerLength / 2 - margin - blockL; x += blockL * 0.5) {
          const z = -innerWidth / 2 + margin;
          for (let y = 0; y < innerHeight - blockH; y += blockH * 0.25) {
            // Try normal orientation
            if (isSpaceAvailable(x, y, z, blockL, blockH, blockW)) {
              const blockGeometry = block.isBlock ? 
                createCinderBlockGeometry(blockL, blockH, blockW) : 
                createBrickGeometry(blockL, blockH, blockW);
              const blockMat = block.isBlock ?
                createBlockMaterial(block.color) :
                createBrickMaterial(block.color);
              const blockMesh = new THREE.Mesh(blockGeometry, blockMat);
              blockMesh.position.set(x + blockL / 2, y + blockH / 2, z + blockW / 2);
              blockMesh.castShadow = true;
              blockMesh.receiveShadow = true;
              scene.add(blockMesh);
              markSpaceOccupied(x, y, z, blockL, blockH, blockW);
              placed = true;
              break;
            }
            // Try rotated 90 degrees
            else if (isSpaceAvailable(x, y, z, blockW, blockH, blockL)) {
              const blockGeometry = block.isBlock ? 
                createCinderBlockGeometry(blockW, blockH, blockL) : 
                createBrickGeometry(blockW, blockH, blockL);
              const blockMat = block.isBlock ?
                createBlockMaterial(block.color) :
                createBrickMaterial(block.color);
              const blockMesh = new THREE.Mesh(blockGeometry, blockMat);
              blockMesh.position.set(x + blockW / 2, y + blockH / 2, z + blockL / 2);
              blockMesh.rotation.y = Math.PI / 2;
              blockMesh.castShadow = true;
              blockMesh.receiveShadow = true;
              scene.add(blockMesh);
              markSpaceOccupied(x, y, z, blockW, blockH, blockL);
              placed = true;
              break;
            }
          }
          if (placed) break;
        }

        if (!placed) {
          // Try right edge
          for (let z = -innerWidth / 2 + margin; z < innerWidth / 2 - margin - blockW; z += blockW * 0.5) {
            const x = innerLength / 2 - margin - blockL;
            for (let y = 0; y < innerHeight - blockH; y += blockH * 0.25) {
              if (isSpaceAvailable(x, y, z, blockL, blockH, blockW)) {
                const blockGeometry = block.isBlock ? 
                  createCinderBlockGeometry(blockL, blockH, blockW) : 
                  createBrickGeometry(blockL, blockH, blockW);
                const blockMat = block.isBlock ?
                  createBlockMaterial(block.color) :
                  createBrickMaterial(block.color);
                const blockMesh = new THREE.Mesh(blockGeometry, blockMat);
                blockMesh.position.set(x + blockL / 2, y + blockH / 2, z + blockW / 2);
                blockMesh.castShadow = true;
                blockMesh.receiveShadow = true;
                scene.add(blockMesh);
                markSpaceOccupied(x, y, z, blockL, blockH, blockW);
                placed = true;
                break;
              }
              else if (isSpaceAvailable(x, y, z, blockW, blockH, blockL)) {
                const blockGeometry = block.isBlock ? 
                  createCinderBlockGeometry(blockW, blockH, blockL) : 
                  createBrickGeometry(blockW, blockH, blockL);
                const blockMat = block.isBlock ?
                  createBlockMaterial(block.color) :
                  createBrickMaterial(block.color);
                const blockMesh = new THREE.Mesh(blockGeometry, blockMat);
                blockMesh.position.set(x + blockW / 2, y + blockH / 2, z + blockL / 2);
                blockMesh.rotation.y = Math.PI / 2;
                blockMesh.castShadow = true;
                blockMesh.receiveShadow = true;
                scene.add(blockMesh);
                markSpaceOccupied(x, y, z, blockW, blockH, blockL);
                placed = true;
                break;
              }
            }
            if (placed) break;
          }
        }

        if (!placed) {
          // Try bottom edge
          for (let x = innerLength / 2 - margin; x > -innerLength / 2 + margin + blockL; x -= blockL * 0.5) {
            const z = innerWidth / 2 - margin - blockW;
            for (let y = 0; y < innerHeight - blockH; y += blockH * 0.25) {
              if (isSpaceAvailable(x - blockL, y, z, blockL, blockH, blockW)) {
                const blockGeometry = block.isBlock ? 
                  createCinderBlockGeometry(blockL, blockH, blockW) : 
                  createBrickGeometry(blockL, blockH, blockW);
                const blockMat = block.isBlock ?
                  createBlockMaterial(block.color) :
                  createBrickMaterial(block.color);
                const blockMesh = new THREE.Mesh(blockGeometry, blockMat);
                blockMesh.position.set(x - blockL / 2, y + blockH / 2, z + blockW / 2);
                blockMesh.castShadow = true;
                blockMesh.receiveShadow = true;
                scene.add(blockMesh);
                markSpaceOccupied(x - blockL, y, z, blockL, blockH, blockW);
                placed = true;
                break;
              }
              else if (isSpaceAvailable(x - blockW, y, z, blockW, blockH, blockL)) {
                const blockGeometry = block.isBlock ? 
                  createCinderBlockGeometry(blockW, blockH, blockL) : 
                  createBrickGeometry(blockW, blockH, blockL);
                const blockMat = block.isBlock ?
                  createBlockMaterial(block.color) :
                  createBrickMaterial(block.color);
                const blockMesh = new THREE.Mesh(blockGeometry, blockMat);
                blockMesh.position.set(x - blockW / 2, y + blockH / 2, z + blockL / 2);
                blockMesh.rotation.y = Math.PI / 2;
                blockMesh.castShadow = true;
                blockMesh.receiveShadow = true;
                scene.add(blockMesh);
                markSpaceOccupied(x - blockW, y, z, blockW, blockH, blockL);
                placed = true;
                break;
              }
            }
            if (placed) break;
          }
        }

        if (!placed) {
          // Try left edge
          for (let z = innerWidth / 2 - margin; z > -innerWidth / 2 + margin + blockW; z -= blockW * 0.5) {
            const x = -innerLength / 2 + margin;
            for (let y = 0; y < innerHeight - blockH; y += blockH * 0.25) {
              if (isSpaceAvailable(x, y, z - blockW, blockL, blockH, blockW)) {
                const blockGeometry = block.isBlock ? 
                  createCinderBlockGeometry(blockL, blockH, blockW) : 
                  createBrickGeometry(blockL, blockH, blockW);
                const blockMat = block.isBlock ?
                  createBlockMaterial(block.color) :
                  createBrickMaterial(block.color);
                const blockMesh = new THREE.Mesh(blockGeometry, blockMat);
                blockMesh.position.set(x + blockL / 2, y + blockH / 2, z - blockW / 2);
                blockMesh.castShadow = true;
                blockMesh.receiveShadow = true;
                scene.add(blockMesh);
                markSpaceOccupied(x, y, z - blockW, blockL, blockH, blockW);
                placed = true;
                break;
              }
              else if (isSpaceAvailable(x, y, z - blockL, blockW, blockH, blockL)) {
                const blockGeometry = block.isBlock ? 
                  createCinderBlockGeometry(blockW, blockH, blockL) : 
                  createBrickGeometry(blockW, blockH, blockL);
                const blockMat = block.isBlock ?
                  createBlockMaterial(block.color) :
                  createBrickMaterial(block.color);
                const blockMesh = new THREE.Mesh(blockGeometry, blockMat);
                blockMesh.position.set(x + blockW / 2, y + blockH / 2, z - blockL / 2);
                blockMesh.rotation.y = Math.PI / 2;
                blockMesh.castShadow = true;
                blockMesh.receiveShadow = true;
                scene.add(blockMesh);
                markSpaceOccupied(x, y, z - blockL, blockW, blockH, blockL);
                placed = true;
                break;
              }
            }
            if (placed) break;
          }
        }

        if (placed) {
          blockIndex++;
        } else {
          // Move to next layer inward
          currentLayer++;
          if (currentLayer * 2 >= Math.min(innerLength, innerWidth)) break;
        }
      }
    }

    // Add dimension labels
    const createLabel = (text, position) => {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.width = 256;
      canvas.height = 64;
      context.fillStyle = '#1e293b';
      context.font = 'bold 32px Arial';
      context.textAlign = 'center';
      context.fillText(text, 128, 40);

      const texture = new THREE.CanvasTexture(canvas);
      const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
      const sprite = new THREE.Sprite(spriteMaterial);
      sprite.position.copy(position);
      sprite.scale.set(20, 5, 1);
      scene.add(sprite);
    };

    createLabel(`${actualLength.toFixed(1)}"`, new THREE.Vector3(0, -5, -width / 2 - 10));
    createLabel(`${actualWidth.toFixed(1)}"`, new THREE.Vector3(-length / 2 - 10, -5, 0));
    createLabel(`${actualHeight.toFixed(1)}"`, new THREE.Vector3(length / 2 + 10, height / 2, -width / 2));

    // Position camera
    const maxDim = Math.max(length, width, height);
    camera.position.set(maxDim * 1.5, maxDim * 1.2, maxDim * 1.5);
    camera.lookAt(0, height / 2, 0);
    controls.target.set(0, height / 2, 0);
    controls.update();

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Handle resize
    const handleResize = () => {
      if (!containerRef.current) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
      controls.dispose();
    };
  }, [actualLength, actualWidth, actualHeight, wallThickness, selectedMaterial, coreBreakdown, inventory]);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full border border-slate-200 rounded-lg bg-white"
      style={{ minHeight: '500px' }}
    />
  );
}