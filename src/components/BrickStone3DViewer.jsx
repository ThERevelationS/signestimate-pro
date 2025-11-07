
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

  // Create high-detail brick with beveled edges and mortar joints
  const createDetailedBrick = (length, height, width, color) => {
    const group = new THREE.Group();
    
    // Main brick body (slightly smaller to show mortar)
    const brickGeometry = new THREE.BoxGeometry(length * 0.97, height * 0.97, width * 0.97);
    
    // Create brick material with realistic properties
    const brickMaterial = new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.9,
      metalness: 0.0,
      flatShading: false,
    });
    
    const mainBrick = new THREE.Mesh(brickGeometry, brickMaterial);
    group.add(mainBrick);
    
    // Add subtle surface detail lines (horizontal scoring)
    const lineGeometry = new THREE.BoxGeometry(length * 0.95, 0.005, width * 0.95);
    const lineMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color).multiplyScalar(0.85),
      roughness: 1.0,
      metalness: 0.0,
    });
    
    // Add 2-3 horizontal detail lines
    for (let i = 0; i < 2; i++) {
      const line = new THREE.Mesh(lineGeometry, lineMaterial);
      line.position.y = (i - 0.5) * height * 0.3;
      group.add(line);
    }
    
    return group;
  };

  // Create high-detail cinder block with hollow cores
  const createDetailedCinderBlock = (length, height, width, color) => {
    const group = new THREE.Group();
    
    // Create the outer shell
    const wallThickness = Math.min(length, width) * 0.12;
    
    // Main block material
    const blockMaterial = new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.95,
      metalness: 0.0,
      flatShading: false,
    });
    
    // Create the 6 faces that make up the hollow block
    // Front and back faces
    const frontBackGeo = new THREE.BoxGeometry(length * 0.97, height * 0.97, wallThickness);
    const frontFace = new THREE.Mesh(frontBackGeo, blockMaterial);
    frontFace.position.z = width/2 - wallThickness/2;
    group.add(frontFace);
    
    const backFace = new THREE.Mesh(frontBackGeo, blockMaterial);
    backFace.position.z = -width/2 + wallThickness/2;
    group.add(backFace);
    
    // Left and right faces
    const leftRightGeo = new THREE.BoxGeometry(wallThickness, height * 0.97, width * 0.97 - 2 * wallThickness);
    const leftFace = new THREE.Mesh(leftRightGeo, blockMaterial);
    leftFace.position.x = -length/2 + wallThickness/2;
    group.add(leftFace);
    
    const rightFace = new THREE.Mesh(leftRightGeo, blockMaterial);
    rightFace.position.x = length/2 - wallThickness/2;
    group.add(rightFace);
    
    // Top and bottom faces
    const topBottomGeo = new THREE.BoxGeometry(length * 0.97 - 2 * wallThickness, wallThickness, width * 0.97 - 2 * wallThickness);
    const topFace = new THREE.Mesh(topBottomGeo, blockMaterial);
    topFace.position.y = height/2 - wallThickness/2;
    group.add(topFace);
    
    const bottomFace = new THREE.Mesh(topBottomGeo, blockMaterial);
    bottomFace.position.y = -height/2 + wallThickness/2;
    group.add(bottomFace);
    
    // Add center web (divider between cores)
    const webThickness = wallThickness * 0.6;
    const webGeo = new THREE.BoxGeometry(webThickness, height * 0.97 - 2 * wallThickness, width * 0.97 - 2 * wallThickness);
    const web = new THREE.Mesh(webGeo, blockMaterial);
    group.add(web);
    
    // Add texture detail - vertical lines on faces
    const detailMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color).multiplyScalar(0.9),
      roughness: 1.0,
      metalness: 0.0,
    });
    
    const detailGeo = new THREE.BoxGeometry(length * 0.96, 0.01, width * 0.96);
    const topDetail = new THREE.Mesh(detailGeo, detailMaterial);
    topDetail.position.y = height/2 - wallThickness - 0.01;
    group.add(topDetail);
    
    const bottomDetail = new THREE.Mesh(detailGeo, detailMaterial);
    bottomDetail.position.y = -height/2 + wallThickness + 0.01;
    group.add(bottomDetail);
    
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
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
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

    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
    directionalLight2.position.set(-50, 50, -50);
    scene.add(directionalLight2);

    // Add subtle fill light from below
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.2);
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

      // Build walls course by course, placing corners first
      for (let course = 0; course < coursesHigh; course++) {
        const y = course * (brickH + mortarGap) + brickH/2;
        const offset = (course % 2) * (brickL + mortarGap) / 2;
        
        // STEP 1: Place 4 corner bricks on this course
        // Front-left corner
        const cornerFL = createDetailedBrick(brickL, brickH, brickW, 0xa8332e);
        cornerFL.position.set(-length/2 + brickL/2, y, -width/2 + brickW/2);
        cornerFL.castShadow = true;
        cornerFL.receiveShadow = true;
        scene.add(cornerFL);
        
        // Front-right corner
        const cornerFR = createDetailedBrick(brickL, brickH, brickW, 0xa8332e);
        cornerFR.position.set(length/2 - brickL/2, y, -width/2 + brickW/2);
        cornerFR.castShadow = true;
        cornerFR.receiveShadow = true;
        scene.add(cornerFR);
        
        // Back-left corner
        const cornerBL = createDetailedBrick(brickL, brickH, brickW, 0xa8332e);
        cornerBL.position.set(-length/2 + brickL/2, y, width/2 - brickW/2);
        cornerBL.castShadow = true;
        cornerBL.receiveShadow = true;
        scene.add(cornerBL);
        
        // Back-right corner
        const cornerBR = createDetailedBrick(brickL, brickH, brickW, 0xa8332e);
        cornerBR.position.set(length/2 - brickL/2, y, width/2 - brickW/2);
        cornerBR.castShadow = true;
        cornerBR.receiveShadow = true;
        scene.add(cornerBR);
        
        // STEP 2: Fill front wall between corners
        const frontStartX = -length/2 + brickL + mortarGap + brickL/2;
        const frontEndX = length/2 - brickL - mortarGap - brickL/2;
        let currentX = frontStartX - offset;
        while (currentX <= frontEndX) {
          if (currentX - brickL/2 >= frontStartX - brickL/2 && currentX + brickL/2 <= frontEndX + brickL/2) {
            const brick = createDetailedBrick(brickL, brickH, brickW, 0xa8332e);
            brick.position.set(currentX, y, -width/2 + brickW/2);
            brick.castShadow = true;
            brick.receiveShadow = true;
            scene.add(brick);
          }
          currentX += brickL + mortarGap;
        }
        
        // STEP 3: Fill back wall between corners
        const backStartX = -length/2 + brickL + mortarGap + brickL/2;
        const backEndX = length/2 - brickL - mortarGap - brickL/2;
        currentX = backStartX - offset;
        while (currentX <= backEndX) {
          if (currentX - brickL/2 >= backStartX - brickL/2 && currentX + brickL/2 <= backEndX + brickL/2) {
            const brick = createDetailedBrick(brickL, brickH, brickW, 0xa8332e);
            brick.position.set(currentX, y, width/2 - brickW/2);
            brick.castShadow = true;
            brick.receiveShadow = true;
            scene.add(brick);
          }
          currentX += brickL + mortarGap;
        }
        
        // STEP 4: Fill left wall between corners (rotated bricks)
        const leftStartZ = -width/2 + brickW + mortarGap + brickL/2;
        const leftEndZ = width/2 - brickW - mortarGap - brickL/2;
        let currentZ = leftStartZ - offset;
        while (currentZ <= leftEndZ) {
          if (currentZ - brickL/2 >= leftStartZ - brickL/2 && currentZ + brickL/2 <= leftEndZ + brickL/2) {
            const brick = createDetailedBrick(brickW, brickH, brickL, 0xa8332e);
            brick.position.set(-length/2 + brickW/2, y, currentZ);
            brick.castShadow = true;
            brick.receiveShadow = true;
            scene.add(brick);
          }
          currentZ += brickL + mortarGap;
        }
        
        // STEP 5: Fill right wall between corners (rotated bricks)
        const rightStartZ = -width/2 + brickW + mortarGap + brickL/2;
        const rightEndZ = width/2 - brickW - mortarGap - brickL/2;
        currentZ = rightStartZ - offset;
        while (currentZ <= rightEndZ) {
          if (currentZ - brickL/2 >= rightStartZ - brickL/2 && currentZ + brickL/2 <= rightEndZ + brickL/2) {
            const brick = createDetailedBrick(brickW, brickH, brickL, 0xa8332e);
            brick.position.set(length/2 - brickW/2, y, currentZ);
            brick.castShadow = true;
            brick.receiveShadow = true;
            scene.add(brick);
          }
          currentZ += brickL + mortarGap;
        }
      }
    }

    // Add core blocks with individual block models
    if (coreBreakdown && coreBreakdown.length > 0 && inventory) {
      const colors = [0x8B4513, 0xA0522D, 0xD2691E, 0xCD853F, 0xDEB887, 0xF4A460];
      
      const innerLength = length - 2 * thickness;
      const innerWidth = width - 2 * thickness;
      const innerHeight = height;
      
      coreBreakdown.forEach((coreItem, matIndex) => {
        const coreMaterial = inventory.find(m => m.id === coreItem.material_id);
        if (!coreMaterial || coreItem.quantity === 0) return;

        const blockL = coreMaterial.length * scale;
        const blockW = coreMaterial.width * scale;
        const blockH = coreMaterial.height * scale;
        const isBlock = coreMaterial.material_type === 'block';
        
        // Simple grid layout for core blocks
        let placed = 0;
        let currentY = blockH/2; // Start from floor (y=0)
        
        while (currentY < innerHeight && placed < coreItem.quantity) {
          let currentZ = -innerWidth/2 + blockW/2;
          
          while (currentZ < innerWidth/2 && placed < coreItem.quantity) {
            let currentX = -innerLength/2 + blockL/2;
            
            while (currentX < innerLength/2 && placed < coreItem.quantity) {
              const block = isBlock ? 
                createDetailedCinderBlock(blockL, blockH, blockW, colors[matIndex % colors.length]) :
                createDetailedBrick(blockL, blockH, blockW, colors[matIndex % colors.length]);
              
              block.position.set(currentX, currentY, currentZ);
              block.castShadow = true;
              block.receiveShadow = true;
              scene.add(block);
              
              placed++;
              currentX += blockL + mortarGap;
            }
            currentZ += blockW + mortarGap;
          }
          currentY += blockH + mortarGap;
        }
      });
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
