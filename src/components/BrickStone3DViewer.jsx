
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

  // Create realistic brick with texture and color variation
  const createDetailedBrick = (length, height, width, baseColor) => {
    const group = new THREE.Group();
    
    // Add slight random variation to brick color for realism
    const colorVariation = Math.random() * 0.15 - 0.075; // ±7.5% variation
    const brickColor = new THREE.Color(baseColor).multiplyScalar(1 + colorVariation);
    
    // Main brick body with realistic dimensions (slight gap for mortar)
    const brickGeometry = new THREE.BoxGeometry(length * 0.96, height * 0.96, width * 0.96);
    
    // Create procedural brick texture using canvas
    const createBrickTexture = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');
      
      // Base brick color with variation
      const baseR = Math.floor(brickColor.r * 255);
      const baseG = Math.floor(brickColor.g * 255);
      const baseB = Math.floor(brickColor.b * 255);
      
      ctx.fillStyle = `rgb(${baseR}, ${baseG}, ${baseB})`;
      ctx.fillRect(0, 0, 512, 512);
      
      // Add texture noise for realistic surface
      const imageData = ctx.getImageData(0, 0, 512, 512);
      for (let i = 0; i < imageData.data.length; i += 4) {
        const noise = Math.random() * 30 - 15;
        imageData.data[i] = Math.max(0, Math.min(255, imageData.data[i] + noise));
        imageData.data[i + 1] = Math.max(0, Math.min(255, imageData.data[i + 1] + noise));
        imageData.data[i + 2] = Math.max(0, Math.min(255, imageData.data[i + 2] + noise));
      }
      ctx.putImageData(imageData, 0, 0);
      
      // Add darker spots for weathering
      for (let i = 0; i < 15; i++) {
        ctx.fillStyle = `rgba(${baseR * 0.7}, ${baseG * 0.7}, ${baseB * 0.7}, ${Math.random() * 0.3})`;
        ctx.fillRect(
          Math.random() * 512,
          Math.random() * 512,
          Math.random() * 80 + 20,
          Math.random() * 80 + 20
        );
      }
      
      // Add subtle horizontal lines (texture lines)
      ctx.strokeStyle = `rgba(${baseR * 0.8}, ${baseG * 0.8}, ${baseB * 0.8}, 0.3)`;
      ctx.lineWidth = 2;
      for (let i = 0; i < 8; i++) {
        ctx.beginPath();
        ctx.moveTo(0, (512 / 8) * i + Math.random() * 20);
        ctx.lineTo(512, (512 / 8) * i + Math.random() * 20);
        ctx.stroke();
      }
      
      return new THREE.CanvasTexture(canvas);
    };
    
    // Create normal map for surface detail
    const createNormalMap = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');
      
      // Base normal (neutral blue-purple)
      ctx.fillStyle = '#8080ff';
      ctx.fillRect(0, 0, 512, 512);
      
      // Add random bumps
      for (let i = 0; i < 200; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        const radius = Math.random() * 8 + 2;
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        gradient.addColorStop(0, '#9090ff');
        gradient.addColorStop(1, '#7070ff');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
      
      return new THREE.CanvasTexture(canvas);
    };
    
    const brickTexture = createBrickTexture();
    brickTexture.wrapS = THREE.RepeatWrapping;
    brickTexture.wrapT = THREE.RepeatWrapping;
    
    const normalMap = createNormalMap();
    normalMap.wrapS = THREE.RepeatWrapping;
    normalMap.wrapT = THREE.RepeatWrapping;
    
    // Enhanced brick material with realistic properties
    const brickMaterial = new THREE.MeshStandardMaterial({
      map: brickTexture,
      normalMap: normalMap,
      normalScale: new THREE.Vector2(0.3, 0.3),
      color: brickColor, // This will apply the base color and then the texture on top
      roughness: 0.85 + Math.random() * 0.1, // Slight variation
      metalness: 0.0,
      flatShading: false,
    });
    
    const mainBrick = new THREE.Mesh(brickGeometry, brickMaterial);
    mainBrick.castShadow = true;
    mainBrick.receiveShadow = true;
    group.add(mainBrick);
    
    // Add mortar edges (light gray cement color)
    const mortarColor = new THREE.Color(0xc0c0c0);
    const mortarMaterial = new THREE.MeshStandardMaterial({
      color: mortarColor,
      roughness: 0.95,
      metalness: 0.0,
    });
    
    // Mortar gap definition (a small fraction of the brick dimensions)
    const mortarThickness = Math.min(length, width, height) * 0.02; // Roughly 2% of smallest dimension
    const mortarOffset = 0.5 - (0.96 / 2) - (mortarThickness / 2); // Position mortar at edge of brick body
    
    // Top/bottom mortar edges
    const topBottomMortarGeo = new THREE.BoxGeometry(length, mortarThickness, width);
    const topMortar = new THREE.Mesh(topBottomMortarGeo, mortarMaterial);
    topMortar.position.y = height * mortarOffset;
    topMortar.castShadow = true;
    topMortar.receiveShadow = true;
    group.add(topMortar);
    
    const bottomMortar = new THREE.Mesh(topBottomMortarGeo, mortarMaterial);
    bottomMortar.position.y = -height * mortarOffset;
    bottomMortar.castShadow = true;
    bottomMortar.receiveShadow = true;
    group.add(bottomMortar);
    
    // Side mortar edges (left/right)
    const sideMortarXGeo = new THREE.BoxGeometry(mortarThickness, height, width);
    const leftMortar = new THREE.Mesh(sideMortarXGeo, mortarMaterial);
    leftMortar.position.x = -length * mortarOffset;
    leftMortar.castShadow = true;
    leftMortar.receiveShadow = true;
    group.add(leftMortar);
    
    const rightMortar = new THREE.Mesh(sideMortarXGeo, mortarMaterial);
    rightMortar.position.x = length * mortarOffset;
    rightMortar.castShadow = true;
    rightMortar.receiveShadow = true;
    group.add(rightMortar);
    
    // Front/back mortar edges (front/back)
    const sideMortarZGeo = new THREE.BoxGeometry(length, height, mortarThickness);
    const frontMortar = new THREE.Mesh(sideMortarZGeo, mortarMaterial);
    frontMortar.position.z = width * mortarOffset;
    frontMortar.castShadow = true;
    frontMortar.receiveShadow = true;
    group.add(frontMortar);
    
    const backMortar = new THREE.Mesh(sideMortarZGeo, mortarMaterial);
    backMortar.position.z = -width * mortarOffset;
    backMortar.castShadow = true;
    backMortar.receiveShadow = true;
    group.add(backMortar);
    
    return group;
  };

  // Create realistic cinder block with hollow cores
  const createDetailedCinderBlock = (length, height, width, baseColor) => {
    const group = new THREE.Group();
    
    // Add color variation
    const colorVariation = Math.random() * 0.1 - 0.05;
    const blockColor = new THREE.Color(baseColor).multiplyScalar(1 + colorVariation);
    
    const blockWallThickness = Math.min(length, width) * 0.12;
    
    // Create concrete texture
    const createConcreteTexture = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');
      
      const baseR = Math.floor(blockColor.r * 255);
      const baseG = Math.floor(blockColor.g * 255);
      const baseB = Math.floor(blockColor.b * 255);

      // Base concrete gray
      ctx.fillStyle = `rgb(${baseR}, ${baseG}, ${baseB})`;
      ctx.fillRect(0, 0, 512, 512);
      
      // Add concrete aggregate texture
      const imageData = ctx.getImageData(0, 0, 512, 512);
      for (let i = 0; i < imageData.data.length; i += 4) {
        const noise = Math.random() * 40 - 20;
        imageData.data[i] = Math.max(0, Math.min(255, imageData.data[i] + noise));
        imageData.data[i + 1] = Math.max(0, Math.min(255, imageData.data[i + 1] + noise));
        imageData.data[i + 2] = Math.max(0, Math.min(255, imageData.data[i + 2] + noise));
      }
      ctx.putImageData(imageData, 0, 0);
      
      // Add small aggregate stones
      for (let i = 0; i < 100; i++) {
        ctx.fillStyle = `rgba(${100 + Math.random() * 50}, ${100 + Math.random() * 50}, ${100 + Math.random() * 50}, 0.5)`;
        ctx.fillRect(
          Math.random() * 512,
          Math.random() * 512,
          Math.random() * 4 + 1,
          Math.random() * 4 + 1
        );
      }
      
      return new THREE.CanvasTexture(canvas);
    };
    
    const concreteTexture = createConcreteTexture();
    concreteTexture.wrapS = THREE.RepeatWrapping;
    concreteTexture.wrapT = THREE.RepeatWrapping;
    
    const blockMaterial = new THREE.MeshStandardMaterial({
      map: concreteTexture,
      color: blockColor, // This will apply the base color and then the texture on top
      roughness: 0.95,
      metalness: 0.0,
      flatShading: false,
    });
    
    // Create hollow block structure
    const frontBackGeo = new THREE.BoxGeometry(length * 0.97, height * 0.97, blockWallThickness);
    const frontFace = new THREE.Mesh(frontBackGeo, blockMaterial);
    frontFace.position.z = width/2 - blockWallThickness/2;
    frontFace.castShadow = true;
    frontFace.receiveShadow = true;
    group.add(frontFace);
    
    const backFace = new THREE.Mesh(frontBackGeo, blockMaterial);
    backFace.position.z = -width/2 + blockWallThickness/2;
    backFace.castShadow = true;
    backFace.receiveShadow = true;
    group.add(backFace);
    
    const leftRightGeo = new THREE.BoxGeometry(blockWallThickness, height * 0.97, width * 0.97 - 2 * blockWallThickness);
    const leftFace = new THREE.Mesh(leftRightGeo, blockMaterial);
    leftFace.position.x = -length/2 + blockWallThickness/2;
    leftFace.castShadow = true;
    leftFace.receiveShadow = true;
    group.add(leftFace);
    
    const rightFace = new THREE.Mesh(leftRightGeo, blockMaterial);
    rightFace.position.x = length/2 - blockWallThickness/2;
    rightFace.castShadow = true;
    rightFace.receiveShadow = true;
    group.add(rightFace);
    
    const topBottomGeo = new THREE.BoxGeometry(length * 0.97 - 2 * blockWallThickness, blockWallThickness, width * 0.97 - 2 * blockWallThickness);
    const topFace = new THREE.Mesh(topBottomGeo, blockMaterial);
    topFace.position.y = height/2 - blockWallThickness/2;
    topFace.castShadow = true;
    topFace.receiveShadow = true;
    group.add(topFace);
    
    const bottomFace = new THREE.Mesh(topBottomGeo, blockMaterial);
    bottomFace.position.y = -height/2 + blockWallThickness/2;
    bottomFace.castShadow = true;
    bottomFace.receiveShadow = true;
    group.add(bottomFace);
    
    const webThickness = blockWallThickness * 0.6;
    const webGeo = new THREE.BoxGeometry(webThickness, height * 0.97 - 2 * blockWallThickness, width * 0.97 - 2 * blockWallThickness);
    const web = new THREE.Mesh(webGeo, blockMaterial);
    web.castShadow = true;
    web.receiveShadow = true;
    group.add(web);
    
    return group;
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
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 20;
    controls.maxDistance = 500;
    controlsRef.current = controls;

    // Enhanced lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5); // Slightly reduced ambient
    scene.add(ambientLight);

    const directionalLight1 = new THREE.DirectionalLight(0xfff4e6, 1.0); // Warmer, brighter main light
    directionalLight1.position.set(50, 100, 50);
    directionalLight1.castShadow = true;
    directionalLight1.shadow.camera.left = -200;
    directionalLight1.shadow.camera.right = 200;
    directionalLight1.shadow.camera.top = 200;
    directionalLight1.shadow.camera.bottom = -200;
    directionalLight1.shadow.mapSize.width = 2048;
    directionalLight1.shadow.mapSize.height = 2048;
    directionalLight1.shadow.bias = -0.0001; // Reduce shadow acne
    scene.add(directionalLight1);

    const directionalLight2 = new THREE.DirectionalLight(0xe6f3ff, 0.5); // Cooler, softer fill light
    directionalLight2.position.set(-50, 50, -50);
    scene.add(directionalLight2);

    // Add subtle fill light from below
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.3); // Slightly brighter fill light
    fillLight.position.set(0, -30, 0);
    scene.add(fillLight);

    // Smaller grid - 30ft x 30ft
    const gridHelper = new THREE.GridHelper(180, 30, 0xcccccc, 0xe0e0e0); // 30ft = 360 inches. If scale 0.5 (1 unit = 2 inches), then 180 units.
    scene.add(gridHelper);

    // Convert inches to scene units
    const scale = 0.5;
    const mortarGap = 0.375 * scale; // 3/8" gap

    // Create outer brick walls with individual bricks and mortar
    const length = actualLength * scale;
    const width = actualWidth * scale;
    const height = actualHeight * scale;
    const thickness = wallThickness * scale;

    if (selectedMaterial) {
      const brickL = selectedMaterial.length * scale;
      const brickW = selectedMaterial.width * scale;
      const brickH = selectedMaterial.height * scale;
      
      const coursesHigh = Math.ceil((height) / (brickH + mortarGap));

      // PROPER RUNNING BOND MASONRY LAYOUT
      // A small epsilon for floating point comparison to handle boundary conditions
      const EPSILON = 0.001; 

      for (let course = 0; course < coursesHigh; course++) {
        const y = course * (brickH + mortarGap) + brickH/2;
        const isEvenCourse = (course % 2) === 0;
        
        if (isEvenCourse) {
          // EVEN COURSES: Front/back walls span full length (brickL along X, brickW along Z)
          // Left/Right walls fill between (brickW along X, brickL along Z)

          // FRONT WALL (Z = -width/2 + brickW/2)
          // Leftmost brick (corner)
          let brick = createDetailedBrick(brickL, brickH, brickW, 0xa8332e);
          brick.position.set(-length/2 + brickL/2, y, -width/2 + brickW/2);
          scene.add(brick);
          
          // Rightmost brick (corner)
          brick = createDetailedBrick(brickL, brickH, brickW, 0xa8332e);
          brick.position.set(length/2 - brickL/2, y, -width/2 + brickW/2);
          scene.add(brick);
          
          // Fill middle bricks for front wall (running bond offset)
          let x = -length/2 + brickL/2 + brickL + mortarGap; // Center of second brick from left
          const endX = length/2 - brickL/2 - (brickL + mortarGap); // Center of second to last brick from right
          while (x <= endX + EPSILON) {
            brick = createDetailedBrick(brickL, brickH, brickW, 0xa8332e);
            brick.position.set(x, y, -width/2 + brickW/2);
            scene.add(brick);
            x += brickL + mortarGap;
          }
          
          // BACK WALL (Z = width/2 - brickW/2) - Same pattern
          // Leftmost brick (corner)
          brick = createDetailedBrick(brickL, brickH, brickW, 0xa8332e);
          brick.position.set(-length/2 + brickL/2, y, width/2 - brickW/2);
          scene.add(brick);
          
          // Rightmost brick (corner)
          brick = createDetailedBrick(brickL, brickH, brickW, 0xa8332e);
          brick.position.set(length/2 - brickL/2, y, width/2 - brickW/2);
          scene.add(brick);
          
          // Fill middle bricks for back wall
          x = -length/2 + brickL/2 + brickL + mortarGap;
          while (x <= endX + EPSILON) {
            brick = createDetailedBrick(brickL, brickH, brickW, 0xa8332e);
            brick.position.set(x, y, width/2 - brickW/2);
            scene.add(brick);
            x += brickL + mortarGap;
          }
          
          // LEFT WALL (X = -length/2 + brickW/2) - Fills between front and back (bricks are rotated)
          const innerWallLengthZ = width - 2 * brickW; // Effective span for the side wall in Z
          let z = -innerWallLengthZ/2 + brickL/2; // Center of first brick (whose length is brickL)
          const sideWallMaxZ = innerWallLengthZ/2 - brickL/2;
          while (z <= sideWallMaxZ + EPSILON) {
            brick = createDetailedBrick(brickW, brickH, brickL, 0xa8332e); // Swapped length/width
            brick.position.set(-length/2 + brickW/2, y, z);
            scene.add(brick);
            z += brickL + mortarGap;
          }
          
          // RIGHT WALL (X = length/2 - brickW/2) - Fills between front and back
          z = -innerWallLengthZ/2 + brickL/2;
          while (z <= sideWallMaxZ + EPSILON) {
            brick = createDetailedBrick(brickW, brickH, brickL, 0xa8332e); // Swapped length/width
            brick.position.set(length/2 - brickW/2, y, z);
            scene.add(brick);
            z += brickL + mortarGap;
          }
          
        } else {
          // ODD COURSES: Left/right walls span full width (brickL along Z, brickW along X)
          // Front/Back walls fill between (brickL along X, brickW along Z)

          // LEFT WALL (X = -length/2 + brickW/2)
          // Frontmost brick (corner)
          let brick = createDetailedBrick(brickW, brickH, brickL, 0xa8332e);
          brick.position.set(-length/2 + brickW/2, y, -width/2 + brickL/2);
          scene.add(brick);
          
          // Backmost brick (corner)
          brick = createDetailedBrick(brickW, brickH, brickL, 0xa8332e);
          brick.position.set(-length/2 + brickW/2, y, width/2 - brickL/2);
          scene.add(brick);
          
          // Fill middle bricks for left wall (running bond offset)
          let z = -width/2 + brickL/2 + brickL + mortarGap;
          const endZ = width/2 - brickL/2 - (brickL + mortarGap);
          while (z <= endZ + EPSILON) {
            brick = createDetailedBrick(brickW, brickH, brickL, 0xa8332e); // Swapped length/width
            brick.position.set(-length/2 + brickW/2, y, z);
            scene.add(brick);
            z += brickL + mortarGap;
          }
          
          // RIGHT WALL (X = length/2 - brickW/2) - Same pattern
          // Frontmost brick (corner)
          brick = createDetailedBrick(brickW, brickH, brickL, 0xa8332e);
          brick.position.set(length/2 - brickW/2, y, -width/2 + brickL/2);
          scene.add(brick);
          
          // Backmost brick (corner)
          brick = createDetailedBrick(brickW, brickH, brickL, 0xa8332e);
          brick.position.set(length/2 - brickW/2, y, width/2 - brickL/2);
          scene.add(brick);
          
          z = -width/2 + brickL/2 + brickL + mortarGap;
          while (z <= endZ + EPSILON) {
            brick = createDetailedBrick(brickW, brickH, brickL, 0xa8332e); // Swapped length/width
            brick.position.set(length/2 - brickW/2, y, z);
            scene.add(brick);
            z += brickL + mortarGap;
          }
          
          // FRONT WALL (Z = -width/2 + brickW/2) - Fills between left and right
          const innerWallLengthX = length - 2 * brickW; // Effective span for the front/back wall in X
          let x = -innerWallLengthX/2 + brickL/2; // Center of first brick (whose length is brickL)
          const frontBackWallMaxX = innerWallLengthX/2 - brickL/2;
          while (x <= frontBackWallMaxX + EPSILON) {
            brick = createDetailedBrick(brickL, brickH, brickW, 0xa8332e);
            brick.position.set(x, y, -width/2 + brickW/2);
            scene.add(brick);
            x += brickL + mortarGap;
          }
          
          // BACK WALL (Z = width/2 - brickW/2) - Fills between left and right
          x = -innerWallLengthX/2 + brickL/2;
          while (x <= frontBackWallMaxX + EPSILON) {
            brick = createDetailedBrick(brickL, brickH, brickW, 0xa8332e);
            brick.position.set(x, y, width/2 - brickW/2);
            scene.add(brick);
            x += brickL + mortarGap;
          }
        }
      }
    }

    // MASON-STYLE CORE BLOCK PLACEMENT - Fixed to handle missing materials
    if (coreBreakdown && coreBreakdown.length > 0 && inventory && selectedMaterial) {
      const colors = [0x8B4513, 0xA0522D, 0xD2691E, 0xCD853F, 0xDEB887, 0xF4A460];
      
      const brickW = selectedMaterial.width * scale; // Width of the outer brick that forms the wall
      const innerLength = length - 2 * brickW;
      const innerWidth = width - 2 * brickW;
      const innerHeight = height;
      
      // Filter out invalid core materials before processing
      const validCoreMaterials = coreBreakdown
        .map((coreItem, idx) => {
          const coreMaterial = inventory.find(m => m.id === coreItem.material_id);
          // Only include if material exists, has valid dimensions, and quantity > 0
          if (coreMaterial && 
              coreMaterial.length && 
              coreMaterial.width && 
              coreMaterial.height && 
              coreItem.quantity > 0) {
            return { ...coreItem, material: coreMaterial, colorIdx: idx };
          }
          return null; // Return null for invalid items
        })
        .filter(item => item !== null) // Filter out the nulls
        .sort((a, b) => a.material.height - b.material.height);
      
      if (validCoreMaterials.length === 0) {
        // No valid core materials to place, skip this section
      } else {
        // Place materials in vertical layers (first material on bottom, then stack upward)
        let currentBaseY = mortarGap; // Start placing slightly above the floor
        
        validCoreMaterials.forEach((materialData) => {
          const { material, quantity, colorIdx } = materialData;
          const blockL = material.length * scale;
          const blockW = material.width * scale;
          const blockH = material.height * scale;
          const isBlock = material.material_type === 'block';
          const color = colors[colorIdx % colors.length];
          
          let placedForThisMaterial = 0;
          
          // Fill this material's layer(s) from bottom up until quantity is met or inner height is reached
          while (placedForThisMaterial < quantity && currentBaseY + blockH <= innerHeight) {
            let layerPlacedCount = 0; // Blocks placed in the current horizontal layer
            
            // Position for the center of the block for the current layer
            const currentBlockCenterY = currentBaseY + blockH / 2;
            
            // For each horizontal layer, fill Z direction first, then X
            let z = -innerWidth/2 + blockW/2 + mortarGap;
            const maxZ = innerWidth/2 - blockW/2 - mortarGap;
            
            while (z <= maxZ + EPSILON && placedForThisMaterial < quantity) {
              let x = -innerLength/2 + blockL/2 + mortarGap;
              const maxX = innerLength/2 - blockL/2 - mortarGap;
              
              while (x <= maxX + EPSILON && placedForThisMaterial < quantity) {
                const block = isBlock ? 
                  createDetailedCinderBlock(blockL, blockH, blockW, color) :
                  createDetailedBrick(blockL, blockH, blockW, color);
                
                block.position.set(x, currentBlockCenterY, z);
                scene.add(block);
                
                placedForThisMaterial++;
                layerPlacedCount++;
                x += blockL + mortarGap;
              }
              z += blockW + mortarGap;
            }
            
            // Move to next course (layer) if we placed blocks in this horizontal layer
            if (layerPlacedCount > 0) {
              currentBaseY += blockH + mortarGap;
            } else {
              // If no blocks could be placed in this layer (e.g., no space), stop for this material
              break; 
            }
          }
        });
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
