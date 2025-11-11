import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

export default function Foundation3DViewer({
  foundationType = 'spread_foot',
  lengthInches = 12,
  widthInches = 12,
  depthInches = 24,
  diameter = 24,
  rebarSize = '#4',
  rebarSpacingLength = 18,
  rebarSpacingWidth = 18,
  includeRebar = false,
  quantity = 1
}) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const controlsRef = useRef(null);

  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xe0f2fe);
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      50,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      1000
    );
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controlsRef.current = controls;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.near = 0.1;
    directionalLight.shadow.camera.far = 100;
    directionalLight.shadow.camera.left = -50;
    directionalLight.shadow.camera.right = 50;
    directionalLight.shadow.camera.top = 50;
    directionalLight.shadow.camera.bottom = -50;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    // Ground plane - semi-transparent with grid
    const groundGeometry = new THREE.PlaneGeometry(200, 200);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x8b7355,
      roughness: 0.8,
      transparent: true,
      opacity: 0.6
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    ground.receiveShadow = true;
    scene.add(ground);

    // Add grid helper for ground reference
    const gridHelper = new THREE.GridHelper(200, 40, 0x666666, 0x888888);
    gridHelper.position.y = 0.01; // Slightly above ground to prevent z-fighting
    scene.add(gridHelper);

    // Calculate grid layout for multiple foundations
    const gridSize = Math.ceil(Math.sqrt(quantity));
    const spacing = foundationType === 'spread_foot' 
      ? Math.max(lengthInches, widthInches) / 12 * 2.5
      : diameter / 12 * 2.5;

    // Convert dimensions to feet for Three.js
    const lengthFeet = lengthInches / 12;
    const widthFeet = widthInches / 12;
    const depthFeet = depthInches / 12;
    const diameterFeet = diameter / 12;

    // Clear previous objects (except lights and ground)
    const objectsToRemove = [];
    scene.children.forEach(child => {
      if (child !== ground && child !== gridHelper && child !== ambientLight && child !== directionalLight) {
        objectsToRemove.push(child);
      }
    });
    objectsToRemove.forEach(obj => scene.remove(obj));

    // Create multiple foundations in a grid
    for (let i = 0; i < quantity; i++) {
      const row = Math.floor(i / gridSize);
      const col = i % gridSize;
      const offsetX = (col - (gridSize - 1) / 2) * spacing;
      const offsetZ = (row - (gridSize - 1) / 2) * spacing;

      // Create foundation group for this instance
      const foundationGroup = new THREE.Group();
      foundationGroup.position.set(offsetX, 0, offsetZ);

      if (foundationType === 'spread_foot') {
        // Create spread footing - positioned BELOW ground level
        const concreteGeometry = new THREE.BoxGeometry(lengthFeet, depthFeet, widthFeet);
        const concreteMaterial = new THREE.MeshStandardMaterial({ 
          color: 0x9ca3af,
          roughness: 0.7,
          metalness: 0.1 
        });
        const concrete = new THREE.Mesh(concreteGeometry, concreteMaterial);
        concrete.position.y = -depthFeet / 2; // Negative to go below ground
        concrete.castShadow = true;
        concrete.receiveShadow = true;
        foundationGroup.add(concrete);

        // Wireframe outline
        const edgesGeometry = new THREE.EdgesGeometry(concreteGeometry);
        const edgesMaterial = new THREE.LineBasicMaterial({ color: 0x374151, linewidth: 2 });
        const wireframe = new THREE.LineSegments(edgesGeometry, edgesMaterial);
        wireframe.position.copy(concrete.position);
        foundationGroup.add(wireframe);

        // Add rebar if enabled
        if (includeRebar) {
          const rebarGroup = new THREE.Group();
          
          // Rebar dimensions based on size
          const rebarDiameters = { '#3': 0.0313, '#4': 0.0417, '#5': 0.0521, '#6': 0.0625 };
          const rebarDiameter = rebarDiameters[rebarSize] || 0.0417;
          
          const rebarMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x8b4513,
            roughness: 0.6,
            metalness: 0.3 
          });

          const rebarSpacingLengthFeet = rebarSpacingLength / 12;
          const rebarSpacingWidthFeet = rebarSpacingWidth / 12;
          
          const numRebarsLengthwise = Math.floor(widthFeet / rebarSpacingWidthFeet) + 1;
          const numRebarsWidthwise = Math.floor(lengthFeet / rebarSpacingLengthFeet) + 1;
          
          const firstLayerOffset = 3 / 12;
          const layerSpacing = 18 / 12;
          const numLayers = Math.max(1, Math.floor((depthFeet - firstLayerOffset) / layerSpacing) + 1);

          for (let layer = 0; layer < numLayers; layer++) {
            const yPos = -firstLayerOffset - layer * layerSpacing; // Negative for below ground
            
            for (let j = 0; j < numRebarsLengthwise; j++) {
              const zOffset = -widthFeet / 2 + j * rebarSpacingWidthFeet;
              const rebarGeometry = new THREE.CylinderGeometry(rebarDiameter, rebarDiameter, lengthFeet, 8);
              const rebar = new THREE.Mesh(rebarGeometry, rebarMaterial);
              rebar.rotation.z = Math.PI / 2;
              rebar.position.set(0, yPos, zOffset);
              rebarGroup.add(rebar);
            }
            
            for (let j = 0; j < numRebarsWidthwise; j++) {
              const xOffset = -lengthFeet / 2 + j * rebarSpacingLengthFeet;
              const rebarGeometry = new THREE.CylinderGeometry(rebarDiameter, rebarDiameter, widthFeet, 8);
              const rebar = new THREE.Mesh(rebarGeometry, rebarMaterial);
              rebar.rotation.x = Math.PI / 2;
              rebar.position.set(xOffset, yPos, 0);
              rebarGroup.add(rebar);
            }
          }
          
          foundationGroup.add(rebarGroup);
        }

      } else if (foundationType === 'pillar') {
        // Create pillar foundation - positioned BELOW ground level
        const radius = diameterFeet / 2;
        const concreteGeometry = new THREE.CylinderGeometry(radius, radius, depthFeet, 32);
        const concreteMaterial = new THREE.MeshStandardMaterial({ 
          color: 0x9ca3af,
          roughness: 0.7,
          metalness: 0.1 
        });
        const concrete = new THREE.Mesh(concreteGeometry, concreteMaterial);
        concrete.position.y = -depthFeet / 2; // Negative to go below ground
        concrete.castShadow = true;
        concrete.receiveShadow = true;
        foundationGroup.add(concrete);

        // Wireframe outline
        const edgesGeometry = new THREE.EdgesGeometry(concreteGeometry);
        const edgesMaterial = new THREE.LineBasicMaterial({ color: 0x374151, linewidth: 2 });
        const wireframe = new THREE.LineSegments(edgesGeometry, edgesMaterial);
        wireframe.position.copy(concrete.position);
        foundationGroup.add(wireframe);
      }

      scene.add(foundationGroup);
    }

    // Add dimension labels (only for the center foundation)
    const addLabel = (text, position) => {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.width = 256;
      canvas.height = 64;
      
      context.fillStyle = 'rgba(59, 130, 246, 0.9)';
      context.fillRect(0, 0, canvas.width, canvas.height);
      
      context.font = 'Bold 24px Inter, Arial';
      context.fillStyle = 'white';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(text, canvas.width / 2, canvas.height / 2);
      
      const texture = new THREE.CanvasTexture(canvas);
      const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
      const sprite = new THREE.Sprite(spriteMaterial);
      sprite.scale.set(2, 0.5, 1);
      sprite.position.copy(position);
      scene.add(sprite);
    };

    if (foundationType === 'spread_foot') {
      addLabel(`${lengthInches}"`, new THREE.Vector3(0, 0.5, widthFeet / 2 + 1));
      addLabel(`${widthInches}"`, new THREE.Vector3(lengthFeet / 2 + 1, 0.5, 0));
      addLabel(`${depthInches}" deep`, new THREE.Vector3(lengthFeet / 2 + 1, -depthFeet / 2, widthFeet / 2 + 1));
    } else {
      addLabel(`Ø${diameter}"`, new THREE.Vector3(diameterFeet / 2 + 1, 0.5, 0));
      addLabel(`${depthInches}" deep`, new THREE.Vector3(diameterFeet / 2 + 1, -depthFeet / 2, diameterFeet / 2 + 1));
    }

    // Position camera to show both above and below ground
    const maxDimension = Math.max(
      foundationType === 'spread_foot' ? Math.max(lengthFeet, widthFeet) : diameterFeet,
      depthFeet
    ) * gridSize * 1.5;
    
    camera.position.set(maxDimension * 1.2, maxDimension * 0.6, maxDimension * 1.2);
    camera.lookAt(0, -depthFeet / 4, 0); // Look at below ground level
    controls.target.set(0, -depthFeet / 4, 0);
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
      if (!mountRef.current) return;
      const width = mountRef.current.clientWidth;
      const height = mountRef.current.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
      controls.dispose();
    };
  }, [foundationType, lengthInches, widthInches, depthInches, diameter, rebarSize, rebarSpacingLength, rebarSpacingWidth, includeRebar, quantity]);

  return <div ref={mountRef} style={{ width: '100%', height: '100%' }} />;
}