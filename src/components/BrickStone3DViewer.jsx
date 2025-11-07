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

  useEffect(() => {
    if (!containerRef.current || !actualLength || !actualWidth || !actualHeight) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8f9fa);
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      50,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      10000
    );

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controlsRef.current = controls;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
    directionalLight.position.set(50, 100, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.left = -200;
    directionalLight.shadow.camera.right = 200;
    directionalLight.shadow.camera.top = 200;
    directionalLight.shadow.camera.bottom = -200;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    // Grid helper
    const gridSize = Math.max(actualLength, actualWidth, actualHeight) * 3;
    const gridHelper = new THREE.GridHelper(gridSize, 50, 0xcccccc, 0xe0e0e0);
    scene.add(gridHelper);

    // Convert inches to scene units (scale down)
    const scale = 0.5;

    // Create brick/stone wall material
    const wallMaterial = new THREE.MeshPhongMaterial({ 
      color: 0xa8332e,
      flatShading: false,
      shininess: 10
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

    // Add core blocks if they exist - FIXED VERSION
    if (coreBreakdown && coreBreakdown.length > 0 && inventory) {
      const colors = [0x8B4513, 0xA0522D, 0xD2691E, 0xCD853F, 0xDEB887, 0xF4A460];
      
      const innerLength = length - 2 * thickness;
      const innerWidth = width - 2 * thickness;
      const innerHeight = height;
      
      // Create a queue of all blocks with their materials
      const blockQueue = [];
      coreBreakdown.forEach((coreItem, matIndex) => {
        const coreMaterial = inventory.find(m => m.id === coreItem.material_id);
        if (!coreMaterial || coreItem.quantity === 0) return;

        for (let i = 0; i < coreItem.quantity; i++) {
          blockQueue.push({
            material: coreMaterial,
            color: colors[matIndex % colors.length]
          });
        }
      });

      // Fill blocks in proper 3D grid from bottom to top
      let blockIndex = 0;
      let currentY = 0; // Start from bottom

      while (currentY < innerHeight && blockIndex < blockQueue.length) {
        let currentZ = 0; // Start from front

        while (currentZ < innerWidth && blockIndex < blockQueue.length) {
          let currentX = 0; // Start from left
          
          while (currentX < innerLength && blockIndex < blockQueue.length) {
            const block = blockQueue[blockIndex];
            const blockL = block.material.length * scale;
            const blockW = block.material.width * scale;
            const blockH = block.material.height * scale;

            // Check if block fits in current position
            if (currentX + blockL > innerLength + 0.01) {
              break; // Move to next row
            }
            if (currentZ + blockW > innerWidth + 0.01) {
              break; // Move to next layer in Z
            }
            if (currentY + blockH > innerHeight + 0.01) {
              break; // No more room vertically
            }

            // Create and position the block
            const blockGeometry = new THREE.BoxGeometry(blockL, blockH, blockW);
            const blockMaterial = new THREE.MeshPhongMaterial({ 
              color: block.color,
              flatShading: false,
              shininess: 20
            });
            const blockMesh = new THREE.Mesh(blockGeometry, blockMaterial);
            
            // Position relative to the inner space (centered at 0,0,0)
            const x = -innerLength / 2 + currentX + blockL / 2;
            const z = -innerWidth / 2 + currentZ + blockW / 2;
            const y = currentY + blockH / 2;
            
            blockMesh.position.set(x, y, z);
            blockMesh.castShadow = true;
            blockMesh.receiveShadow = true;
            scene.add(blockMesh);
            
            currentX += blockL; // Move to next position along X
            blockIndex++;
          }
          
          if (blockIndex === 0 || currentX === 0) break; // No blocks placed
          
          // Move to next row in Z direction
          const lastBlock = blockQueue[blockIndex - 1];
          currentZ += lastBlock.material.width * scale;
        }
        
        if (currentZ === 0) break; // No rows placed
        
        // Move up to next layer
        const lastBlock = blockQueue[Math.max(0, blockIndex - 1)];
        currentY += lastBlock.material.height * scale;
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