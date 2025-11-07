
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

  const createDetailedBrick = (length, height, width, baseColor) => {
    const group = new THREE.Group();
    
    const brickGeometry = new THREE.BoxGeometry(length * 0.96, height * 0.96, width * 0.96);
    
    const createBrickTexture = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');
      
      const brickVariations = [
        { r: 140, g: 45, b: 35 },
        { r: 168, g: 51, b: 46 },
        { r: 155, g: 60, b: 50 },
        { r: 130, g: 40, b: 30 },
      ];
      
      const baseColor = brickVariations[Math.floor(Math.random() * brickVariations.length)];
      
      const gradient = ctx.createLinearGradient(0, 0, 0, 256);
      gradient.addColorStop(0, `rgb(${baseColor.r + 10}, ${baseColor.g + 10}, ${baseColor.b + 10})`);
      gradient.addColorStop(0.5, `rgb(${baseColor.r}, ${baseColor.g}, ${baseColor.b})`);
      gradient.addColorStop(1, `rgb(${baseColor.r - 10}, ${baseColor.g - 10}, ${baseColor.b - 10})`);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 512, 256);
      
      const imageData = ctx.getImageData(0, 0, 512, 256);
      for (let i = 0; i < imageData.data.length; i += 4) {
        const noise = (Math.random() - 0.5) * 40;
        imageData.data[i] = Math.max(0, Math.min(255, imageData.data[i] + noise));
        imageData.data[i + 1] = Math.max(0, Math.min(255, imageData.data[i + 1] + noise));
        imageData.data[i + 2] = Math.max(0, Math.min(255, imageData.data[i + 2] + noise));
      }
      ctx.putImageData(imageData, 0, 0);
      
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
      
      ctx.strokeStyle = `rgba(${baseColor.r * 0.7}, ${baseColor.g * 0.7}, ${baseColor.b * 0.7}, 0.15)`;
      ctx.lineWidth = 1;
      for (let i = 0; i < 12; i++) {
        const y = (256 / 12) * i + (Math.random() - 0.5) * 10;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(512, y);
        ctx.stroke();
      }
      
      const edgeGradient = ctx.createLinearGradient(0, 0, 512, 0);
      edgeGradient.addColorStop(0, `rgba(0, 0, 0, 0.15)`);
      edgeGradient.addColorStop(0.1, `rgba(0, 0, 0, 0)`);
      edgeGradient.addColorStop(0.9, `rgba(0, 0, 0, 0)`);
      edgeGradient.addColorStop(1, `rgba(0, 0, 0, 0.15)`);
      ctx.fillStyle = edgeGradient;
      ctx.fillRect(0, 0, 512, 256);
      
      return new THREE.CanvasTexture(canvas);
    };
    
    const createNormalMap = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');
      
      ctx.fillStyle = '#8080ff';
      ctx.fillRect(0, 0, 512, 256);
      
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

  const createDetailedCinderBlock = (length, height, width, baseColor) => {
    const group = new THREE.Group();
    
    const colorVariation = Math.random() * 0.08 - 0.04;
    const blockColor = new THREE.Color(baseColor).multiplyScalar(1 + colorVariation);
    
    const wallThickness = Math.min(length, width, height) * 0.15;
    
    const createConcreteTexture = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');
      
      const baseR = Math.floor(blockColor.r * 255);
      const baseG = Math.floor(blockColor.g * 255);
      const baseB = Math.floor(blockColor.b * 255);

      ctx.fillStyle = `rgb(${baseR}, ${baseG}, ${baseB})`;
      ctx.fillRect(0, 0, 512, 512);
      
      const imageData = ctx.getImageData(0, 0, 512, 512);
      for (let i = 0; i < imageData.data.length; i += 4) {
        const noise = Math.random() * 50 - 25;
        imageData.data[i] = Math.max(0, Math.min(255, imageData.data[i] + noise));
        imageData.data[i + 1] = Math.max(0, Math.min(255, imageData.data[i + 1] + noise));
        imageData.data[i + 2] = Math.max(0, Math.min(255, imageData.data[i + 2] + noise));
      }
      ctx.putImageData(imageData, 0, 0);
      
      for (let i = 0; i < 150; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        const size = Math.random() * 6 + 2;
        ctx.fillStyle = `rgba(${baseR + 20 + Math.random() * 30}, ${baseG + 20 + Math.random() * 30}, ${baseB + 20 + Math.random() * 30}, ${Math.random() * 0.6 + 0.4})`;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }
      
      for (let i = 0; i < 100; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        const size = Math.random() * 4 + 1;
        ctx.fillStyle = `rgba(${Math.max(0, baseR - 20)}, ${Math.max(0, baseG - 20)}, ${Math.max(0, baseB - 20)}, ${Math.random() * 0.5 + 0.3})`;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }
      
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
    
    const outerLength = length * 0.96;
    const outerHeight = height * 0.96;
    const outerWidth = width * 0.96;
    
    const frontWall = new THREE.BoxGeometry(outerLength, outerHeight, wallThickness);
    const frontMesh = new THREE.Mesh(frontWall, blockMaterial);
    frontMesh.position.z = outerWidth/2 - wallThickness/2;
    frontMesh.castShadow = true;
    frontMesh.receiveShadow = true;
    group.add(frontMesh);
    
    const backWall = new THREE.BoxGeometry(outerLength, outerHeight, wallThickness);
    const backMesh = new THREE.Mesh(backWall, blockMaterial);
    backMesh.position.z = -outerWidth/2 + wallThickness/2;
    backMesh.castShadow = true;
    backMesh.receiveShadow = true;
    group.add(backMesh);
    
    const leftWall = new THREE.BoxGeometry(wallThickness, outerHeight, outerWidth - 2 * wallThickness);
    const leftMesh = new THREE.Mesh(leftWall, blockMaterial);
    leftMesh.position.x = -outerLength/2 + wallThickness/2;
    leftMesh.castShadow = true;
    leftMesh.receiveShadow = true;
    group.add(leftMesh);
    
    const rightWall = new THREE.BoxGeometry(wallThickness, outerHeight, outerWidth - 2 * wallThickness);
    const rightMesh = new THREE.Mesh(rightWall, blockMaterial);
    rightMesh.position.x = outerLength/2 - wallThickness/2;
    rightMesh.castShadow = true;
    rightMesh.receiveShadow = true;
    group.add(rightMesh);
    
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
    
    const webThickness = wallThickness * 0.8;
    const centerWeb = new THREE.BoxGeometry(
      outerLength - 2 * wallThickness, 
      outerHeight - 2 * wallThickness, 
      webThickness
    );
    const webMesh = new THREE.Mesh(centerWeb, blockMaterial);
    webMesh.position.set(0, 0, 0);
    webMesh.castShadow = true;
    webMesh.receiveShadow = true;
    group.add(webMesh);
    
    return group;
  };

  useEffect(() => {
    if (!containerRef.current || !actualLength || !actualWidth || !actualHeight) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8f9fa);
    scene.fog = new THREE.Fog(0xf8f9fa, 100, 500);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      50,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      10000
    );

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 20;
    controls.maxDistance = 500;
    controlsRef.current = controls;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight1 = new THREE.DirectionalLight(0xfff4e6, 1.0);
    directionalLight1.position.set(50, 100, 50);
    directionalLight1.castShadow = true;
    directionalLight1.shadow.camera.left = -200;
    directionalLight1.shadow.camera.right = 200;
    directionalLight1.shadow.camera.top = 200;
    directionalLight1.shadow.camera.bottom = -200;
    directionalLight1.shadow.mapSize.width = 2048;
    directionalLight1.shadow.mapSize.height = 2048;
    directionalLight1.shadow.bias = -0.0001;
    scene.add(directionalLight1);

    const directionalLight2 = new THREE.DirectionalLight(0xe6f3ff, 0.5);
    directionalLight2.position.set(-50, 50, -50);
    scene.add(directionalLight2);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
    fillLight.position.set(0, -30, 0);
    scene.add(fillLight);

    const gridHelper = new THREE.GridHelper(180, 30, 0xcccccc, 0xe0e0e0);
    scene.add(gridHelper);

    const scale = 0.5;
    const mortarGap = 0.375 * scale;

    const length = actualLength * scale;
    const width = actualWidth * scale;
    const height = actualHeight * scale;

    const EPSILON = 0.001;

    if (selectedMaterial) {
      const brickL = selectedMaterial.length * scale;
      const brickW = selectedMaterial.width * scale;
      const brickH = selectedMaterial.height * scale;
      
      const coursesHigh = Math.ceil((height) / (brickH + mortarGap));

      for (let course = 0; course < coursesHigh; course++) {
        const y = course * (brickH + mortarGap) + brickH/2;
        const isEvenCourse = (course % 2) === 0;
        
        if (isEvenCourse) {
          let brick = createDetailedBrick(brickL, brickH, brickW, 0xa8332e);
          brick.position.set(-length/2 + brickL/2, y, -width/2 + brickW/2);
          scene.add(brick);
          
          brick = createDetailedBrick(brickL, brickH, brickW, 0xa8332e);
          brick.position.set(length/2 - brickL/2, y, -width/2 + brickW/2);
          scene.add(brick);
          
          let x = -length/2 + brickL/2 + brickL + mortarGap;
          const endX = length/2 - brickL/2 - (brickL + mortarGap);
          while (x <= endX + EPSILON) {
            brick = createDetailedBrick(brickL, brickH, brickW, 0xa8332e);
            brick.position.set(x, y, -width/2 + brickW/2);
            scene.add(brick);
            x += brickL + mortarGap;
          }
          
          brick = createDetailedBrick(brickL, brickH, brickW, 0xa8332e);
          brick.position.set(-length/2 + brickL/2, y, width/2 - brickW/2);
          scene.add(brick);
          
          brick = createDetailedBrick(brickL, brickH, brickW, 0xa8332e);
          brick.position.set(length/2 - brickL/2, y, width/2 - brickW/2);
          scene.add(brick);
          
          x = -length/2 + brickL/2 + brickL + mortarGap;
          while (x <= endX + EPSILON) {
            brick = createDetailedBrick(brickL, brickH, brickW, 0xa8332e);
            brick.position.set(x, y, width/2 - brickW/2);
            scene.add(brick);
            x += brickL + mortarGap;
          }
          
          const innerWallLengthZ = width - 2 * brickW;
          let z = -innerWallLengthZ/2 + brickL/2;
          const sideWallMaxZ = innerWallLengthZ/2 - brickL/2;
          while (z <= sideWallMaxZ + EPSILON) {
            brick = createDetailedBrick(brickW, brickH, brickL, 0xa8332e);
            brick.position.set(-length/2 + brickW/2, y, z);
            scene.add(brick);
            z += brickL + mortarGap;
          }
          
          z = -innerWallLengthZ/2 + brickL/2;
          while (z <= sideWallMaxZ + EPSILON) {
            brick = createDetailedBrick(brickW, brickH, brickL, 0xa8332e);
            brick.position.set(length/2 - brickW/2, y, z);
            scene.add(brick);
            z += brickL + mortarGap;
          }
          
        } else {
          let brick = createDetailedBrick(brickW, brickH, brickL, 0xa8332e);
          brick.position.set(-length/2 + brickW/2, y, -width/2 + brickL/2);
          scene.add(brick);
          
          brick = createDetailedBrick(brickW, brickH, brickL, 0xa8332e);
          brick.position.set(-length/2 + brickW/2, y, width/2 - brickL/2);
          scene.add(brick);
          
          let z = -width/2 + brickL/2 + brickL + mortarGap;
          const endZ = width/2 - brickL/2 - (brickL + mortarGap);
          while (z <= endZ + EPSILON) {
            brick = createDetailedBrick(brickW, brickH, brickL, 0xa8332e);
            brick.position.set(-length/2 + brickW/2, y, z);
            scene.add(brick);
            z += brickL + mortarGap;
          }
          
          brick = createDetailedBrick(brickW, brickH, brickL, 0xa8332e);
          brick.position.set(length/2 - brickW/2, y, -width/2 + brickL/2);
          scene.add(brick);
          
          brick = createDetailedBrick(brickW, brickH, brickL, 0xa8332e);
          brick.position.set(length/2 - brickW/2, y, width/2 - brickL/2);
          scene.add(brick);
          
          z = -width/2 + brickL/2 + brickL + mortarGap;
          while (z <= endZ + EPSILON) {
            brick = createDetailedBrick(brickW, brickH, brickL, 0xa8332e);
            brick.position.set(length/2 - brickW/2, y, z);
            scene.add(brick);
            z += brickL + mortarGap;
          }
          
          const innerWallLengthX = length - 2 * brickW;
          let x = -innerWallLengthX/2 + brickL/2;
          const frontBackWallMaxX = innerWallLengthX/2 - brickL/2;
          while (x <= frontBackWallMaxX + EPSILON) {
            brick = createDetailedBrick(brickL, brickH, brickW, 0xa8332e);
            brick.position.set(x, y, -width/2 + brickW/2);
            scene.add(brick);
            x += brickL + mortarGap;
          }
          
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

    if (inventory && inventory.length > 0 && selectedMaterial) {
      const cinderBlockColors = [
        0x9E9E9E,
        0xB0B0B0,
        0x808080,
        0x909090,
        0x707070,
        0xA0A0A0,
      ];
      
      const brickW = selectedMaterial.width * scale;
      const innerLength = length - 2 * brickW;
      const innerWidth = width - 2 * brickW;
      const innerHeight = height;
      
      const sortedInventory = [...inventory]
        .filter(m => m.length && m.width && m.height)
        .sort((a, b) => {
          if (a.material_type === 'block' && b.material_type !== 'block') return -1;
          if (a.material_type !== 'block' && b.material_type === 'block') return 1;
          return a.height - b.height;
        });
      
      let currentBaseY = mortarGap;
      let materialIndex = 0;
      
      while (currentBaseY < innerHeight - EPSILON && materialIndex < sortedInventory.length) {
        const material = sortedInventory[materialIndex];
        
        const blockL = material.length * scale;
        const blockW = material.width * scale;
        const blockH = material.height * scale;
        
        const isBlock = material.material_type === 'block';
        const color = cinderBlockColors[materialIndex % cinderBlockColors.length];
        
        if (currentBaseY + blockH > innerHeight + EPSILON) {
          materialIndex++;
          continue;
        }
        
        const currentBlockCenterY = currentBaseY + blockH / 2;
        let layerPlaced = 0;
        
        let z = -innerWidth/2 + blockW/2 + mortarGap;
        const maxZ = innerWidth/2 - blockW/2 - mortarGap;
        
        while (z <= maxZ + EPSILON) {
          let x = -innerLength/2 + blockL/2 + mortarGap;
          const maxX = innerLength/2 - blockL/2 - mortarGap;
          
          while (x <= maxX + EPSILON) {
            const block = isBlock ? 
              createDetailedCinderBlock(blockL, blockH, blockW, color) :
              createDetailedBrick(blockL, blockH, blockW, color);
            
            block.position.set(x, currentBlockCenterY, z);
            scene.add(block);
            
            layerPlaced++;
            x += blockL + mortarGap;
          }
          
          z += blockW + mortarGap;
        }
        
        if (layerPlaced > 0) {
          currentBaseY += blockH + mortarGap;
        } else {
          materialIndex++;
        }
      }
    }

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

    createLabel(`${actualLength.toFixed(1)}"`, new THREE.Vector3(0, 10, -width / 2 - 10));
    createLabel(`${actualWidth.toFixed(1)}"`, new THREE.Vector3(-length / 2 - 10, 10, 0));
    createLabel(`${actualHeight.toFixed(1)}"`, new THREE.Vector3(length / 2 + 10, height / 2, -width / 2));

    const maxDim = Math.max(length, width, height);
    camera.position.set(maxDim * 1.5, maxDim * 1.2, maxDim * 1.5);
    camera.lookAt(0, height / 2, 0);
    controls.target.set(0, height / 2, 0);
    controls.update();

    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!containerRef.current) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
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
  }, [actualLength, actualWidth, actualHeight, wallThickness, selectedMaterial, inventory]);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full border border-slate-200 rounded-lg bg-white"
      style={{ minHeight: '500px' }}
    />
  );
}
