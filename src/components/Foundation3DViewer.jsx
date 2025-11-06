import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

export default function Foundation3DViewer({ length, width, depth, rebarCount, rebarSize, includeRebar }) {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const controlsRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f4f8);
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      50,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(length * 1.5, depth * 2, width * 1.5);
    camera.lookAt(0, 0, 0);

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Orbit controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 2;
    controls.maxDistance = 50;
    controlsRef.current = controls;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.3);
    directionalLight2.position.set(-10, 10, -10);
    scene.add(directionalLight2);

    // Ground plane
    const groundGeometry = new THREE.PlaneGeometry(length * 4, width * 4);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xe8ebe8,
      roughness: 0.8,
      metalness: 0.2
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -depth / 2 - 0.1;
    ground.receiveShadow = true;
    scene.add(ground);

    // Foundation (concrete box)
    const foundationGeometry = new THREE.BoxGeometry(length, depth, width);
    const foundationMaterial = new THREE.MeshStandardMaterial({
      color: 0xcccccc,
      roughness: 0.7,
      metalness: 0.1,
      transparent: true,
      opacity: 0.85
    });
    const foundation = new THREE.Mesh(foundationGeometry, foundationMaterial);
    foundation.castShadow = true;
    foundation.receiveShadow = true;
    scene.add(foundation);

    // Foundation edges (wireframe)
    const edgesGeometry = new THREE.EdgesGeometry(foundationGeometry);
    const edgesMaterial = new THREE.LineBasicMaterial({ color: 0x666666, linewidth: 2 });
    const edges = new THREE.LineSegments(edgesGeometry, edgesMaterial);
    foundation.add(edges);

    // Rebar visualization with layers
    if (includeRebar && rebarCount > 0) {
      const rebarMaterial = new THREE.MeshStandardMaterial({
        color: 0xdc2626,
        roughness: 0.4,
        metalness: 0.8
      });

      // Rebar diameter based on size
      const rebarDiameters = {
        '#3': 0.05,
        '#4': 0.065,
        '#5': 0.08,
        '#6': 0.095
      };
      const rebarRadius = rebarDiameters[rebarSize] || 0.065;

      // Calculate number of horizontal layers
      // First layer at 3 inches from top, then every 18 inches
      const depthInches = depth * 12; // Convert feet to inches
      const firstLayerOffset = 3; // 3 inches from top
      const layerSpacing = 18; // 18 inches between layers
      
      // Calculate how many layers fit
      const numLayers = Math.floor((depthInches - firstLayerOffset) / layerSpacing) + 1;
      
      // Store layer Y positions for vertical connections
      const layerYPositions = [];
      
      // Create rebar at each layer
      for (let layer = 0; layer < numLayers; layer++) {
        // Calculate Y position for this layer (in feet, relative to foundation center)
        const layerDepthInches = firstLayerOffset + (layer * layerSpacing);
        const layerDepthFeet = layerDepthInches / 12;
        // Convert to position relative to foundation center (top of foundation is at +depth/2)
        const yPosition = (depth / 2) - layerDepthFeet;
        layerYPositions.push(yPosition);

        // Create lengthwise rebar bars (running along the length of the foundation)
        const rebarGeometry = new THREE.CylinderGeometry(rebarRadius, rebarRadius, length * 0.9, 12);
        
        // Calculate spacing for rebars across the width
        const spacing = (width * 0.8) / (rebarCount - 1 || 1);
        const startOffset = -(width * 0.4);

        for (let i = 0; i < rebarCount; i++) {
          const rebar = new THREE.Mesh(rebarGeometry, rebarMaterial);
          rebar.rotation.z = Math.PI / 2; // Rotate to be horizontal along length
          rebar.position.set(0, yPosition, startOffset + (i * spacing));
          rebar.castShadow = true;
          foundation.add(rebar);
        }

        // Add cross bars (perpendicular supports) at this layer
        const crossBarGeometry = new THREE.CylinderGeometry(rebarRadius * 0.8, rebarRadius * 0.8, width * 0.8, 12);
        const numCrossBars = Math.max(3, Math.floor(length / 2));
        const crossSpacing = (length * 0.8) / (numCrossBars - 1 || 1);
        const crossStartOffset = -(length * 0.4);

        for (let i = 0; i < numCrossBars; i++) {
          const crossBar = new THREE.Mesh(crossBarGeometry, rebarMaterial);
          crossBar.rotation.x = Math.PI / 2; // Rotate to be horizontal along width
          crossBar.position.set(crossStartOffset + (i * crossSpacing), yPosition, 0);
          crossBar.castShadow = true;
          foundation.add(crossBar);
        }
      }

      // Add vertical rebar bars connecting the layers (only if there are multiple layers)
      if (numLayers > 1) {
        // Calculate the height of vertical bars (distance from top layer to bottom layer)
        const verticalBarHeight = layerYPositions[0] - layerYPositions[numLayers - 1];
        const verticalBarGeometry = new THREE.CylinderGeometry(rebarRadius * 0.9, rebarRadius * 0.9, verticalBarHeight, 12);
        
        // Position vertical bars at the corners and along the perimeter
        const lengthHalf = length * 0.45; // Slightly inside the edge
        const widthHalf = width * 0.4;
        
        // Calculate the center Y position for vertical bars
        const verticalBarYCenter = (layerYPositions[0] + layerYPositions[numLayers - 1]) / 2;
        
        // Corner positions for vertical bars
        const cornerPositions = [
          { x: lengthHalf, z: widthHalf },   // Front-right corner
          { x: lengthHalf, z: -widthHalf },  // Front-left corner
          { x: -lengthHalf, z: widthHalf },  // Back-right corner
          { x: -lengthHalf, z: -widthHalf }, // Back-left corner
        ];
        
        // Add vertical bars at corners
        cornerPositions.forEach(pos => {
          const verticalBar = new THREE.Mesh(verticalBarGeometry, rebarMaterial);
          verticalBar.position.set(pos.x, verticalBarYCenter, pos.z);
          verticalBar.castShadow = true;
          foundation.add(verticalBar);
        });
        
        // Add vertical bars along the length edges (evenly spaced)
        const numVerticalBarsLength = Math.max(3, Math.floor(length / 3));
        const verticalSpacingLength = (length * 0.9) / (numVerticalBarsLength - 1);
        const verticalStartOffsetLength = -(length * 0.45);
        
        for (let i = 1; i < numVerticalBarsLength - 1; i++) { // Skip corners (already added)
          // Along front edge (positive Z)
          const verticalBarFront = new THREE.Mesh(verticalBarGeometry, rebarMaterial);
          verticalBarFront.position.set(verticalStartOffsetLength + (i * verticalSpacingLength), verticalBarYCenter, widthHalf);
          verticalBarFront.castShadow = true;
          foundation.add(verticalBarFront);
          
          // Along back edge (negative Z)
          const verticalBarBack = new THREE.Mesh(verticalBarGeometry, rebarMaterial);
          verticalBarBack.position.set(verticalStartOffsetLength + (i * verticalSpacingLength), verticalBarYCenter, -widthHalf);
          verticalBarBack.castShadow = true;
          foundation.add(verticalBarBack);
        }
        
        // Add vertical bars along the width edges (evenly spaced)
        const numVerticalBarsWidth = Math.max(2, Math.floor(width / 3));
        const verticalSpacingWidth = (width * 0.8) / (numVerticalBarsWidth - 1);
        const verticalStartOffsetWidth = -(width * 0.4);
        
        for (let i = 1; i < numVerticalBarsWidth - 1; i++) { // Skip corners (already added)
          // Along right edge (positive X)
          const verticalBarRight = new THREE.Mesh(verticalBarGeometry, rebarMaterial);
          verticalBarRight.position.set(lengthHalf, verticalBarYCenter, verticalStartOffsetWidth + (i * verticalSpacingWidth));
          verticalBarRight.castShadow = true;
          foundation.add(verticalBarRight);
          
          // Along left edge (negative X)
          const verticalBarLeft = new THREE.Mesh(verticalBarGeometry, rebarMaterial);
          verticalBarLeft.position.set(-lengthHalf, verticalBarYCenter, verticalStartOffsetWidth + (i * verticalSpacingWidth));
          verticalBarLeft.castShadow = true;
          foundation.add(verticalBarLeft);
        }
      }
    }

    // Dimension labels as sprites
    const createTextSprite = (text, position, color = '#1E40AF') => {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.width = 256;
      canvas.height = 64;
      
      context.fillStyle = color;
      context.font = 'Bold 32px Arial';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(text, 128, 32);

      const texture = new THREE.CanvasTexture(canvas);
      const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
      const sprite = new THREE.Sprite(spriteMaterial);
      sprite.scale.set(2, 0.5, 1);
      sprite.position.copy(position);
      return sprite;
    };

    // Add dimension labels
    const lengthLabel = createTextSprite(`${length.toFixed(1)}'`, new THREE.Vector3(0, depth / 2 + 1, width / 2 + 1));
    scene.add(lengthLabel);

    const widthLabel = createTextSprite(`${width.toFixed(1)}'`, new THREE.Vector3(length / 2 + 1, depth / 2 + 1, 0));
    scene.add(widthLabel);

    const depthLabel = createTextSprite(`${depth.toFixed(1)}'`, new THREE.Vector3(length / 2 + 1, 0, width / 2 + 1));
    scene.add(depthLabel);

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Handle window resize
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
  }, [length, width, depth, rebarCount, rebarSize, includeRebar]);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full rounded-lg border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50"
      style={{ minHeight: '400px' }}
    />
  );
}