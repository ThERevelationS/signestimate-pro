import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { Camera } from 'lucide-react';
import { Button } from "@/components/ui/button";

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
  includeForming = false,
  formingMaterial = null,
  quantity = 1,
  gradeOffsetInches = 0 // New prop for grade adjustment
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
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
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

    // Ground plane - slightly elevated to prevent z-fighting
    const groundGeometry = new THREE.PlaneGeometry(200, 200);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x8b7355,
      roughness: 0.8,
      transparent: true,
      opacity: 0.6
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0.02; // Slightly above y=0 to prevent z-fighting
    ground.receiveShadow = true;
    scene.add(ground);

    // Add grid helper for ground reference
    const gridHelper = new THREE.GridHelper(200, 40, 0x666666, 0x888888);
    gridHelper.position.y = 0.03; // Slightly above ground to prevent z-fighting
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
    const gradeOffsetFeet = gradeOffsetInches / 12;

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
        // Create spread footing - SEMI-TRANSPARENT to see rebar inside
        // Position adjusted by grade offset (positive = rises above grade, negative = deeper)
        const concreteGeometry = new THREE.BoxGeometry(lengthFeet, depthFeet, widthFeet);
        const concreteMaterial = new THREE.MeshStandardMaterial({ 
          color: 0x9ca3af,
          roughness: 0.7,
          metalness: 0.1,
          transparent: true,
          opacity: 0.7,
          side: THREE.DoubleSide
        });
        const concrete = new THREE.Mesh(concreteGeometry, concreteMaterial);
        concrete.position.y = -depthFeet / 2 + gradeOffsetFeet;
        concrete.castShadow = true;
        concrete.receiveShadow = true;
        foundationGroup.add(concrete);

        // Wireframe outline - more visible
        const edgesGeometry = new THREE.EdgesGeometry(concreteGeometry);
        const edgesMaterial = new THREE.LineBasicMaterial({ color: 0x1e293b, linewidth: 2 });
        const wireframe = new THREE.LineSegments(edgesGeometry, edgesMaterial);
        wireframe.position.copy(concrete.position);
        foundationGroup.add(wireframe);

        // Add forming material if enabled
        if (includeForming) {
          // Default thickness if not specified in material
          let formThickness = 1.5 / 12; // Default 1.5" (2x lumber) in feet
          if (formingMaterial && formingMaterial.thickness_inches) {
            formThickness = formingMaterial.thickness_inches / 12;
          } else if (formingMaterial && formingMaterial.lumber_size && formingMaterial.lumber_size.startsWith('2x')) {
            formThickness = 1.5 / 12;
          } else if (formingMaterial && formingMaterial.lumber_size === 'plywood_3/4') {
            formThickness = 0.75 / 12;
          }

          // Standard embedment: extends 2 inches below the concrete bottom
          // Form height = concrete depth + 2"
          const embedmentFeet = 2 / 12;
          const formHeight = depthFeet + embedmentFeet;
          const formY = concrete.position.y - (embedmentFeet / 2); // Centered relative to new height

          const formMaterial = new THREE.MeshStandardMaterial({
            color: 0x8b4513, // Wood color
            roughness: 0.9,
            side: THREE.DoubleSide
          });

          // 4 sides
          const formGroup = new THREE.Group();
          
          // Side 1 (Length) - Front
          const side1Geo = new THREE.BoxGeometry(lengthFeet + (2 * formThickness), formHeight, formThickness);
          const side1 = new THREE.Mesh(side1Geo, formMaterial);
          side1.position.set(0, formY, (widthFeet / 2) + (formThickness / 2));
          formGroup.add(side1);

          // Side 2 (Length) - Back
          const side2 = new THREE.Mesh(side1Geo, formMaterial);
          side2.position.set(0, formY, -(widthFeet / 2) - (formThickness / 2));
          formGroup.add(side2);

          // Side 3 (Width) - Left
          const side3Geo = new THREE.BoxGeometry(formThickness, formHeight, widthFeet);
          const side3 = new THREE.Mesh(side3Geo, formMaterial);
          side3.position.set(-(lengthFeet / 2) - (formThickness / 2), formY, 0);
          formGroup.add(side3);

          // Side 4 (Width) - Right
          const side4 = new THREE.Mesh(side3Geo, formMaterial);
          side4.position.set((lengthFeet / 2) + (formThickness / 2), formY, 0);
          formGroup.add(side4);

          foundationGroup.add(formGroup);
        }

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
              color: 0xd97706,
              roughness: 0.6,
              metalness: 0.4,
              emissive: 0xd97706,
              emissiveIntensity: 0.2
            });
            
            // 3" edge clearance for rebar positioning
            const edgeClearance = 3 / 12;
            
            // Calculate effective area for rebar (accounting for 3" clearance on all sides)
            const effectiveLengthFeet = lengthFeet - (2 * edgeClearance);
            const effectiveWidthFeet = widthFeet - (2 * edgeClearance);
            
            const numRebarsLengthwise = Math.floor(effectiveWidthFeet / rebarSpacingWidthFeet) + 1;
            const numRebarsWidthwise = Math.floor(effectiveLengthFeet / rebarSpacingLengthFeet) + 1;
            
            const firstLayerOffset = 3 / 12;
            const layerSpacing = 18 / 12;
            const numLayers = Math.max(1, Math.floor((depthFeet - firstLayerOffset) / layerSpacing) + 1);

            for (let layer = 0; layer < numLayers; layer++) {
              const yPos = -firstLayerOffset - layer * layerSpacing + gradeOffsetFeet;
              
              // Lengthwise rebars (running along X axis)
              for (let j = 0; j < numRebarsLengthwise; j++) {
                const zOffset = -effectiveWidthFeet / 2 + j * rebarSpacingWidthFeet;
                const rebarGeometry = new THREE.CylinderGeometry(rebarDiameter, rebarDiameter, effectiveLengthFeet, 8);
                const rebar = new THREE.Mesh(rebarGeometry, rebarMaterial);
                rebar.rotation.z = Math.PI / 2;
                rebar.position.set(0, yPos, zOffset);
                rebarGroup.add(rebar);
              }
              
              // Widthwise rebars (running along Z axis)
              for (let j = 0; j < numRebarsWidthwise; j++) {
                const xOffset = -effectiveLengthFeet / 2 + j * rebarSpacingLengthFeet;
                const rebarGeometry = new THREE.CylinderGeometry(rebarDiameter, rebarDiameter, effectiveWidthFeet, 8);
                const rebar = new THREE.Mesh(rebarGeometry, rebarMaterial);
                rebar.rotation.x = Math.PI / 2;
                rebar.position.set(xOffset, yPos, 0);
                rebarGroup.add(rebar);
              }
            }
            
            foundationGroup.add(rebarGroup);
          }
        }

      } else if (foundationType === 'pillar') {
        // Create pillar foundation - SEMI-TRANSPARENT
        const radius = diameterFeet / 2;
        const concreteGeometry = new THREE.CylinderGeometry(radius, radius, depthFeet, 32);
        const concreteMaterial = new THREE.MeshStandardMaterial({ 
          color: 0x9ca3af,
          roughness: 0.7,
          metalness: 0.1,
          transparent: true,
          opacity: 0.7,
          side: THREE.DoubleSide
        });
        const concrete = new THREE.Mesh(concreteGeometry, concreteMaterial);
        concrete.position.y = -depthFeet / 2 + gradeOffsetFeet;
        concrete.castShadow = true;
        concrete.receiveShadow = true;
        foundationGroup.add(concrete);

        // Wireframe outline
        const edgesGeometry = new THREE.EdgesGeometry(concreteGeometry);
        const edgesMaterial = new THREE.LineBasicMaterial({ color: 0x1e293b, linewidth: 2 });
        const wireframe = new THREE.LineSegments(edgesGeometry, edgesMaterial);
        wireframe.position.copy(concrete.position);
        foundationGroup.add(wireframe);

        // Add forming material if enabled (Pillar)
        if (includeForming) {
          // Default thickness 0.25" for Sonotube
          let formThickness = 0.25 / 12;
          if (formingMaterial && formingMaterial.thickness_inches) {
            formThickness = formingMaterial.thickness_inches / 12;
          }

          // Standard embedment: extends 2 inches below
          const embedmentFeet = 2 / 12;
          const formHeight = depthFeet + embedmentFeet;
          const formY = concrete.position.y - (embedmentFeet / 2);

          // Tube geometry: Inner radius matches concrete, Outer radius = inner + thickness
          const innerRadius = diameterFeet / 2;
          const outerRadius = innerRadius + formThickness;
          
          const formGeometry = new THREE.CylinderGeometry(outerRadius, outerRadius, formHeight, 32, 1, true); // Open ended tube usually
          // But simple cylinder logic for thickness requires subtraction or RingGeometry extruded?
          // Easiest is to just make a slightly larger cylinder and use side: DoubleSide if it's thin, 
          // or make a Tube. Three.js CylinderGeometry is solid or open-ended surface.
          // To show thickness, we need a TubeGeometry or construct it. 
          // For visual simplicity: A cylinder slightly larger than concrete, side: DoubleSide.
          
          const formMaterial = new THREE.MeshStandardMaterial({
            color: 0xd2b48c, // Cardboard/Sonotube color
            roughness: 0.8,
            side: THREE.DoubleSide
          });

          const form = new THREE.Mesh(formGeometry, formMaterial);
          form.position.set(0, formY, 0);
          foundationGroup.add(form);
        }
      }

      scene.add(foundationGroup);
    }

    // Add dimension labels - FLOATING TEXT without background box
    const addLabel = (text, position) => {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.width = 256;
      canvas.height = 64;
      
      // Transparent background
      context.clearRect(0, 0, canvas.width, canvas.height);
      
      // Add text shadow for readability
      context.shadowColor = 'rgba(0, 0, 0, 0.8)';
      context.shadowBlur = 8;
      context.shadowOffsetX = 2;
      context.shadowOffsetY = 2;
      
      context.font = 'Bold 28px Inter, Arial';
      context.fillStyle = 'white';
      context.strokeStyle = 'rgba(59, 130, 246, 0.9)';
      context.lineWidth = 3;
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      
      // Stroke (outline) for better visibility
      context.strokeText(text, canvas.width / 2, canvas.height / 2);
      context.fillText(text, canvas.width / 2, canvas.height / 2);
      
      const texture = new THREE.CanvasTexture(canvas);
      const spriteMaterial = new THREE.SpriteMaterial({ 
        map: texture,
        depthTest: false,
        depthWrite: false,
        transparent: true
      });
      const sprite = new THREE.Sprite(spriteMaterial);
      sprite.scale.set(2, 0.5, 1);
      sprite.position.copy(position);
      sprite.renderOrder = 999;
      scene.add(sprite);
    };

    if (foundationType === 'spread_foot') {
      addLabel(`${lengthInches}"`, new THREE.Vector3(0, 0.5, widthFeet / 2 + 1));
      addLabel(`${widthInches}"`, new THREE.Vector3(lengthFeet / 2 + 1, 0.5, 0));
      addLabel(`${depthInches}" deep`, new THREE.Vector3(lengthFeet / 2 + 1, -depthFeet / 2 + gradeOffsetFeet, widthFeet / 2 + 1));
    } else {
      addLabel(`Ø${diameter}"`, new THREE.Vector3(diameterFeet / 2 + 1, 0.5, 0));
      addLabel(`${depthInches}" deep`, new THREE.Vector3(diameterFeet / 2 + 1, -depthFeet / 2 + gradeOffsetFeet, diameterFeet / 2 + 1));
    }

    // Position camera to show both above and below ground
    const maxDimension = Math.max(
      foundationType === 'spread_foot' ? Math.max(lengthFeet, widthFeet) : diameterFeet,
      depthFeet
    ) * gridSize * 1.5;
    
    camera.position.set(maxDimension * 1.2, maxDimension * 0.6, maxDimension * 1.2);
    camera.lookAt(0, -depthFeet / 4 + gradeOffsetFeet, 0);
    controls.target.set(0, -depthFeet / 4 + gradeOffsetFeet, 0);
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
  }, [foundationType, lengthInches, widthInches, depthInches, diameter, rebarSize, rebarSpacingLength, rebarSpacingWidth, includeRebar, includeForming, formingMaterial, quantity, gradeOffsetInches]);

  const handleSaveImage = () => {
    if (rendererRef.current) {
      const image = rendererRef.current.domElement.toDataURL("image/jpeg");
      const link = document.createElement("a");
      link.href = image;
      link.download = "foundation-view.jpg";
      link.click();
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
      <Button 
        onClick={handleSaveImage}
        variant="secondary"
        size="sm"
        className="absolute top-4 right-4 bg-white/80 hover:bg-white shadow-sm backdrop-blur-sm"
      >
        <Camera className="w-4 h-4 mr-2" />
        Save View
      </Button>
    </div>
  );
}