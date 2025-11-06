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

    // Rebar visualization
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

      // Create lengthwise rebar bars
      const rebarGeometry = new THREE.CylinderGeometry(rebarRadius, rebarRadius, length * 0.9, 12);
      
      // Calculate spacing for rebars across the width
      const spacing = (width * 0.8) / (rebarCount - 1 || 1);
      const startOffset = -(width * 0.4);

      for (let i = 0; i < rebarCount; i++) {
        const rebar = new THREE.Mesh(rebarGeometry, rebarMaterial);
        rebar.rotation.z = Math.PI / 2;
        rebar.position.set(0, -depth * 0.15, startOffset + (i * spacing));
        rebar.castShadow = true;
        foundation.add(rebar);
      }

      // Add cross bars (perpendicular supports)
      const crossBarGeometry = new THREE.CylinderGeometry(rebarRadius * 0.8, rebarRadius * 0.8, width * 0.8, 12);
      const numCrossBars = Math.max(3, Math.floor(length / 2));
      const crossSpacing = (length * 0.8) / (numCrossBars - 1 || 1);
      const crossStartOffset = -(length * 0.4);

      for (let i = 0; i < numCrossBars; i++) {
        const crossBar = new THREE.Mesh(crossBarGeometry, rebarMaterial);
        crossBar.rotation.x = Math.PI / 2;
        crossBar.position.set(crossStartOffset + (i * crossSpacing), -depth * 0.15, 0);
        crossBar.castShadow = true;
        foundation.add(crossBar);
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