import React, { useEffect, useRef, useMemo, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { base44 } from '@/api/base44Client';

// Shared texture generation
const createSharedTextures = () => {
  // Brick Texture
  const brickCanvas = document.createElement('canvas');
  brickCanvas.width = 64;
  brickCanvas.height = 32;
  const ctx = brickCanvas.getContext('2d');
  
  // Base color
  ctx.fillStyle = '#a8332e';
  ctx.fillRect(0, 0, 64, 32);
  
  // Simple noise
  for(let i=0; i<50; i++) {
    ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.2})`;
    ctx.fillRect(Math.random()*64, Math.random()*32, 2, 2);
  }
  
  const brickTexture = new THREE.CanvasTexture(brickCanvas);
  brickTexture.colorSpace = THREE.SRGBColorSpace;

  // Concrete/Block Texture
  const blockCanvas = document.createElement('canvas');
  blockCanvas.width = 64;
  blockCanvas.height = 64;
  const bCtx = blockCanvas.getContext('2d');
  
  bCtx.fillStyle = '#9e9e9e';
  bCtx.fillRect(0, 0, 64, 64);
  
  for(let i=0; i<100; i++) {
    bCtx.fillStyle = `rgba(255,255,255,${Math.random() * 0.1})`;
    bCtx.fillRect(Math.random()*64, Math.random()*64, 1, 1);
  }
  
  const blockTexture = new THREE.CanvasTexture(blockCanvas);
  blockTexture.colorSpace = THREE.SRGBColorSpace;

  return { brickTexture, blockTexture };
};

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
  const rendererRef = useRef(null);
  const [aiPlacements, setAiPlacements] = useState(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const { brickTexture, blockTexture } = useMemo(() => createSharedTextures(), []);

  // Fetch AI packing when dimensions or materials change
  useEffect(() => {
    const fetchAIPacking = async () => {
      if (!actualLength || !actualWidth || !actualHeight || !selectedMaterial || !inventory || inventory.length === 0) return;
      
      setIsLoadingAI(true);
      try {
        const coreMaterials = inventory.filter(m => m.material_type === 'block');
        if (coreMaterials.length === 0) {
          setAiPlacements(null);
          return;
        }

        const response = await base44.functions.invoke('packCoreWall', {
          wallLength: actualLength,
          wallWidth: actualWidth,
          wallHeight: actualHeight,
          wallThickness: selectedMaterial.width,
          mortarGap: 0.375,
          coreMaterials: coreMaterials
        });

        if (response.data.success) {
          setAiPlacements(response.data.placements);
        }
      } catch (error) {
        console.error('AI packing failed:', error);
        setAiPlacements(null);
      } finally {
        setIsLoadingAI(false);
      }
    };

    fetchAIPacking();
  }, [actualLength, actualWidth, actualHeight, selectedMaterial, inventory]);

  useEffect(() => {
    if (!containerRef.current || !actualLength || !actualWidth || !actualHeight) return;

    // --- SETUP ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8f9fa);
    scene.fog = new THREE.Fog(0xf8f9fa, 50, 500);

    const camera = new THREE.PerspectiveCamera(
      50,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // Clear previous canvas if any
    while(containerRef.current.firstChild) {
      containerRef.current.removeChild(containerRef.current.firstChild);
    }
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    // --- LIGHTING ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xfff4e6, 1.0);
    dirLight.position.set(50, 100, 50);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    scene.add(dirLight);

    const gridHelper = new THREE.GridHelper(200, 20, 0xcccccc, 0xe0e0e0);
    scene.add(gridHelper);

    // --- GEOMETRY & MATERIALS ---
    const scale = 0.5;
    const mortarGap = 0.375 * scale;
    const EPSILON = 0.001;

    const length = actualLength * scale;
    const width = actualWidth * scale;
    const height = actualHeight * scale;

    // Center the camera
    const maxDim = Math.max(length, width, height);
    camera.position.set(maxDim * 1.5, maxDim * 1.2, maxDim * 1.5);
    camera.lookAt(0, height / 2, 0);
    controls.target.set(0, height / 2, 0);

    // --- INSTANCED MESH GENERATION ---
    
    // 1. WALL BRICKS
    if (selectedMaterial) {
      const brickL = selectedMaterial.length * scale;
      const brickW = selectedMaterial.width * scale;
      const brickH = selectedMaterial.height * scale;

      // Estimate max instances needed
      const estBricksL = Math.ceil(length / brickL);
      const estBricksH = Math.ceil(height / brickH);
      const estBricksW = Math.ceil(width / brickL);
      const maxBrickInstances = (estBricksL * 2 + estBricksW * 2) * estBricksH * 4; // Increased safety factor

      const brickGeo = new THREE.BoxGeometry(brickL, brickH, brickW);
      const brickMat = new THREE.MeshStandardMaterial({
        map: brickTexture,
        color: 0xa8332e,
        roughness: 0.9,
      });

      const brickMesh = new THREE.InstancedMesh(brickGeo, brickMat, maxBrickInstances);
      brickMesh.castShadow = true;
      brickMesh.receiveShadow = true;
      brickMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

      let instanceCount = 0;
      const dummy = new THREE.Object3D();

      const courses = Math.ceil(height / (brickH + mortarGap));
      
      for (let course = 0; course < courses; course++) {
        const y = course * (brickH + mortarGap) + brickH/2;
        if (y - brickH/2 > height) break;

        const isEvenCourse = (course % 2) === 0;

        if (isEvenCourse) {
          // Front & Back (Length-wise)
          const startX = -length/2 + brickL/2;
          const endX = length/2 - brickL/2;
          
          let x = startX;
          while(x <= endX + EPSILON) {
            if (instanceCount < maxBrickInstances) {
              dummy.position.set(x, y, -width/2 + brickW/2);
              dummy.rotation.set(0, 0, 0);
              dummy.updateMatrix();
              brickMesh.setMatrixAt(instanceCount++, dummy.matrix);
            }
            x += brickL + mortarGap;
          }
          
          x = startX;
          while(x <= endX + EPSILON) {
            if (instanceCount < maxBrickInstances) {
              dummy.position.set(x, y, width/2 - brickW/2);
              dummy.rotation.set(0, 0, 0);
              dummy.updateMatrix();
              brickMesh.setMatrixAt(instanceCount++, dummy.matrix);
            }
            x += brickL + mortarGap;
          }

          // Side walls (Left & Right)
          const innerW_Z = width - 2 * brickW;
          const startZ_sides = -innerW_Z/2 + brickL/2;
          const endZ_sides = innerW_Z/2 - brickL/2;
          
          let zSide = startZ_sides;
          while (zSide <= endZ_sides + EPSILON) {
             if (instanceCount < maxBrickInstances) {
               dummy.position.set(-length/2 + brickW/2, y, zSide);
               dummy.rotation.set(0, Math.PI/2, 0);
               dummy.updateMatrix();
               brickMesh.setMatrixAt(instanceCount++, dummy.matrix);
             }
             zSide += brickL + mortarGap;
          }

          zSide = startZ_sides;
          while (zSide <= endZ_sides + EPSILON) {
             if (instanceCount < maxBrickInstances) {
               dummy.position.set(length/2 - brickW/2, y, zSide);
               dummy.rotation.set(0, Math.PI/2, 0);
               dummy.updateMatrix();
               brickMesh.setMatrixAt(instanceCount++, dummy.matrix);
             }
             zSide += brickL + mortarGap;
          }

        } else {
          // Odd Course
          const startZ = -width/2 + brickL/2;
          const endZ = width/2 - brickL/2;
          
          let z = startZ;
          while (z <= endZ + EPSILON) {
            if (instanceCount < maxBrickInstances) {
              dummy.position.set(-length/2 + brickW/2, y, z);
              dummy.rotation.set(0, Math.PI/2, 0);
              dummy.updateMatrix();
              brickMesh.setMatrixAt(instanceCount++, dummy.matrix);
            }
            z += brickL + mortarGap;
          }
          
          z = startZ;
          while (z <= endZ + EPSILON) {
            if (instanceCount < maxBrickInstances) {
              dummy.position.set(length/2 - brickW/2, y, z);
              dummy.rotation.set(0, Math.PI/2, 0);
              dummy.updateMatrix();
              brickMesh.setMatrixAt(instanceCount++, dummy.matrix);
            }
            z += brickL + mortarGap;
          }
          
          const innerL_X = length - 2 * brickW;
          const startX_sides = -innerL_X/2 + brickL/2;
          const endX_sides = innerL_X/2 - brickL/2;
          
          let x = startX_sides;
          while (x <= endX_sides + EPSILON) {
            if (instanceCount < maxBrickInstances) {
              dummy.position.set(x, y, -width/2 + brickW/2);
              dummy.rotation.set(0, 0, 0);
              dummy.updateMatrix();
              brickMesh.setMatrixAt(instanceCount++, dummy.matrix);
            }
            x += brickL + mortarGap;
          }
          
          x = startX_sides;
          while (x <= endX_sides + EPSILON) {
            if (instanceCount < maxBrickInstances) {
              dummy.position.set(x, y, width/2 - brickW/2);
              dummy.rotation.set(0, 0, 0);
              dummy.updateMatrix();
              brickMesh.setMatrixAt(instanceCount++, dummy.matrix);
            }
            x += brickL + mortarGap;
          }
        }
      }

      brickMesh.count = instanceCount;
      brickMesh.instanceMatrix.needsUpdate = true; // Critical fix!
      scene.add(brickMesh);
    }

    // 2. CORE BLOCKS - AI-GENERATED PACKING
    if (aiPlacements && aiPlacements.length > 0 && inventory) {
      const blockGroups = {}; // Group by material_id for instanced rendering
      
      aiPlacements.forEach(placement => {
        const material = inventory.find(m => m.id === placement.material_id);
        if (!material) return;

        const dims = placement.dimensions;
        const key = `${dims.length}_${dims.width}_${dims.height}`;
        
        if (!blockGroups[key]) {
          blockGroups[key] = {
            geometry: new THREE.BoxGeometry(dims.length * scale, dims.height * scale, dims.width * scale),
            matrices: [],
            material: material
          };
        }

        const dummy = new THREE.Object3D();
        dummy.position.set(
          placement.position.x * scale,
          placement.position.y * scale,
          placement.position.z * scale
        );
        dummy.rotation.set(
          placement.rotation.x,
          placement.rotation.y,
          placement.rotation.z
        );
        dummy.updateMatrix();
        blockGroups[key].matrices.push(dummy.matrix.clone());
      });

      // Render each group
      Object.values(blockGroups).forEach(group => {
        if (group.matrices.length === 0) return;

        const mat = new THREE.MeshStandardMaterial({
          map: blockTexture,
          color: 0x9e9e9e,
          roughness: 0.95
        });

        const mesh = new THREE.InstancedMesh(group.geometry, mat, group.matrices.length);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);

        group.matrices.forEach((matrix, i) => {
          mesh.setMatrixAt(i, matrix);
        });
        
        mesh.instanceMatrix.needsUpdate = true;
        scene.add(mesh);
      });
    }

    // --- ANIMATION ---
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
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
  }, [actualLength, actualWidth, actualHeight, wallThickness, selectedMaterial, inventory, brickTexture, blockTexture, aiPlacements]);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full border border-slate-200 rounded-lg bg-white"
      style={{ minHeight: '500px' }}
    />
  );
}