import React, { useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

// Shared texture generation to prevent memory leaks and redundant creation
const createSharedTextures = () => {
  // Brick Texture
  const brickCanvas = document.createElement('canvas');
  brickCanvas.width = 64;
  brickCanvas.height = 32; // Much smaller texture
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
  
  // Memoize textures so they persist across re-renders but are created only once
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
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); // Cap pixel ratio for performance
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
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
    dirLight.shadow.mapSize.width = 1024; // Reduced shadow map size
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

    // --- INSTANCED MESH GENERATION ---
    
    // 1. WALL BRICKS
    if (selectedMaterial) {
      const brickL = selectedMaterial.length * scale;
      const brickW = selectedMaterial.width * scale;
      const brickH = selectedMaterial.height * scale;

      // Estimate max instances needed to allocate buffer
      const estBricksL = Math.ceil(length / brickL);
      const estBricksH = Math.ceil(height / brickH);
      const estBricksW = Math.ceil(width / brickL);
      // Roughly: 2 long walls + 2 short walls * height
      const maxBrickInstances = (estBricksL * 2 + estBricksW * 2) * estBricksH * 2; // *2 safety factor

      const brickGeo = new THREE.BoxGeometry(brickL, brickH, brickW);
      const brickMat = new THREE.MeshStandardMaterial({
        map: brickTexture,
        color: 0xa8332e,
        roughness: 0.9,
      });

      const brickMesh = new THREE.InstancedMesh(brickGeo, brickMat, maxBrickInstances);
      brickMesh.castShadow = true;
      brickMesh.receiveShadow = true;
      brickMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); // Optimization hint

      let instanceCount = 0;
      const dummy = new THREE.Object3D();

      // Logic to place bricks (reusing your existing logic but pushing to InstancedMesh)
      
      // We need to know where the core ends to stop building wall if needed
      // (Simplified logic: build full wall height requested by user input)
      
      const courses = Math.ceil(height / (brickH + mortarGap));
      
      for (let course = 0; course < courses; course++) {
        const y = course * (brickH + mortarGap) + brickH/2;
        if (y - brickH/2 > height) break;

        const isEvenCourse = (course % 2) === 0;

        if (isEvenCourse) {
          // Front & Back (Length-wise)
          const startX = -length/2 + brickL/2;
          const endX = length/2 - brickL/2;
          
          // Front
          let x = startX;
          while(x <= endX + EPSILON) {
            dummy.position.set(x, y, -width/2 + brickW/2);
            dummy.rotation.set(0, 0, 0);
            dummy.updateMatrix();
            brickMesh.setMatrixAt(instanceCount++, dummy.matrix);
            x += brickL + mortarGap;
          }
          
          // Back
          x = startX;
          while(x <= endX + EPSILON) {
            dummy.position.set(x, y, width/2 - brickW/2);
            dummy.rotation.set(0, 0, 0);
            dummy.updateMatrix();
            brickMesh.setMatrixAt(instanceCount++, dummy.matrix);
            x += brickL + mortarGap;
          }

          // Left & Right (Width-wise, between front/back)
          const innerZStart = -width/2 + brickW + brickL/2 + mortarGap; // Adjusted for corner overlap if needed? 
          // Actually your previous logic placed corners on front/back.
          // Let's stick to simple "fill the perimeter".
          
          // Simplified perimeter logic for performance/robustness in visualizer:
          // Front/Back are full length. Left/Right fit between them.
          
          // Re-implementing strictly based on previous logic structure for visual consistency:
          // Previous logic: Front/Back full rows. Left/Right fill gap.
          const sideZStart = -width/2 + brickW + brickL/2 + mortarGap; // This gap logic might be tricky.
          // Let's use simple side walls:
          const sideWallZStart = -width/2 + brickW + brickL/2; // Start after corner
          const sideWallZEnd = width/2 - brickW - brickL/2;
          
          // Actually, let's just use the loop logic from before, tailored for matrix setting
          
          // Left Wall
          let z = -width/2 + brickW + brickL/2 + mortarGap; // Assuming corner brick takes brickW space? No, corner takes brickL space in this orientation
          // In isEvenCourse: Front/Back are brickL long. They cover corners.
          // So side walls fill space between: width - 2*brickW ? 
          // Wait, bricks are BrickL x BrickH x BrickW.
          // Front wall is at -width/2 + brickW/2. Thickness is BrickW.
          // Corner brick at Front-Left: centered at (-L/2+l/2, -W/2+w/2). Extends to -L/2+l on x.
          
          // Your previous logic for sides:
          // z starts at -innerWallLengthZ/2 + brickL/2
          // innerWallLengthZ = width - 2*brickW.
          // This implies corners are NOT interlocking in the standard way, or simpler.
          
          // Let's implement standard running bond visual:
          // Even Course: Long walls run full length. Short walls fill between.
          // Odd Course: Short walls run full width. Long walls fill between.
          
          const innerW_Z = width - 2 * brickW;
          const startZ_sides = -innerW_Z/2 + brickL/2;
          const endZ_sides = innerW_Z/2 - brickL/2;
          
          // Left
          let zSide = startZ_sides;
          while (zSide <= endZ_sides + EPSILON) {
             // Rotate 90 deg for side walls?
             // Previous logic: createDetailedBrick(brickW, brickH, brickL) -> Dimensions swapped.
             // Here we rotate the mesh.
             dummy.position.set(-length/2 + brickW/2, y, zSide);
             dummy.rotation.set(0, Math.PI/2, 0); // Rotate 90
             dummy.updateMatrix();
             brickMesh.setMatrixAt(instanceCount++, dummy.matrix);
             zSide += brickL + mortarGap;
          }

          // Right
          zSide = startZ_sides;
          while (zSide <= endZ_sides + EPSILON) {
             dummy.position.set(length/2 - brickW/2, y, zSide);
             dummy.rotation.set(0, Math.PI/2, 0);
             dummy.updateMatrix();
             brickMesh.setMatrixAt(instanceCount++, dummy.matrix);
             zSide += brickL + mortarGap;
          }

        } else {
          // Odd Course: Side walls (Width) are full length (overlapping corners). Front/Back fill between.
          
          // Left & Right (Full Width)
          const startZ = -width/2 + brickL/2;
          const endZ = width/2 - brickL/2;
          
          // Left
          let z = startZ;
          while (z <= endZ + EPSILON) {
            dummy.position.set(-length/2 + brickW/2, y, z);
            dummy.rotation.set(0, Math.PI/2, 0);
            dummy.updateMatrix();
            brickMesh.setMatrixAt(instanceCount++, dummy.matrix);
            z += brickL + mortarGap;
          }
          
          // Right
          z = startZ;
          while (z <= endZ + EPSILON) {
            dummy.position.set(length/2 - brickW/2, y, z);
            dummy.rotation.set(0, Math.PI/2, 0);
            dummy.updateMatrix();
            brickMesh.setMatrixAt(instanceCount++, dummy.matrix);
            z += brickL + mortarGap;
          }
          
          // Front & Back (Inner fill)
          const innerL_X = length - 2 * brickW;
          const startX_sides = -innerL_X/2 + brickL/2;
          const endX_sides = innerL_X/2 - brickL/2;
          
          // Front
          let x = startX_sides;
          while (x <= endX_sides + EPSILON) {
            dummy.position.set(x, y, -width/2 + brickW/2);
            dummy.rotation.set(0, 0, 0);
            dummy.updateMatrix();
            brickMesh.setMatrixAt(instanceCount++, dummy.matrix);
            x += brickL + mortarGap;
          }
          
          // Back
          x = startX_sides;
          while (x <= endX_sides + EPSILON) {
            dummy.position.set(x, y, width/2 - brickW/2);
            dummy.rotation.set(0, 0, 0);
            dummy.updateMatrix();
            brickMesh.setMatrixAt(instanceCount++, dummy.matrix);
            x += brickL + mortarGap;
          }
        }
      }

      brickMesh.count = instanceCount;
      scene.add(brickMesh);
    }

    // 2. CORE BLOCKS (Instanced by unique dimension)
    if (inventory && inventory.length > 0 && selectedMaterial) {
      const brickW = selectedMaterial.width * scale;
      const innerLength = length - 2 * brickW;
      const innerWidth = width - 2 * brickW;
      const innerHeight = height;

      // Group core materials by dimensions to create fewer InstancedMeshes
      // Key: "L_W_H"
      const coreGroups = {};
      
      const sortedInventory = [...inventory]
        .filter(m => m.length && m.width && m.height) // Valid dims
        .filter(m => m.material_type === 'block')     // Only blocks for core
        .sort((a, b) => a.height - b.height);

      // Pre-calculate positions
      let currentBaseY = mortarGap;
      let materialIndex = 0;

      while (currentBaseY < innerHeight - EPSILON && materialIndex < sortedInventory.length) {
        const material = sortedInventory[materialIndex];
        const blockL = material.length * scale;
        const blockW = material.width * scale;
        const blockH = material.height * scale;

        if (currentBaseY + blockH > innerHeight + EPSILON) {
          materialIndex++;
          continue;
        }

        const key = `${blockL}_${blockW}_${blockH}`;
        if (!coreGroups[key]) {
          coreGroups[key] = {
            geometry: new THREE.BoxGeometry(blockL, blockH, blockW),
            matrices: [],
            material: material // keep ref
          };
        }

        const currentBlockCenterY = currentBaseY + blockH / 2;
        let layerPlaced = false;

        // Fill layer
        let z = -innerWidth/2 + blockW/2 + mortarGap;
        const maxZ = innerWidth/2 - blockW/2 - mortarGap;

        while (z <= maxZ + EPSILON) {
          let x = -innerLength/2 + blockL/2 + mortarGap;
          const maxX = innerLength/2 - blockL/2 - mortarGap;

          while (x <= maxX + EPSILON) {
            const dummy = new THREE.Object3D();
            dummy.position.set(x, currentBlockCenterY, z);
            dummy.updateMatrix();
            coreGroups[key].matrices.push(dummy.matrix.clone());
            
            layerPlaced = true;
            x += blockL + mortarGap;
          }
          z += blockW + mortarGap;
        }

        if (layerPlaced) {
          currentBaseY += blockH + mortarGap;
        } else {
          materialIndex++;
        }
      }

      // Create InstancedMesh for each core group
      Object.values(coreGroups).forEach(group => {
        if (group.matrices.length === 0) return;

        const mat = new THREE.MeshStandardMaterial({
          map: blockTexture,
          color: 0x9e9e9e,
          roughness: 0.95
        });

        const mesh = new THREE.InstancedMesh(group.geometry, mat, group.matrices.length);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage); // Static once placed

        group.matrices.forEach((matrix, i) => {
          mesh.setMatrixAt(i, matrix);
        });
        
        scene.add(mesh);
      });
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
      // Geometry/Material cleanup if needed, but React unmount handles most
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