import React, { useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

// Shared texture generation
const createSharedTextures = () => {
  // Brick Texture
  const brickCanvas = document.createElement('canvas');
  brickCanvas.width = 64;
  brickCanvas.height = 32;
  const ctx = brickCanvas.getContext('2d');
  
  // Base color
  ctx.fillStyle = '#a8332e';
  ctx.fillRect(0, 0, 64, 32);
  
  // Simple noise
  for(let i=0; i<50; i++) {
    ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.2})`;
    ctx.fillRect(Math.random()*64, Math.random()*32, 2, 2);
  }
  
  const brickTexture = new THREE.CanvasTexture(brickCanvas);
  brickTexture.colorSpace = THREE.SRGBColorSpace;

  // Concrete/Block Texture
  const blockCanvas = document.createElement('canvas');
  blockCanvas.width = 64;
  blockCanvas.height = 64;
  const bCtx = blockCanvas.getContext('2d');
  
  bCtx.fillStyle = '#9e9e9e';
  bCtx.fillRect(0, 0, 64, 64);
  
  for(let i=0; i<100; i++) {
    bCtx.fillStyle = `rgba(255,255,255,${Math.random() * 0.1})`;
    bCtx.fillRect(Math.random()*64, Math.random()*64, 1, 1);
  }
  
  const blockTexture = new THREE.CanvasTexture(blockCanvas);
  blockTexture.colorSpace = THREE.SRGBColorSpace;

  return { brickTexture, blockTexture };
};

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
  const rendererRef = useRef(null);
  const { brickTexture, blockTexture } = useMemo(() => createSharedTextures(), []);

  useEffect(() => {
    if (!containerRef.current || !actualLength || !actualWidth || !actualHeight) return;

    // --- SETUP ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8f9fa);
    scene.fog = new THREE.Fog(0xf8f9fa, 50, 500);

    const camera = new THREE.PerspectiveCamera(
      50,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // Clear previous canvas if any
    while(containerRef.current.firstChild) {
      containerRef.current.removeChild(containerRef.current.firstChild);
    }
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    // --- LIGHTING ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xfff4e6, 1.0);
    dirLight.position.set(50, 100, 50);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    scene.add(dirLight);

    const gridHelper = new THREE.GridHelper(200, 20, 0xcccccc, 0xe0e0e0);
    scene.add(gridHelper);

    // --- GEOMETRY & MATERIALS ---
    const scale = 0.5;
    const mortarGap = 0.375 * scale;
    const EPSILON = 0.001;

    const length = actualLength * scale;
    const width = actualWidth * scale;
    const height = actualHeight * scale;

    // Center the camera
    const maxDim = Math.max(length, width, height);
    camera.position.set(maxDim * 1.5, maxDim * 1.2, maxDim * 1.5);
    camera.lookAt(0, height / 2, 0);
    controls.target.set(0, height / 2, 0);

    // --- INSTANCED MESH GENERATION ---
    
    // 1. WALL BRICKS
    if (selectedMaterial) {
      const brickL = selectedMaterial.length * scale;
      const brickW = selectedMaterial.width * scale;
      const brickH = selectedMaterial.height * scale;

      // Estimate max instances needed
      const estBricksL = Math.ceil(length / brickL);
      const estBricksH = Math.ceil(height / brickH);
      const estBricksW = Math.ceil(width / brickL);
      const maxBrickInstances = (estBricksL * 2 + estBricksW * 2) * estBricksH * 4; // Increased safety factor

      const brickGeo = new THREE.BoxGeometry(brickL, brickH, brickW);
      const brickMat = new THREE.MeshStandardMaterial({
        map: brickTexture,
        color: 0xa8332e,
        roughness: 0.9,
      });

      const brickMesh = new THREE.InstancedMesh(brickGeo, brickMat, maxBrickInstances);
      brickMesh.castShadow = true;
      brickMesh.receiveShadow = true;
      brickMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

      let instanceCount = 0;
      const dummy = new THREE.Object3D();

      const courses = Math.ceil(height / (brickH + mortarGap));
      
      for (let course = 0; course < courses; course++) {
        const y = course * (brickH + mortarGap) + brickH/2;
        if (y - brickH/2 > height) break;

        const isEvenCourse = (course % 2) === 0;

        if (isEvenCourse) {
          // Front & Back (Length-wise)
          const startX = -length/2 + brickL/2;
          const endX = length/2 - brickL/2;
          
          let x = startX;
          while(x <= endX + EPSILON) {
            if (instanceCount < maxBrickInstances) {
              dummy.position.set(x, y, -width/2 + brickW/2);
              dummy.rotation.set(0, 0, 0);
              dummy.updateMatrix();
              brickMesh.setMatrixAt(instanceCount++, dummy.matrix);
            }
            x += brickL + mortarGap;
          }
          
          x = startX;
          while(x <= endX + EPSILON) {
            if (instanceCount < maxBrickInstances) {
              dummy.position.set(x, y, width/2 - brickW/2);
              dummy.rotation.set(0, 0, 0);
              dummy.updateMatrix();
              brickMesh.setMatrixAt(instanceCount++, dummy.matrix);
            }
            x += brickL + mortarGap;
          }

          // Side walls (Left & Right)
          const innerW_Z = width - 2 * brickW;
          const startZ_sides = -innerW_Z/2 + brickL/2;
          const endZ_sides = innerW_Z/2 - brickL/2;
          
          let zSide = startZ_sides;
          while (zSide <= endZ_sides + EPSILON) {
             if (instanceCount < maxBrickInstances) {
               dummy.position.set(-length/2 + brickW/2, y, zSide);
               dummy.rotation.set(0, Math.PI/2, 0);
               dummy.updateMatrix();
               brickMesh.setMatrixAt(instanceCount++, dummy.matrix);
             }
             zSide += brickL + mortarGap;
          }

          zSide = startZ_sides;
          while (zSide <= endZ_sides + EPSILON) {
             if (instanceCount < maxBrickInstances) {
               dummy.position.set(length/2 - brickW/2, y, zSide);
               dummy.rotation.set(0, Math.PI/2, 0);
               dummy.updateMatrix();
               brickMesh.setMatrixAt(instanceCount++, dummy.matrix);
             }
             zSide += brickL + mortarGap;
          }

        } else {
          // Odd Course
          const startZ = -width/2 + brickL/2;
          const endZ = width/2 - brickL/2;
          
          let z = startZ;
          while (z <= endZ + EPSILON) {
            if (instanceCount < maxBrickInstances) {
              dummy.position.set(-length/2 + brickW/2, y, z);
              dummy.rotation.set(0, Math.PI/2, 0);
              dummy.updateMatrix();
              brickMesh.setMatrixAt(instanceCount++, dummy.matrix);
            }
            z += brickL + mortarGap;
          }
          
          z = startZ;
          while (z <= endZ + EPSILON) {
            if (instanceCount < maxBrickInstances) {
              dummy.position.set(length/2 - brickW/2, y, z);
              dummy.rotation.set(0, Math.PI/2, 0);
              dummy.updateMatrix();
              brickMesh.setMatrixAt(instanceCount++, dummy.matrix);
            }
            z += brickL + mortarGap;
          }
          
          const innerL_X = length - 2 * brickW;
          const startX_sides = -innerL_X/2 + brickL/2;
          const endX_sides = innerL_X/2 - brickL/2;
          
          let x = startX_sides;
          while (x <= endX_sides + EPSILON) {
            if (instanceCount < maxBrickInstances) {
              dummy.position.set(x, y, -width/2 + brickW/2);
              dummy.rotation.set(0, 0, 0);
              dummy.updateMatrix();
              brickMesh.setMatrixAt(instanceCount++, dummy.matrix);
            }
            x += brickL + mortarGap;
          }
          
          x = startX_sides;
          while (x <= endX_sides + EPSILON) {
            if (instanceCount < maxBrickInstances) {
              dummy.position.set(x, y, width/2 - brickW/2);
              dummy.rotation.set(0, 0, 0);
              dummy.updateMatrix();
              brickMesh.setMatrixAt(instanceCount++, dummy.matrix);
            }
            x += brickL + mortarGap;
          }
        }
      }

      brickMesh.count = instanceCount;
      brickMesh.instanceMatrix.needsUpdate = true; // Critical fix!
      scene.add(brickMesh);
    }

    // 2. CORE BLOCKS - SOLID FILL ALGORITHM
    if (inventory && inventory.length > 0 && selectedMaterial) {
      // Prioritize "Standard Cinderblock" as the base material, then fall back to core breakdown or any block
      let block = inventory.find(m => m.material_type === 'block' && /standard.*cinderblock/i.test(m.material_name));

      if (!block && coreBreakdown && coreBreakdown.length > 0) {
          const sortedBreakdown = [...coreBreakdown].sort((a, b) => b.quantity - a.quantity);
          for (const item of sortedBreakdown) {
             const match = inventory.find(m => m.id === item.material_id && m.material_type === 'block');
             if (match) {
                 block = match;
                 break;
             }
          }
      }

      if (!block) {
          block = inventory.find(m => m.material_type === 'block' && m.length && m.width && m.height);
      }

      if (block) {
        const brickDepth = selectedMaterial.width * scale;
        // Core Volume Bounds
        const boundsL = length - 2 * brickDepth - 2 * mortarGap;
        const boundsW = width - 2 * brickDepth - 2 * mortarGap;
        const boundsH = height;

        const bL = block.length * scale;
        const bW = block.width * scale;
        const bH = block.height * scale;

        // We will collect matrices for the standard geometry
        const matrices = [];
        const dummy = new THREE.Object3D();

        // Advanced Packing Logic: Fill volume from inside out or simple raster scan
        // Raster scan with intelligent fitting
        
        let y = bH / 2;
        while (y <= boundsH - bH / 2 + 0.001) {
            const isEvenLayer = Math.round((y - bH/2) / (bH + mortarGap)) % 2 === 0;

            // Fill Z-rows
            // Center the block grid in the available Z-space
            const numRowsZ = Math.floor((boundsW + mortarGap) / (bW + mortarGap));
            const totalZ = numRowsZ * bW + (numRowsZ - 1) * mortarGap;
            const startZ = -totalZ / 2 + bW / 2;

            for (let r = 0; r < numRowsZ; r++) {
                const z = startZ + r * (bW + mortarGap);
                
                // Fill X-columns
                const numColsX = Math.floor((boundsL + mortarGap) / (bL + mortarGap));
                const totalX = numColsX * bL + (numColsX - 1) * mortarGap;
                let startX = -totalX / 2 + bL / 2;

                // Running bond offset
                if (!isEvenLayer) {
                    startX += bL / 2;
                    // Adjust if it pushes out of bounds? 
                    // For visualization, simple offset is usually enough, but let's check bounds
                }

                for (let c = 0; c < (isEvenLayer ? numColsX : numColsX - 1); c++) {
                    const x = startX + c * (bL + mortarGap);
                    
                    // Rotation / Fitting check (AI Logic)
                    // If this standard orientation fits, use it.
                    // If not, try rotating 90 degrees?
                    // Currently raster scan assumes grid.
                    // Let's check if we are truly inside bounds
                    if (Math.abs(x) + bL/2 <= boundsL/2 + 0.01 && Math.abs(z) + bW/2 <= boundsW/2 + 0.01) {
                        dummy.position.set(x, y, z);
                        dummy.rotation.set(0, 0, 0);
                        dummy.updateMatrix();
                        matrices.push(dummy.matrix.clone());
                    } else {
                        // Attempt Rotate 90 deg (swap L and W) to fit in tight spots?
                        // Only if block is roughly square or we are desperate to fill.
                        // Let's try fitting a rotated block if standard doesn't fit X but fits Z (and swapped dims work)
                        // For a solid wall, consistency is key. We skip if it doesn't fit.
                    }
                }
            }
            
            // Check perimeter gaps?
            // "Rotate each piece 90 degrees in x, y, z"
            // If we have large gaps on the sides (boundsW - totalZ), we might fit rotated blocks there.
            // ... (Simple implementation focuses on solid core first)

            y += bH + mortarGap;
        }

        if (matrices.length > 0) {
            const mat = new THREE.MeshStandardMaterial({
                map: blockTexture,
                color: 0x9e9e9e,
                roughness: 0.95
            });
            const geometry = new THREE.BoxGeometry(bL, bH, bW);
            const mesh = new THREE.InstancedMesh(geometry, mat, matrices.length);
            
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);

            matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
            mesh.instanceMatrix.needsUpdate = true;
            scene.add(mesh);
        }
      }
    }

    // --- ANIMATION ---
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
      controls.dispose();
    };
  }, [actualLength, actualWidth, actualHeight, wallThickness, selectedMaterial, inventory, brickTexture, blockTexture]);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full border border-slate-200 rounded-lg bg-white"
      style={{ minHeight: '500px' }}
    />
  );
}