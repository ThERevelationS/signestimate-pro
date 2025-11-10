import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

export default function Foundation3DViewer({ 
  lengthInches, 
  widthInches, 
  depthInches, 
  rebarSize, 
  rebarSpacingLength,
  rebarSpacingWidth,
  includeRebar 
}) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Convert inches to feet for 3D visualization
    const length = lengthInches / 12;
    const width = widthInches / 12;
    const depth = depthInches / 12;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f4f8);

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

    // Orbit controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 2;
    controls.maxDistance = 50;

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

    // Rebar visualization - ONLY if includeRebar is true
    if (includeRebar) {
      const rebarMaterial = new THREE.MeshStandardMaterial({
        color: 0xdc2626,
        roughness: 0.4,
        metalness: 0.8
      });

      const rebarDiameters = {
        '#3': 0.05,
        '#4': 0.065,
        '#5': 0.08,
        '#6': 0.095
      };
      const rebarRadius = rebarDiameters[rebarSize] || 0.065;

      const firstLayerOffset = 3;
      const layerSpacing = 18;
      const numLayers = Math.floor((depthInches - firstLayerOffset) / layerSpacing) + 1;
      
      const layerYPositions = [];
      
      const numRebarsLength = Math.floor(widthInches / rebarSpacingWidth) + 1;
      const numRebarsWidth = Math.floor(lengthInches / rebarSpacingLength) + 1;
      
      for (let layer = 0; layer < numLayers; layer++) {
        const layerDepthInches = firstLayerOffset + (layer * layerSpacing);
        const layerDepthFeet = layerDepthInches / 12;
        const yPosition = (depth / 2) - layerDepthFeet;
        layerYPositions.push(yPosition);

        const rebarGeometry = new THREE.CylinderGeometry(rebarRadius, rebarRadius, length * 0.9, 12);
        
        const spacingFeet = rebarSpacingWidth / 12;
        const startOffset = -(width * 0.4);

        for (let i = 0; i < numRebarsLength; i++) {
          const rebar = new THREE.Mesh(rebarGeometry, rebarMaterial);
          rebar.rotation.z = Math.PI / 2;
          rebar.position.set(0, yPosition, startOffset + (i * spacingFeet));
          rebar.castShadow = true;
          foundation.add(rebar);
        }

        const crossBarGeometry = new THREE.CylinderGeometry(rebarRadius * 0.8, rebarRadius * 0.8, width * 0.8, 12);
        const crossSpacingFeet = rebarSpacingLength / 12;
        const crossStartOffset = -(length * 0.4);

        for (let i = 0; i < numRebarsWidth; i++) {
          const crossBar = new THREE.Mesh(crossBarGeometry, rebarMaterial);
          crossBar.rotation.x = Math.PI / 2;
          crossBar.position.set(crossStartOffset + (i * crossSpacingFeet), yPosition, 0);
          crossBar.castShadow = true;
          foundation.add(crossBar);
        }
      }

      if (numLayers > 1) {
        const verticalBarHeight = layerYPositions[0] - layerYPositions[numLayers - 1];
        const verticalBarGeometry = new THREE.CylinderGeometry(rebarRadius * 0.9, rebarRadius * 0.9, verticalBarHeight, 12);
        const verticalBarYCenter = (layerYPositions[0] + layerYPositions[numLayers - 1]) / 2;
        
        const lengthSpacingFeet = rebarSpacingLength / 12;
        const widthSpacingFeet = rebarSpacingWidth / 12;
        const lengthStartOffset = -(length * 0.4);
        const widthStartOffset = -(width * 0.4);
        
        for (let i = 0; i < numRebarsWidth; i++) {
          for (let j = 0; j < numRebarsLength; j++) {
            const verticalBar = new THREE.Mesh(verticalBarGeometry, rebarMaterial);
            verticalBar.position.set(
              lengthStartOffset + (i * lengthSpacingFeet),
              verticalBarYCenter,
              widthStartOffset + (j * widthSpacingFeet)
            );
            verticalBar.castShadow = true;
            foundation.add(verticalBar);
          }
        }
      }
    }

    // Dimension labels
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

    const lengthLabel = createTextSprite(`${lengthInches}"`, new THREE.Vector3(0, depth / 2 + 1, width / 2 + 1));
    scene.add(lengthLabel);

    const widthLabel = createTextSprite(`${widthInches}"`, new THREE.Vector3(length / 2 + 1, depth / 2 + 1, 0));
    scene.add(widthLabel);

    const depthLabel = createTextSprite(`${depthInches}"`, new THREE.Vector3(length / 2 + 1, 0, width / 2 + 1));
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
  }, [lengthInches, widthInches, depthInches, rebarSize, rebarSpacingLength, rebarSpacingWidth, includeRebar]);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full rounded-lg border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50"
      style={{ minHeight: '400px' }}
    />
  );
}