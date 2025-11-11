
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

        // Add rebar if enabled - with validation
        if (includeRebar) {
          const rebarSpacingLengthFeet = rebarSpacingLength / 12;
          const rebarSpacingWidthFeet = rebarSpacingWidth / 12;
          
          // Validate that rebar spacing fits within bounds
          const canFitRebar = rebarSpacingLengthFeet < lengthFeet && rebarSpacingWidthFeet < widthFeet;
          
          if (canFitRebar) {
            const rebarGroup = new THREE.Group();
            
            // Rebar dimensions based on size
            const rebarDiameters = { '#3': 0.0313, '#4': 0.0417, '#5': 0.0521, '#6': 0.0625 };
            const rebarDiameter = rebarDiameters[rebarSize] || 0.0417;
            
            const rebarMaterial = new THREE.MeshStandardMaterial({ 
              color: 0x8b4513,
              roughness: 0.6,
              metalness: 0.3 
            });
            
            // Number of rebars - ensuring at least one rebar if spacing allows
            // Add 1 to ensure at least one rebar if the dimension is greater than spacing
            const numRebarsLengthwise = Math.floor((widthFeet - rebarSpacingWidthFeet) / rebarSpacingWidthFeet) + 1;
            const numRebarsWidthwise = Math.floor((lengthFeet - rebarSpacingLengthFeet) / rebarSpacingLengthFeet) + 1;
            
            const firstLayerOffset = 3 / 12;
            const layerSpacing = 18 / 12;
            const numLayers = Math.max(1, Math.floor((depthFeet - firstLayerOffset) / layerSpacing) + 1);

            for (let layer = 0; layer < numLayers; layer++) {
              // Ensure rebar stays within the foundation depth
              let yPos = -depthFeet + firstLayerOffset + layer * layerSpacing; 
              // If only one layer, center it in the depth
              if (numLayers === 1) {
                  yPos = -depthFeet / 2;
              } else {
                  // Adjust yPos for multiple layers, positioning from bottom up
                  yPos = -depthFeet + firstLayerOffset + layer * layerSpacing + rebarDiameter; // Position slightly above bottom
              }
              // clamp yPos to be within the concrete
              yPos = Math.min(yPos, -rebarDiameter - firstLayerOffset); // Prevent going above top, leave some concrete cover
              yPos = Math.max(yPos, -depthFeet + rebarDiameter + firstLayerOffset); // Prevent going below bottom, leave some concrete cover

              for (let j = 0; j < numRebarsLengthwise; j++) {
                const zOffset = -widthFeet / 2 + rebarSpacingWidthFeet / 2 + j * rebarSpacingWidthFeet;
                // Clamp zOffset to ensure rebar stays within width
                const clampedZOffset = Math.max(Math.min(zOffset, widthFeet / 2 - rebarDiameter), -widthFeet / 2 + rebarDiameter);
                const rebarGeometry = new THREE.CylinderGeometry(rebarDiameter, rebarDiameter, lengthFeet - rebarDiameter * 2, 8); // Subtract rebarDiameter*2 for cover
                const rebar = new THREE.Mesh(rebarGeometry, rebarMaterial);
                rebar.rotation.z = Math.PI / 2;
                rebar.position.set(0, yPos, clampedZOffset);
                rebarGroup.add(rebar);
              }
              
              for (let j = 0; j < numRebarsWidthwise; j++) {
                const xOffset = -lengthFeet / 2 + rebarSpacingLengthFeet / 2 + j * rebarSpacingLengthFeet;
                // Clamp xOffset to ensure rebar stays within length
                const clampedXOffset = Math.max(Math.min(xOffset, lengthFeet / 2 - rebarDiameter), -lengthFeet / 2 + rebarDiameter);
                const rebarGeometry = new THREE.CylinderGeometry(rebarDiameter, rebarDiameter, widthFeet - rebarDiameter * 2, 8); // Subtract rebarDiameter*2 for cover
                const rebar = new THREE.Mesh(rebarGeometry, rebarMaterial);
                rebar.rotation.x = Math.PI / 2;
                rebar.position.set(clampedXOffset, yPos, 0);
                rebarGroup.add(rebar);
              }
            }
            
            foundationGroup.add(rebarGroup);
          }
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

    // Only add labels for the first foundation (centered one) if quantity is 1 or more
    if (quantity >= 1) {
      // Offset calculation for the "center" foundation in a grid (first one if quantity is 1)
      const centerOffsetX = (0 - (gridSize - 1) / 2) * spacing;
      const centerOffsetZ = (0 - (gridSize - 1) / 2) * spacing;

      if (foundationType === 'spread_foot') {
        addLabel(`${lengthInches}"`, new THREE.Vector3(centerOffsetX, 0.5, centerOffsetZ + widthFeet / 2 + 1));
        addLabel(`${widthInches}"`, new THREE.Vector3(centerOffsetX + lengthFeet / 2 + 1, 0.5, centerOffsetZ));
        addLabel(`${depthInches}" deep`, new THREE.Vector3(centerOffsetX + lengthFeet / 2 + 1, -depthFeet / 2, centerOffsetZ + widthFeet / 2 + 1));
      } else {
        addLabel(`Ø${diameter}"`, new THREE.Vector3(centerOffsetX + diameterFeet / 2 + 1, 0.5, centerOffsetZ));
        addLabel(`${depthInches}" deep`, new THREE.Vector3(centerOffsetX + diameterFeet / 2 + 1, -depthFeet / 2, centerOffsetZ + diameterFeet / 2 + 1));
      }
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
