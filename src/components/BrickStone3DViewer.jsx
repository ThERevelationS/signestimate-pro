
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

export default function BrickStone3DViewer({ 
  actualLength, 
  actualWidth, 
  actualHeight,
  wallThickness,
  selectedMaterial,
  coreBreakdown, // This prop is no longer directly used for rendering core, but kept for interface consistency
  inventory
}) {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const controlsRef = useRef(null);

  // Create realistic brick with authentic red clay texture
  const createDetailedBrick = (length, height, width, baseColor) => {
    const group = new THREE.Group();
    
    // Main brick body
    const brickGeometry = new THREE.BoxGeometry(length * 0.96, height * 0.96, width * 0.96);
    
    // Create realistic red clay brick texture
    const createBrickTexture = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');
      
      // Authentic red brick base colors with variation
      const brickVariations = [
        { r: 140, g: 45, b: 35 },   // Deep red
        { r: 168, g: 51, b: 46 },   // Classic red
        { r: 155, g: 60, b: 50 },   // Rustic red  
        { r: 130, g: 40, b: 30 },   // Dark red
      ];
      
      const baseColor = brickVariations[Math.floor(Math.random() * brickVariations.length)];
      
      // Create base with slight gradient
      const gradient = ctx.createLinearGradient(0, 0, 0, 256);
      gradient.addColorStop(0, `rgb(${baseColor.r + 10}, ${baseColor.g + 10}, ${baseColor.b + 10})`);
      gradient.addColorStop(0.5, `rgb(${baseColor.r}, ${baseColor.g}, ${baseColor.b})`);
      gradient.addColorStop(1, `rgb(${baseColor.r - 10}, ${baseColor.g - 10}, ${baseColor.b - 10})`);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 512, 256);
      
      // Add realistic brick texture with varied grain
      const imageData = ctx.getImageData(0, 0, 512, 256);
      for (let i = 0; i < imageData.data.length; i += 4) {
        // Fine grain texture
        const noise = (Math.random() - 0.5) * 40;
        imageData.data[i] = Math.max(0, Math.min(255, imageData.data[i] + noise));
        imageData.data[i + 1] = Math.max(0, Math.min(255, imageData.data[i + 1] + noise));
        imageData.data[i + 2] = Math.max(0, Math.min(255, imageData.data[i + 2] + noise));
      }
      ctx.putImageData(imageData, 0, 0);
      
      // Add brick surface imperfections and pitting
      for (let i = 0; i < 60; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 256;
        const size = Math.random() * 4 + 1;
        const darkness = Math.random() * 0.4 + 0.2;
        
        ctx.fillStyle = `rgba(${baseColor.r * (1 - darkness)}, ${baseColor.g * (1 - darkness)}, ${baseColor.b * (1 - darkness)}, ${Math.random() * 0.6 + 0.4})`;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }
      
      // Add weathering stains and discoloration
      for (let i = 0; i < 25; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 256;
        const width = Math.random() * 60 + 30;
        const height = Math.random() * 40 + 20;
        
        const stainGradient = ctx.createRadialGradient(x, y, 0, x, y, width);
        stainGradient.addColorStop(0, `rgba(${baseColor.r * 0.7}, ${baseColor.g * 0.6}, ${baseColor.b * 0.5}, 0.3)`);
        stainGradient.addColorStop(1, `rgba(${baseColor.r * 0.8}, ${baseColor.g * 0.7}, ${baseColor.b * 0.6}, 0)`);
        ctx.fillStyle = stainGradient;
        ctx.fillRect(x - width/2, y - height/2, width, height);
      }
      
      // Add subtle horizontal texture lines (brick manufacturing marks)
      ctx.strokeStyle = `rgba(${baseColor.r * 0.7}, ${baseColor.g * 0.7}, ${baseColor.b * 0.7}, 0.15)`;
      ctx.lineWidth = 1;
      for (let i = 0; i < 12; i++) {
        const y = (256 / 12) * i + (Math.random() - 0.5) * 10;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(512, y);
        ctx.stroke();
      }
      
      // Add edge darkening for depth
      const edgeGradient = ctx.createLinearGradient(0, 0, 512, 0);
      edgeGradient.addColorStop(0, `rgba(0, 0, 0, 0.15)`);
      edgeGradient.addColorStop(0.1, `rgba(0, 0, 0, 0)`);
      edgeGradient.addColorStop(0.9, `rgba(0, 0, 0, 0)`);
      edgeGradient.addColorStop(1, `rgba(0, 0, 0, 0.15)`);
      ctx.fillStyle = edgeGradient;
      ctx.fillRect(0, 0, 512, 256);
      
      return new THREE.CanvasTexture(canvas);
    };
    
    // Create enhanced normal map for surface detail
    const createNormalMap = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');
      
      // Base normal
      ctx.fillStyle = '#8080ff';
      ctx.fillRect(0, 0, 512, 256);
      
      // Add realistic surface bumps and depressions
      for (let i = 0; i < 400; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 256;
        const radius = Math.random() * 6 + 2;
        const intensity = Math.random() > 0.5 ? 1 : -1;
        
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        if (intensity > 0) {
          gradient.addColorStop(0, '#a0a0ff');
          gradient.addColorStop(1, '#7070ff');
        } else {
          gradient.addColorStop(0, '#6060ff');
          gradient.addColorStop(1, '#9090ff');
        }
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
      normalScale: new THREE.Vector2(0.5, 0.5),
      roughness: 0.9,
      metalness: 0.0,
      flatShading: false,
    });
    
    const mainBrick = new THREE.Mesh(brickGeometry, brickMaterial);
    mainBrick.castShadow = true;
    mainBrick.receiveShadow = true;
    group.add(mainBrick);
    
    return group;
  };

  // Create realistic hollow cinder block - TWO rectangular cavities like real cinder blocks
  const createDetailedCinderBlock = (length, height, width, baseColor) => {
    const group = new THREE.Group();
    
    const colorVariation = Math.random() * 0.08 - 0.04;
    const blockColor = new THREE.Color(baseColor).multiplyScalar(1 + colorVariation);
    
    // Wall thickness - making it more substantial for realistic look
    const wallThickness = Math.min(length, width, height) * 0.15;
    
    const createConcreteTexture = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');
      
      const baseR = Math.floor(blockColor.r * 255);
      const baseG = Math.floor(blockColor.g * 255);
      const baseB = Math.floor(blockColor.b * 255);

      // Base concrete color
      ctx.fillStyle = `rgb(${baseR}, ${baseG}, ${baseB})`;
      ctx.fillRect(0, 0, 512, 512);
      
      // Add coarse aggregate texture
      const imageData = ctx.getImageData(0, 0, 512, 512);
      for (let i = 0; i < imageData.data.length; i += 4) {
        const noise = Math.random() * 50 - 25;
        imageData.data[i] = Math.max(0, Math.min(255, imageData.data[i] + noise));
        imageData.data[i + 1] = Math.max(0, Math.min(255, imageData.data[i + 1] + noise));
        imageData.data[i + 2] = Math.max(0, Math.min(255, imageData.data[i + 2] + noise));
      }
      ctx.putImageData(imageData, 0, 0);
      
      // Add aggregate stones
      for (let i = 0; i < 150; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        const size = Math.random() * 6 + 2;
        ctx.fillStyle = `rgba(${baseR + 20 + Math.random() * 30}, ${baseG + 20 + Math.random() * 30}, ${baseB + 20 + Math.random() * 30}, ${Math.random() * 0.6 + 0.4})`;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }
      
      // Add darker aggregate
      for (let i = 0; i < 100; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        const size = Math.random() * 4 + 1;
        ctx.fillStyle = `rgba(${Math.max(0, baseR - 20)}, ${Math.max(0, baseG - 20)}, ${Math.max(0, baseB - 20)}, ${Math.random() * 0.5 + 0.3})`;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }
      
      // Add surface imperfections
      for (let i = 0; i < 80; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        const width = Math.random() * 15 + 5;
        const height = Math.random() * 15 + 5;
        ctx.fillStyle = `rgba(${Math.max(0, baseR - 30)}, ${Math.max(0, baseG - 30)}, ${Math.max(0, baseB - 30)}, ${Math.random() * 0.3 + 0.1})`;
        ctx.fillRect(x, y, width, height);
      }
      
      return new THREE.CanvasTexture(canvas);
    };
    
    const concreteTexture = createConcreteTexture();
    concreteTexture.wrapS = THREE.RepeatWrapping;
    concreteTexture.wrapT = THREE.RepeatWrapping;
    
    const blockMaterial = new THREE.MeshStandardMaterial({
      map: concreteTexture,
      color: blockColor,
      roughness: 0.95,
      metalness: 0.0,
      flatShading: false,
    });
    
    // PROPER CINDER BLOCK STRUCTURE
    // A standard cinder block has TWO rectangular hollow cores with a center web
    // The cores run the LENGTH of the block
    
    // Outer shell dimensions
    const outerLength = length * 0.96;
    const outerHeight = height * 0.96;
    const outerWidth = width * 0.96;
    
    // Create the 4 outer walls (front, back, left, right)
    // Front wall (length x height, thin width)
    const frontWall = new THREE.BoxGeometry(outerLength, outerHeight, wallThickness);
    const frontMesh = new THREE.Mesh(frontWall, blockMaterial);
    frontMesh.position.z = outerWidth/2 - wallThickness/2;
    frontMesh.castShadow = true;
    frontMesh.receiveShadow = true;
    group.add(frontMesh);
    
    // Back wall
    const backWall = new THREE.BoxGeometry(outerLength, outerHeight, wallThickness);
    const backMesh = new THREE.Mesh(backWall, blockMaterial);
    backMesh.position.z = -outerWidth/2 + wallThickness/2;
    backMesh.castShadow = true;
    backMesh.receiveShadow = true;
    group.add(backMesh);
    
    // Left end wall (width x height, thin length)
    const leftWall = new THREE.BoxGeometry(wallThickness, outerHeight, outerWidth - 2 * wallThickness);
    const leftMesh = new THREE.Mesh(leftWall, blockMaterial);
    leftMesh.position.x = -outerLength/2 + wallThickness/2;
    leftMesh.castShadow = true;
    leftMesh.receiveShadow = true;
    group.add(leftMesh);
    
    // Right end wall
    const rightWall = new THREE.BoxGeometry(wallThickness, outerHeight, outerWidth - 2 * wallThickness);
    const rightMesh = new THREE.Mesh(rightWall, blockMaterial);
    rightMesh.position.x = outerLength/2 - wallThickness/2;
    rightMesh.castShadow = true;
    rightMesh.receiveShadow = true;
    group.add(rightMesh);
    
    // Top and bottom walls
    const topBottomWall = new THREE.BoxGeometry(outerLength - 2 * wallThickness, wallThickness, outerWidth - 2 * wallThickness);
    const topMesh = new THREE.Mesh(topBottomWall, blockMaterial);
    topMesh.position.y = outerHeight/2 - wallThickness/2;
    topMesh.castShadow = true;
    topMesh.receiveShadow = true;
    group.add(topMesh);
    
    const bottomMesh = new THREE.Mesh(topBottomWall, blockMaterial);
    bottomMesh.position.y = -outerHeight/2 + wallThickness/2;
    bottomMesh.castShadow = true;
    bottomMesh.receiveShadow = true;
    group.add(bottomMesh);
    
    // CENTER WEB - This divides the block into TWO rectangular cavities
    // The web runs along the LENGTH (X-axis) and divides the WIDTH (Z-axis)
    const webThickness = wallThickness * 0.8;
    const centerWeb = new THREE.BoxGeometry(
      outerLength - 2 * wallThickness, 
      outerHeight - 2 * wallThickness, 
      webThickness
    );
    const webMesh = new THREE.Mesh(centerWeb, blockMaterial);
    webMesh.position.set(0, 0, 0); // Centered, creating two cavities on either side
    webMesh.castShadow = true;
    webMesh.receiveShadow = true;
    group.add(webMesh);
    
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
    const thickness = wallThickness * scale; // This variable is not used after definition

    // EPSILON constant for floating point comparisons
    const EPSILON = 0.001;

    if (selectedMaterial) {
      const brickL = selectedMaterial.length * scale;
      const brickW = selectedMaterial.width * scale;
      const brickH = selectedMaterial.height * scale;
      
      const coursesHigh = Math.ceil((height) / (brickH + mortarGap));

      // PROPER RUNNING BOND MASONRY LAYOUT
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

    // AUTO-GENERATE core wall using ALL inventory blocks - prioritize standard cinder blocks
    if (inventory && inventory.length > 0 && selectedMaterial) {
      const cinderBlockColors = [
        0x9E9E9E, // Medium gray
        0xB0B0B0, // Light gray
        0x808080, // Standard gray
        0x909090, // Slightly lighter
        0x707070, // Dark gray
        0xA0A0A0, // Light-medium gray
      ];
      
      // `brickW` here refers to the width of the *outer* selectedMaterial brick
      const outerBrickWidth = selectedMaterial.width * scale; 
      
      // Calculate the available inner space for the core wall
      const innerLength = length - 2 * outerBrickWidth; // Total X-dimension available inside outer walls
      const innerWidth = width - 2 * outerBrickWidth;   // Total Z-dimension available inside outer walls
      const innerHeight = height;                       // Total Y-dimension (height) available
      
      // Sort inventory: prioritize 'block' type materials first, then by height (smaller first for better stacking)
      const sortedInventory = [...inventory]
        .filter(m => m.length && m.width && m.height) // Only consider valid materials with dimensions
        .sort((a, b) => {
          // Prioritize 'block' type over others
          if (a.material_type === 'block' && b.material_type !== 'block') return -1;
          if (a.material_type !== 'block' && b.material_type === 'block') return 1;
          // Then sort by height (ascending)
          return a.height - b.height;
        });
      
      let currentBaseY = mortarGap; // Starting Y position for the first course of core blocks
      let materialIndex = 0;       // Index to iterate through the sorted inventory
      
      // Loop through materials and stack them vertically to fill the core space
      while (currentBaseY < innerHeight - EPSILON && materialIndex < sortedInventory.length) {
        const material = sortedInventory[materialIndex];
        const blockL = material.length * scale;
        const blockW = material.width * scale;
        const blockH = material.height * scale;
        const isBlock = material.material_type === 'block';
        const color = cinderBlockColors[materialIndex % cinderBlockColors.length]; // Assign a consistent color per material type
        
        // If the current material is too tall to fit in the remaining height, move to the next material
        if (currentBaseY + blockH > innerHeight + EPSILON) {
          materialIndex++;
          continue;
        }
        
        let courseNumber = 0;
        let canPlaceMoreCoursesOfThisMaterial = true;
        
        // Place multiple courses of the current material until space runs out or we switch materials
        while (canPlaceMoreCoursesOfThisMaterial && currentBaseY + blockH <= innerHeight + EPSILON) {
          const currentBlockCenterY = currentBaseY + blockH / 2;
          const isEvenCourse = (courseNumber % 2) === 0;
          
          // `coreWallOffset` defines how far from the *inner edge of the outer wall* the *center* of the core block is.
          const coreWallOffset = blockW / 2 + mortarGap; 
          
          let placedInThisCourse = 0; // Count blocks placed in this course
          
          // Minimal space check for core walls to prevent placing blocks that don't fit
          // Requires at least enough space for two rotated (width-wise) blocks plus two length-wise blocks,
          // accounting for mortar gaps in between and at ends.
          const minCoreXSpace = 2 * (blockL + mortarGap) + 2 * (blockW + mortarGap);
          const minCoreZSpace = 2 * (blockL + mortarGap) + 2 * (blockW + mortarGap);

          // Only attempt to place core walls if there's sufficient space
          if (innerLength > minCoreXSpace && innerWidth > minCoreZSpace) {
            if (isEvenCourse) {
              // EVEN COURSES: Core blocks length along X, width along Z
              // FRONT CORE WALL (aligned with the front inner edge of the outer wall)
              // Z position: -innerWidth/2 (front inner edge) + coreWallOffset (to center the current block's width)
              let x = -innerLength/2 + blockL/2 + mortarGap; // Start X from left inner edge, plus block half-length and mortar
              const maxX = innerLength/2 - blockL/2 - mortarGap; // End X before right inner edge
              while (x <= maxX + EPSILON) {
                const block = isBlock ? 
                  createDetailedCinderBlock(blockL, blockH, blockW, color) :
                  createDetailedBrick(blockL, blockH, blockW, color);
                block.position.set(x, currentBlockCenterY, -innerWidth/2 + coreWallOffset);
                scene.add(block);
                placedInThisCourse++;
                x += blockL + mortarGap;
              }
              
              // BACK CORE WALL
              x = -innerLength/2 + blockL/2 + mortarGap;
              while (x <= maxX + EPSILON) {
                const block = isBlock ? 
                  createDetailedCinderBlock(blockL, blockH, blockW, color) :
                  createDetailedBrick(blockL, blockH, blockW, color);
                block.position.set(x, currentBlockCenterY, innerWidth/2 - coreWallOffset);
                scene.add(block);
                placedInThisCourse++;
                x += blockL + mortarGap;
              }
              
              // LEFT CORE WALL (rotated, length along Z, width along X)
              // X position: -innerLength/2 (left inner edge) + coreWallOffset
              // Effective Z range for placement: innerWidth - 2 * coreWallOffset
              const effectiveZSpan = innerWidth - 2 * coreWallOffset - 2 * mortarGap; // Space between front/back core walls
              let z = -effectiveZSpan/2 + blockL/2; // Using blockL because it's rotated
              const maxZ = effectiveZSpan/2 - blockL/2;
              while (z <= maxZ + EPSILON) {
                const block = isBlock ? 
                  createDetailedCinderBlock(blockW, blockH, blockL, color) : // Rotated: length=W, width=L
                  createDetailedBrick(blockW, blockH, blockL, color);
                block.position.set(-innerLength/2 + coreWallOffset, currentBlockCenterY, z);
                scene.add(block);
                placedInThisCourse++;
                z += blockL + mortarGap;
              }
              
              // RIGHT CORE WALL (rotated)
              z = -effectiveZSpan/2 + blockL/2;
              while (z <= maxZ + EPSILON) {
                const block = isBlock ? 
                  createDetailedCinderBlock(blockW, blockH, blockL, color) : // Rotated
                  createDetailedBrick(blockW, blockH, blockL, color);
                block.position.set(innerLength/2 - coreWallOffset, currentBlockCenterY, z);
                scene.add(block);
                placedInThisCourse++;
                z += blockL + mortarGap;
              }
              
            } else { // ODD COURSES: Core blocks length along Z, width along X (rotated)
              // LEFT CORE WALL
              let z = -innerWidth/2 + blockL/2 + mortarGap; // Using blockL because it's rotated
              const maxZ = innerWidth/2 - blockL/2 - mortarGap;
              while (z <= maxZ + EPSILON) {
                const block = isBlock ? 
                  createDetailedCinderBlock(blockW, blockH, blockL, color) : // Rotated
                  createDetailedBrick(blockW, blockH, blockL, color);
                block.position.set(-innerLength/2 + coreWallOffset, currentBlockCenterY, z);
                scene.add(block);
                placedInThisCourse++;
                z += blockL + mortarGap;
              }
              
              // RIGHT CORE WALL
              z = -innerWidth/2 + blockL/2 + mortarGap;
              while (z <= maxZ + EPSILON) {
                const block = isBlock ? 
                  createDetailedCinderBlock(blockW, blockH, blockL, color) : // Rotated
                  createDetailedBrick(blockW, blockH, blockL, color);
                block.position.set(innerLength/2 - coreWallOffset, currentBlockCenterY, z);
                scene.add(block);
                placedInThisCourse++;
                z += blockL + mortarGap;
              }
              
              // FRONT CORE WALL (connecting left to right)
              const effectiveXSpan = innerLength - 2 * coreWallOffset - 2 * mortarGap; // Space between left/right core walls
              let x = -effectiveXSpan/2 + blockL/2; // Using blockL because its length is now along X
              const maxX = effectiveXSpan/2 - blockL/2;
              while (x <= maxX + EPSILON) {
                const block = isBlock ? 
                  createDetailedCinderBlock(blockL, blockH, blockW, color) :
                  createDetailedBrick(blockL, blockH, blockW, color);
                block.position.set(x, currentBlockCenterY, -innerWidth/2 + coreWallOffset);
                scene.add(block);
                placedInThisCourse++;
                x += blockL + mortarGap;
              }
              
              // BACK CORE WALL (connecting left to right)
              x = -effectiveXSpan/2 + blockL/2;
              while (x <= maxX + EPSILON) {
                const block = isBlock ? 
                  createDetailedCinderBlock(blockL, blockH, blockW, color) :
                  createDetailedBrick(blockL, blockH, blockW, color);
                block.position.set(x, currentBlockCenterY, innerWidth/2 - coreWallOffset);
                scene.add(block);
                placedInThisCourse++;
                x += blockL + mortarGap;
              }
            }
          }
          
          if (placedInThisCourse > 0) {
            currentBaseY += blockH + mortarGap; // Advance Y for the next course
            courseNumber++;
            
            // After placing 2-3 courses of this material, consider switching to the next material
            // This creates a layered effect if other materials are available.
            if (courseNumber >= 2 && materialIndex < sortedInventory.length - 1) {
              canPlaceMoreCoursesOfThisMaterial = false; // Stop placing this material, move to next
            }
          } else {
            // If no blocks were placed in this course (e.g., due to insufficient space),
            // stop trying this material for this height.
            canPlaceMoreCoursesOfThisMaterial = false;
          }
        }
        // Move to the next material in the inventory (either because current material ran out of vertical space,
        // or we intentionally switched after a few courses)
        materialIndex++;
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

    // Position labels well above the floor (y=10 instead of y=-5)
    createLabel(`${actualLength.toFixed(1)}"`, new THREE.Vector3(0, 10, -width / 2 - 10));
    createLabel(`${actualWidth.toFixed(1)}"`, new THREE.Vector3(-length / 2 - 10, 10, 0));
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
  }, [actualLength, actualWidth, actualHeight, wallThickness, selectedMaterial, inventory]); // Removed coreBreakdown from dependencies as it's no longer used for rendering

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full border border-slate-200 rounded-lg bg-white"
      style={{ minHeight: '500px' }}
    />
  );
}
