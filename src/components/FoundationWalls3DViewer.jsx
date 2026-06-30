import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { Camera, Maximize, Minimize, Undo, Redo, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Crosshair, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Eye } from 'lucide-react';

export default function FoundationWalls3DViewer({ items = [], walls = [], polesData = [], polesInventory = [], formingInventory = [], wallCaps = [], capInventory = [], beautifyDataUrl = null, onUndo, onRedo, canUndo, canRedo }) {
  const mountRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const animFrameRef = useRef(null);
  const groundMatRef = useRef(null);
  const dirtTexRef = useRef(null);
  const groundMeshRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [xrayMode, setXrayMode] = useState(true);
  const [hideGround, setHideGround] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);
  const hasFramedRef = useRef(false);

  // ── Scene setup (once) ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!mountRef.current) return;

    const w = mountRef.current.clientWidth;
    const h = mountRef.current.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xdde8f0);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 2000);
    camera.position.set(14, 8, 14);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(w, h);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controlsRef.current = controls;

    controls.addEventListener('change', () => {
      if (cameraRef.current && controlsRef.current) {
        const dist = cameraRef.current.position.distanceTo(controlsRef.current.target);
        setZoomLevel(Math.max(1, Math.round((20 / Math.max(0.1, dist)) * 100)));
      }
    });

    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const sun = new THREE.DirectionalLight(0xffffff, 0.9);
    sun.position.set(15, 25, 15);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.left = -60; sun.shadow.camera.right = 60;
    sun.shadow.camera.top = 60; sun.shadow.camera.bottom = -60;
    scene.add(sun);

    // Ground
    const dirtCanvas = document.createElement('canvas');
    dirtCanvas.width = 512; dirtCanvas.height = 512;
    const dCtx = dirtCanvas.getContext('2d');
    dCtx.fillStyle = '#7a5c3a';
    dCtx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 20000; i++) {
      const v = Math.random() > 0.5 ? 0 : 255;
      dCtx.fillStyle = `rgba(${v},${v},${v}, ${Math.random() * 0.06})`;
      dCtx.fillRect(Math.random() * 512, Math.random() * 512, Math.random() * 3 + 1, Math.random() * 3 + 1);
    }
    for (let i=0; i<100; i++) {
        dCtx.beginPath();
        dCtx.arc(Math.random()*512, Math.random()*512, Math.random()*10+2, 0, Math.PI*2);
        dCtx.fillStyle = `rgba(60,40,20,${Math.random()*0.1})`;
        dCtx.fill();
    }
    const dirtTex = new THREE.CanvasTexture(dirtCanvas);
    dirtTex.wrapS = dirtTex.wrapT = THREE.RepeatWrapping;
    dirtTex.repeat.set(20, 20);
    const groundMat = new THREE.MeshStandardMaterial({ map: dirtTex, roughness: 1.0, transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide });
    groundMatRef.current = groundMat;
    dirtTexRef.current = dirtTex;

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(200, 200),
      groundMat
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.002;
    ground.receiveShadow = true;
    ground.userData.isGround = true;
    groundMeshRef.current = ground;
    scene.add(ground);

    // Overlay plane for beautify paint strokes
    const overlayMat = new THREE.MeshStandardMaterial({ 
      transparent: true, 
      opacity: 0, 
      roughness: 1.0, 
      side: THREE.DoubleSide, 
      depthWrite: false 
    });
    const overlay = new THREE.Mesh(
      new THREE.PlaneGeometry(100, 100),
      overlayMat
    );
    overlay.rotation.x = -Math.PI / 2;
    overlay.position.y = 0.001; // slightly above dirt ground
    overlay.receiveShadow = true;
    overlay.userData.isOverlay = true;
    scene.add(overlay);

    groundMatRef.current = overlayMat;

    // Removed grid per user request

    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!mountRef.current) return;
      const nw = mountRef.current.clientWidth, nh = mountRef.current.clientHeight;
      camera.aspect = nw / nh; camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', handleResize);
      controls.dispose(); renderer.dispose();
      if (mountRef.current && renderer.domElement.parentNode === mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  // ── Rebuild objects when data changes ──────────────────────────────────────
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Remove all dynamic objects
    scene.children
      .filter(c => !c.userData.isGround && !c.userData.isOverlay && !c.userData.isGrid && !(c instanceof THREE.AmbientLight) && !(c instanceof THREE.DirectionalLight))
      .forEach(o => scene.remove(o));

    const INCH = 1 / 12; // 1 inch in feet

    // ── FOUNDATIONS ──────────────────────────────────────────────────────────
    // First foundation item is placed with its corner at world origin (x=0, z=0).
    // Subsequent items are offset along X.

    const concreteCanvas = document.createElement('canvas');
    concreteCanvas.width = 512; concreteCanvas.height = 512;
    const cCtx = concreteCanvas.getContext('2d');
    cCtx.fillStyle = '#a1a1aa';
    cCtx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 40000; i++) {
        const v = Math.floor(Math.random() * 50) + 130;
        cCtx.fillStyle = `rgba(${v}, ${v}, ${v}, ${Math.random() * 0.2})`;
        cCtx.fillRect(Math.random() * 512, Math.random() * 512, Math.random() * 2 + 1, Math.random() * 2 + 1);
    }
    const concTex = new THREE.CanvasTexture(concreteCanvas);
    concTex.wrapS = concTex.wrapT = THREE.RepeatWrapping;
    concTex.repeat.set(2, 2);
    
    const concMat = new THREE.MeshStandardMaterial({ 
        map: xrayMode ? null : concTex, 
        color: xrayMode ? 0x9ca3af : 0xffffff,
        roughness: 0.9, 
        metalness: 0.05,
        transparent: xrayMode,
        opacity: xrayMode ? 0.35 : 1.0,
        depthWrite: !xrayMode
    });

    let cumulativeOffsetX = 0;
    const foundationCenters = []; // track where each item's center is for camera framing

    items.forEach((item) => {
      const qty = item.quantity || 1;
      const gridSize = Math.ceil(Math.sqrt(qty));
      const isSpread = item.foundation_type !== 'pillar';
      const lenFt = (item.length_inches || 48) / 12;
      const widFt = (item.width_inches || 48) / 12;
      const depFt = (item.depth_inches || 36) / 12;
      const diaFt = (item.diameter || 24) / 12;
      const gradeOff = (item.grade_offset_inches || 0) / 12;
      const footprintX = isSpread ? lenFt : diaFt;
      const footprintZ = isSpread ? widFt : diaFt;
      const spacingX = footprintX * 1.5 + 1;
      const spacingZ = footprintZ * 1.5 + 1;

      for (let i = 0; i < qty; i++) {
        const col = i % gridSize;
        const row = Math.floor(i / gridSize);
        
        const baseUserOffsetX = (item.offset_x_inches || 0) / 12;
        const baseUserOffsetZ = (item.offset_z_inches || 0) / 12;
        
        const userOffsetX = (item.offsets && item.offsets[i] && item.offsets[i].x !== undefined) ? item.offsets[i].x / 12 : baseUserOffsetX;
        const userOffsetZ = (item.offsets && item.offsets[i] && item.offsets[i].z !== undefined) ? item.offsets[i].z / 12 : baseUserOffsetZ;

        const ox = cumulativeOffsetX + col * spacingX + footprintX / 2 + userOffsetX;
        const oz = row * spacingZ + footprintZ / 2 + userOffsetZ;

        const group = new THREE.Group();
        group.position.set(ox, 0, oz);
        group.rotation.y = -(item.rotation_degrees || 0) * Math.PI / 180;
        
        // Expose center to easily grab it later
        group.userData.centerX = ox;
        group.userData.centerZ = oz;

        if (isSpread) {
          const geo = new THREE.BoxGeometry(lenFt, depFt, widFt);
          const mesh = new THREE.Mesh(geo, concMat);
          mesh.position.y = -depFt / 2 + gradeOff;
          mesh.castShadow = true;
          group.add(mesh);
          const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: 0x1e293b }));
          edges.position.copy(mesh.position);
          group.add(edges);
        } else {
          const r = diaFt / 2;
          const geo = new THREE.CylinderGeometry(r, r, depFt, 24);
          const mesh = new THREE.Mesh(geo, concMat);
          mesh.position.y = -depFt / 2 + gradeOff;
          mesh.castShadow = true;
          group.add(mesh);
        }

        // Forming
        if (item.include_forming && isSpread && item.selected_forming_id) {
          let formHeightFt = depFt;
          let formThickness = 1.5 / 12;
          if (item.selected_forming_id) {
              const formInvMat = formingInventory.find(f => f.id === item.selected_forming_id);
              if (formInvMat) {
                  formThickness = (formInvMat.thickness_inches || 1.5) / 12;
                  if (formInvMat.lumber_size === '2x4') formHeightFt = 3.5 / 12;
                  else if (formInvMat.lumber_size === '2x6') formHeightFt = 5.5 / 12;
                  else if (formInvMat.lumber_size === '2x8') formHeightFt = 7.25 / 12;
                  else if (formInvMat.lumber_size === '2x10') formHeightFt = 9.25 / 12;
                  else if (formInvMat.lumber_size === '2x12') formHeightFt = 11.25 / 12;
                  else if (formInvMat.lumber_size === 'plywood_3/4') formHeightFt = 48 / 12;
              }
          }
          if (formHeightFt > depFt) formHeightFt = depFt;
          
          const formGeo1 = new THREE.BoxGeometry(lenFt + 2 * formThickness, formHeightFt, formThickness);
          const formGeo2 = new THREE.BoxGeometry(formThickness, formHeightFt, widFt);
          const formMat = new THREE.MeshStandardMaterial({ color: 0xba8c63, roughness: 0.9 });
          
          const topOfFoundation = gradeOff;
          const centerY = topOfFoundation - formHeightFt / 2;

          // Form sides
          const f1 = new THREE.Mesh(formGeo1, formMat); f1.position.set(0, centerY, widFt/2 + formThickness/2);
          const f2 = new THREE.Mesh(formGeo1, formMat); f2.position.set(0, centerY, -widFt/2 - formThickness/2);
          const f3 = new THREE.Mesh(formGeo2, formMat); f3.position.set(lenFt/2 + formThickness/2, centerY, 0);
          const f4 = new THREE.Mesh(formGeo2, formMat); f4.position.set(-lenFt/2 - formThickness/2, centerY, 0);
          
          group.add(f1, f2, f3, f4);
        }

        // Rebar
        if (item.include_rebar) {
          const rebarMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.5, metalness: 0.4 });
          const clearance = 3 / 12;
          const rDia = 0.04;
          
          if (isSpread) {
            const spacL = (item.rebar_spacing_length || 12) / 12;
            const spacW = (item.rebar_spacing_width || 12) / 12;
            const layers = item.rebar_layers || 1;
            const layerSep = (item.rebar_layer_separation_inches || 12) / 12;
            
            const effL = lenFt - 2 * clearance;
            const effW = widFt - 2 * clearance;
            
            // Force at least 2 bars so we get the perimeter square
            const nL = Math.max(2, Math.floor(effW / spacW) + 1);
            const nW = Math.max(2, Math.floor(effL / spacL) + 1);
            
            const actualSpacW = effW / (nL - 1);
            const actualSpacL = effL / (nW - 1);
            
            const topYPos = gradeOff - clearance; // start from top of foundation
            
            for (let layer = 0; layer < layers; layer++) {
              const yPos = topYPos - layer * layerSep;
              
              // Bars running along length
              for (let j = 0; j < nL; j++) {
                const zOff = -effW / 2 + j * actualSpacW;
                const rg = new THREE.CylinderGeometry(rDia, rDia, effL, 6);
                const rm = new THREE.Mesh(rg, rebarMat);
                rm.rotation.z = Math.PI / 2; rm.position.set(0, yPos, zOff);
                group.add(rm);
              }
              // Bars running along width
              for (let j = 0; j < nW; j++) {
                const xOff = -effL / 2 + j * actualSpacL;
                const rg = new THREE.CylinderGeometry(rDia, rDia, effW, 6);
                const rm = new THREE.Mesh(rg, rebarMat);
                rm.rotation.x = Math.PI / 2; rm.position.set(xOff, yPos - 0.03, 0); // slightly offset to prevent Z-fighting
                group.add(rm);
              }
            }
            
            // Vertical connectors at intersections
            const verticalHeight = Math.max(0, depFt - (2 * clearance));
            if (verticalHeight > 0) {
              const verticalYPos = -depFt / 2 + gradeOff;
              for (let i = 0; i < nL; i++) {
                for (let j = 0; j < nW; j++) {
                  const zOff = -effW / 2 + i * actualSpacW;
                  const xOff = -effL / 2 + j * actualSpacL;
                  
                  const verticalGeo = new THREE.CylinderGeometry(rDia, rDia, verticalHeight, 6);
                  const verticalRebar = new THREE.Mesh(verticalGeo, rebarMat);
                  verticalRebar.position.set(xOff, verticalYPos, zOff);
                  group.add(verticalRebar);
                }
              }
            }
          } else {
            // Pillar rebar
            const hoopDiaIn = item.pillar_rebar_hoop_diameter || Math.max(0, (item.diameter || 24) - 4);
            const safeHoopDiaIn = Math.min(hoopDiaIn, Math.max(0, (item.diameter || 24) - 4));
            const hoopRadiusFt = safeHoopDiaIn / 2 / 12;
            const layers = item.pillar_rebar_layers || 1;
            const layerSep = (item.pillar_rebar_layer_separation_inches || 12) / 12;
            const verticalCount = item.pillar_vertical_rebar_count || 4;
            
            const topYPos = gradeOff - clearance;
            
            // Hoops
            for (let layer = 0; layer < layers; layer++) {
              const yPos = topYPos - layer * layerSep;
              const hoopGeo = new THREE.TorusGeometry(hoopRadiusFt, rDia, 8, 32);
              const hoop = new THREE.Mesh(hoopGeo, rebarMat);
              hoop.rotation.x = Math.PI / 2;
              hoop.position.set(0, yPos, 0);
              group.add(hoop);
            }
            
            // Verticals
            const verticalHeight = Math.max(0, depFt - (2 * clearance));
            if (verticalHeight > 0 && verticalCount > 0) {
              const verticalYPos = -depFt / 2 + gradeOff;
              for (let i = 0; i < verticalCount; i++) {
                const angle = (i / verticalCount) * Math.PI * 2;
                const xOff = Math.cos(angle) * hoopRadiusFt;
                const zOff = Math.sin(angle) * hoopRadiusFt;
                
                const verticalGeo = new THREE.CylinderGeometry(rDia, rDia, verticalHeight, 6);
                const verticalRebar = new THREE.Mesh(verticalGeo, rebarMat);
                verticalRebar.position.set(xOff, verticalYPos, zOff);
                group.add(verticalRebar);
              }
            }
          }
        }

        scene.add(group);
        foundationCenters.push({ x: ox, z: oz });
      }

      // Next item group starts after this item's grid
      cumulativeOffsetX += gridSize * spacingX + 2;
    });

    // ── WALLS ─────────────────────────────────────────────────────────────────
    const firstItem = items[0];
    const gradeOffsetFt = firstItem ? (firstItem.grade_offset_inches || 0) / 12 : 0;

    walls.forEach((wall) => {
      const shape = wall.shape;
      const mat = wall.selectedMaterial;
      if (!shape || !shape.segments || shape.segments.length === 0 || !mat) return;
      
      // Wall points are relative to canvas 0,0. Let's move them to the foundation center.
      const fc = foundationCenters[0] || { x: 0, z: 0 };
      
      const heightInches = wall.heightInches || 24;
      
      const drawWallLayer = (material, isInternal) => {
        if (!material) return;
        const mortarGap = isInternal ? (wall.internalMortarGapInches ?? 0.375) : (wall.mortarGapInches ?? 0.375);
        const layerHeightInches = isInternal ? (wall.internalWallHeightInches ?? wall.heightInches ?? 24) : (wall.heightInches ?? 24);
        const brickL = (material.wall_unit_length_inches || material.brick_length_inches || 7.625) * INCH;
        const brickH = (material.wall_unit_height_inches || material.brick_height_inches || 2.25) * INCH;
        const brickW = (material.wall_unit_width_inches || material.brick_width_inches || 3.625) * INCH;
        const mortarFt = mortarGap * INCH;
        const courseH = brickH + mortarFt;
        const numCourses = Math.max(1, Math.round(layerHeightInches * INCH / courseH));
        const wallTopY = gradeOffsetFt + numCourses * courseH;

        let colorHex = 0xb5451b;
        if (material.wall_color) {
          const parsed = parseInt(material.wall_color.replace('#', ''), 16);
          if (!isNaN(parsed)) colorHex = parsed;
        }
        const mortarColor = 0xd4c5a9;
        const brickMat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.9, metalness: 0.02 });
        const mortarMat = new THREE.MeshStandardMaterial({ color: mortarColor, roughness: 1.0 });

        // For internal wall, offset the base line inward by the outer wall's width
        const outerBrickW = (mat.wall_unit_width_inches || mat.brick_width_inches || 3.625) * INCH;
        const inwardOffset = isInternal ? (outerBrickW / 2 + brickW / 2) : 0;

        // Pre-compute segment directions for corner overlap logic
        const segData = shape.segments.map((seg) => {
        const p1 = seg.p1, p2 = seg.p2;
        if (!p1 || !p2) return null;
        // Points from SharedCanvas are already in world 3D space (in inches), just convert to feet
        const x1 = (p1.x / 12), z1 = (p1.y / 12);
        const x2 = (p2.x / 12), z2 = (p2.y / 12);
        const dx = x2 - x1, dz = z2 - z1;
          const len = Math.sqrt(dx * dx + dz * dz);
          if (len < 0.01) return null;
          
          // Calculate right-hand normal for inward offset (assuming clockwise drawing)
          const nx = -dz / len;
          const nz = dx / len;
          
          const offX1 = x1 + nx * inwardOffset;
          const offZ1 = z1 + nz * inwardOffset;
          const offX2 = x2 + nx * inwardOffset;
          const offZ2 = z2 + nz * inwardOffset;
          
          return { 
            offX1, offZ1, offX2, offZ2,
            dx, dz, len, dirX: dx/len, dirZ: dz/len, angle: -Math.atan2(dz, dx) 
          };
        });

        const intersect = (p1, d1, p2, d2) => {
          const det = d1.x * d2.z - d1.z * d2.x;
          if (Math.abs(det) < 0.001) return p1;
          const dx = p2.x - p1.x;
          const dz = p2.z - p1.z;
          const t = (dx * d2.z - dz * d2.x) / det;
          return { x: p1.x + t * d1.x, z: p1.z + t * d1.z };
        };

        segData.forEach((sd, segIdx) => {
          if (!sd) return;
          const { dirX, dirZ, angle } = sd;
          
          let segLen = sd.len;
          let originX = sd.offX1;
          let originZ = sd.offZ1;
          let endX = sd.offX2;
          let endZ = sd.offZ2;
          
          const closed = shape.closed !== false;
          let prevSd = null;
          let nextSd = null;
          
          if (closed || segIdx > 0) {
              prevSd = segData[(segIdx - 1 + segData.length) % segData.length];
          }
          if (closed || segIdx < segData.length - 1) {
              nextSd = segData[(segIdx + 1) % segData.length];
          }

          if (isInternal) {
             if (prevSd) {
               const pt = intersect(
                 { x: sd.offX1, z: sd.offZ1 }, { x: dirX, z: dirZ },
                 { x: prevSd.offX1, z: prevSd.offZ1 }, { x: prevSd.dirX, z: prevSd.dirZ }
               );
               originX = pt.x;
               originZ = pt.z;
             }
             if (nextSd) {
               const pt = intersect(
                 { x: sd.offX1, z: sd.offZ1 }, { x: dirX, z: dirZ },
                 { x: nextSd.offX1, z: nextSd.offZ1 }, { x: nextSd.dirX, z: nextSd.dirZ }
               );
               endX = pt.x;
               endZ = pt.z;
             }
             
             const newDx = endX - originX;
             const newDz = endZ - originZ;
             segLen = Math.sqrt(newDx * newDx + newDz * newDz);
             
             // If collapsed or inverted direction
             if (newDx * dirX + newDz * dirZ < 0) {
               segLen = 0;
             }
          }

          if (segLen <= 0.01) return;

          for (let course = 0; course < numCourses; course++) {
            const y = gradeOffsetFt + course * courseH + brickH / 2;
            const even = course % 2 === 0;

            let localStart = 0;
            let localEnd = segLen;

            // Corner at p1 (start)
            if (prevSd) {
              if (even) {
                localStart = -brickW / 2;
              } else {
                localStart = brickW / 2 + mortarFt;
                const mCenter = brickW / 2 + mortarFt / 2;
                const mCx = originX + mCenter * dirX;
                const mCz = originZ + mCenter * dirZ;
                const mortar = new THREE.Mesh(new THREE.BoxGeometry(mortarFt, brickH, brickW), mortarMat);
                mortar.position.set(mCx, y, mCz);
                mortar.rotation.y = angle;
                scene.add(mortar);
              }
            }

            // Corner at p2 (end)
            if (nextSd) {
              if (even) {
                localEnd = segLen - brickW / 2 - mortarFt;
                const mCenter = segLen - brickW / 2 - mortarFt / 2;
                const mCx = originX + mCenter * dirX;
                const mCz = originZ + mCenter * dirZ;
                const mortar = new THREE.Mesh(new THREE.BoxGeometry(mortarFt, brickH, brickW), mortarMat);
                mortar.position.set(mCx, y, mCz);
                mortar.rotation.y = angle;
                scene.add(mortar);
              } else {
                localEnd = segLen + brickW / 2;
              }
            }

            let pos = localStart;
            let firstBrickL = brickL;
            if (!prevSd && !even) {
              firstBrickL = brickL / 2;
            }

            const brickRanges = [];
            while (pos < localEnd - 0.01) {
              const spaceLeft = localEnd - pos;
              const isFirst = brickRanges.length === 0;
              const maxBrick = isFirst ? firstBrickL : brickL;
              const thisBrickL = Math.min(maxBrick, spaceLeft);
              
              if (thisBrickL < 0.02) break;
              brickRanges.push({ left: pos, right: pos + thisBrickL });
              pos += thisBrickL + mortarFt;
            }

            if (brickRanges.length === 0) continue;

            if (course > 0) {
              const bedLeft = prevSd ? (even ? -brickW/2 : 0) : 0;
              const bedRight = nextSd ? (even ? segLen : segLen + brickW/2) : segLen;
              const bedSpan = bedRight - bedLeft;
              const bedCenter = (bedLeft + bedRight) / 2;
              const bedCx = originX + bedCenter * dirX;
              const bedCz = originZ + bedCenter * dirZ;

              const mortarBedGeo = new THREE.BoxGeometry(bedSpan, mortarFt, brickW);
              const mortarBed = new THREE.Mesh(mortarBedGeo, mortarMat);
              mortarBed.position.set(bedCx, gradeOffsetFt + course * courseH - mortarFt / 2, bedCz);
              mortarBed.rotation.y = angle;
              scene.add(mortarBed);
            }

            brickRanges.forEach((br, idx) => {
              const brickLen = br.right - br.left;
              const brickCenterLocal = (br.left + br.right) / 2;
              const bCx = originX + brickCenterLocal * dirX;
              const bCz = originZ + brickCenterLocal * dirZ;

              const brickGeo = new THREE.BoxGeometry(brickLen, brickH, brickW);
              const brick = new THREE.Mesh(brickGeo, brickMat);
              brick.position.set(bCx, y, bCz);
              brick.rotation.y = angle;
              brick.castShadow = true;
              brick.receiveShadow = true;
              scene.add(brick);

              if (idx < brickRanges.length - 1) {
                const mLeft = br.right;
                const mRight = brickRanges[idx + 1].left;
                const mLen = mRight - mLeft;
                if (mLen > 0.001) {
                  const mCenterLocal = (mLeft + mRight) / 2;
                  const mCx = originX + mCenterLocal * dirX;
                  const mCz = originZ + mCenterLocal * dirZ;
                  const mortarGeo = new THREE.BoxGeometry(mLen, brickH, brickW);
                  const mortar = new THREE.Mesh(mortarGeo, mortarMat);
                  mortar.position.set(mCx, y, mCz);
                  mortar.rotation.y = angle;
                  scene.add(mortar);
                }
              }
            });

            if (course === numCourses - 1) {
              const bedLeft = prevSd ? (even ? -brickW/2 : 0) : 0;
              const bedRight = nextSd ? (even ? segLen : segLen + brickW/2) : segLen;
              const bedSpan = bedRight - bedLeft;
              const bedCenter = (bedLeft + bedRight) / 2;
              const bedCx = originX + bedCenter * dirX;
              const bedCz = originZ + bedCenter * dirZ;

              const topMortarGeo = new THREE.BoxGeometry(bedSpan, mortarFt, brickW);
              const topMortar = new THREE.Mesh(topMortarGeo, mortarMat);
              topMortar.position.set(bedCx, wallTopY - mortarFt / 2, bedCz);
              topMortar.rotation.y = angle;
              scene.add(topMortar);
            }
          }
        });
      };

      // Draw Outer Wall
      drawWallLayer(mat, false);
      
      // Draw Internal Wall if enabled
      if (wall.includeInternalWall && wall.selectedInternalMaterial) {
        drawWallLayer(wall.selectedInternalMaterial, true);
      }
    });

    // ── WALL CAPS ────────────────────────────────────────────────────────────
    // Caps sit on top of outer walls. Each cap references (wall_index, segment_index)
    // and a position along that segment (in inches). Internal walls are NEVER capped.
    wallCaps.forEach((cap) => {
      const wall = walls[cap.wall_index];
      const seg = wall?.shape?.segments?.[cap.segment_index];
      if (!seg || !seg.p1 || !seg.p2) return;
      const capInv = capInventory.find(c => c.id === cap.cap_inventory_id);
      if (!capInv) return;

      // Wall top Y (matches drawWallLayer's wallTopY calculation)
      const outerMat = wall.selectedMaterial;
      if (!outerMat) return;
      const mortarGap = wall.mortarGapInches ?? 0.375;
      const brickH = (outerMat.wall_unit_height_inches || outerMat.brick_height_inches || 2.25) * INCH;
      const mortarFt = mortarGap * INCH;
      const courseH = brickH + mortarFt;
      const layerHeightInches = wall.heightInches ?? 24;
      const numCourses = Math.max(1, Math.round(layerHeightInches * INCH / courseH));
      const wallTopY = gradeOffsetFt + numCourses * courseH;

      // Segment direction in feet
      const x1 = seg.p1.x * INCH, z1 = seg.p1.y * INCH;
      const x2 = seg.p2.x * INCH, z2 = seg.p2.y * INCH;
      const dx = x2 - x1, dz = z2 - z1;
      const segLenFt = Math.sqrt(dx * dx + dz * dz);
      if (segLenFt < 0.01) return;
      const ux = dx / segLenFt, uz = dz / segLenFt;
      // Perpendicular (right-hand normal)
      const nx = -uz, nz = ux;

      const capLenFt = (cap.length_inches || 48) * INCH;
      const capWFt = (capInv.cap_width_inches || 8) * INCH;
      const capHFt = (capInv.cap_height_inches || 2) * INCH;
      const posFt = (cap.position_along_segment_inches || 0) * INCH;
      const latFt = (cap.lateral_offset_inches || 0) * INCH;

      // Cap center in world space
      const centerLocalAlong = posFt + capLenFt / 2;
      const cx = x1 + ux * centerLocalAlong + nx * latFt;
      const cz = z1 + uz * centerLocalAlong + nz * latFt;

      let colorHex = 0x9ca3af;
      if (capInv.cap_color) {
        const parsed = parseInt(capInv.cap_color.replace('#', ''), 16);
        if (!isNaN(parsed)) colorHex = parsed;
      }

      const capMat = new THREE.MeshStandardMaterial({
        color: colorHex,
        roughness: 0.7,
        metalness: 0.05,
        transparent: xrayMode,
        opacity: xrayMode ? 0.6 : 1.0,
        depthWrite: !xrayMode,
      });

      const segAngle = -Math.atan2(dz, dx);
      const rotOffset = -((cap.rotation_offset_degrees || 0) * Math.PI / 180);

      const profile = capInv.cap_profile || 'flat';
      let capMesh;
      if (profile === 'rounded') {
        // Half-cylinder on top of a thin slab
        const slabGeo = new THREE.BoxGeometry(capLenFt, capHFt * 0.4, capWFt);
        const slab = new THREE.Mesh(slabGeo, capMat);
        slab.position.y = -capHFt * 0.3;
        const roundGeo = new THREE.CylinderGeometry(capWFt / 2, capWFt / 2, capLenFt, 16, 1, false, 0, Math.PI);
        const round = new THREE.Mesh(roundGeo, capMat);
        round.rotation.z = Math.PI / 2;
        round.position.y = -capHFt * 0.1;
        capMesh = new THREE.Group();
        capMesh.add(slab); capMesh.add(round);
      } else if (profile === 'peaked') {
        // Triangular prism on top of slab
        const slabGeo = new THREE.BoxGeometry(capLenFt, capHFt * 0.4, capWFt);
        const slab = new THREE.Mesh(slabGeo, capMat);
        slab.position.y = -capHFt * 0.3;
        const peakShape = new THREE.Shape();
        peakShape.moveTo(-capWFt / 2, 0);
        peakShape.lineTo(capWFt / 2, 0);
        peakShape.lineTo(0, capHFt * 0.6);
        peakShape.lineTo(-capWFt / 2, 0);
        const peakGeo = new THREE.ExtrudeGeometry(peakShape, { depth: capLenFt, bevelEnabled: false });
        peakGeo.translate(0, 0, -capLenFt / 2);
        const peak = new THREE.Mesh(peakGeo, capMat);
        peak.rotation.y = Math.PI / 2;
        peak.position.y = -capHFt * 0.1;
        capMesh = new THREE.Group();
        capMesh.add(slab); capMesh.add(peak);
      } else if (profile === 'beveled') {
        // Trapezoidal cross-section via ExtrudeGeometry
        const w2 = capWFt / 2, h = capHFt;
        const bevel = capWFt * 0.15;
        const bShape = new THREE.Shape();
        bShape.moveTo(-w2, 0);
        bShape.lineTo(w2, 0);
        bShape.lineTo(w2 - bevel, h);
        bShape.lineTo(-w2 + bevel, h);
        bShape.lineTo(-w2, 0);
        const bGeo = new THREE.ExtrudeGeometry(bShape, { depth: capLenFt, bevelEnabled: false });
        bGeo.translate(0, -h / 2, -capLenFt / 2);
        capMesh = new THREE.Mesh(bGeo, capMat);
        capMesh.rotation.y = Math.PI / 2;
      } else if (profile === 'stepped') {
        const baseGeo = new THREE.BoxGeometry(capLenFt, capHFt * 0.5, capWFt);
        const base = new THREE.Mesh(baseGeo, capMat);
        base.position.y = -capHFt * 0.25;
        const topGeo = new THREE.BoxGeometry(capLenFt * 0.92, capHFt * 0.5, capWFt * 0.78);
        const top = new THREE.Mesh(topGeo, capMat);
        top.position.y = capHFt * 0.25;
        capMesh = new THREE.Group();
        capMesh.add(base); capMesh.add(top);
      } else {
        // flat
        const geo = new THREE.BoxGeometry(capLenFt, capHFt, capWFt);
        capMesh = new THREE.Mesh(geo, capMat);
      }

      const wrap = new THREE.Group();
      wrap.add(capMesh);
      // Position cap so its bottom rests on wallTopY
      wrap.position.set(cx, wallTopY + capHFt / 2, cz);
      wrap.rotation.y = segAngle + rotOffset;
      // Edges
      if (capMesh.geometry) {
        const edges = new THREE.LineSegments(
          new THREE.EdgesGeometry(capMesh.geometry),
          new THREE.LineBasicMaterial({ color: 0x334155, transparent: xrayMode, opacity: xrayMode ? 0.4 : 1 })
        );
        capMesh.add(edges);
      }
      if (capMesh.castShadow !== undefined) capMesh.castShadow = true;
      scene.add(wrap);
    });

    // ── POLES ─────────────────────────────────────────────────────────────────
    polesData.forEach(p => {
        const inv = polesInventory.find(i => i.id === p.pole_id);
        if (!inv) return;
        
        const hFt = (p.height_inches || 0) / 12;
        const yOffFt = (p.y_offset_inches || 0) / 12;
        const widFt = (inv.pole_width_inches || 6) / 12;
        const depFt = (inv.pole_depth_inches || 6) / 12;
        
        // The pole coordinates from SharedCanvas are already in absolute world space (inches)
        let cx = (p.x_inches || 0) / 12;
        let cz = (p.z_inches || 0) / 12;

        const fIdx = p.foundation_idx !== undefined ? p.foundation_idx : 0;
        
        // y_offset is from top of foundation downwards.
        // top of foundation is at gradeOffsetFt.
        const topOfFoundation = gradeOffsetFt;
        const topOfPole = topOfFoundation - yOffFt + hFt;
        const yCenter = topOfPole - hFt / 2;

        let mat = new THREE.MeshStandardMaterial({ color: p.pole_color || 0x475569, roughness: 0.3, metalness: 0.8 }); // default steel
        if (p.paint) mat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.6 });
        
        const group = new THREE.Group();
        group.position.set(cx, yCenter, cz);
        group.rotation.y = -(p.rotation_degrees || 0) * Math.PI / 180;

        let mesh;
        if (inv.pole_shape === 'round') {
            mesh = new THREE.Mesh(new THREE.CylinderGeometry(widFt/2, widFt/2, hFt, 16), mat);
        } else {
            mesh = new THREE.Mesh(new THREE.BoxGeometry(widFt, hFt, depFt), mat);
        }
        
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        group.add(mesh);
        scene.add(group);

        // Render signs
        if (p.signs && p.signs.length > 0) {
            p.signs.forEach(sign => {
                const signGroup = new THREE.Group();
                const elements = sign.elements && sign.elements.length > 0 ? sign.elements : [sign];
                
                elements.forEach(el => {
                    const signShape = new THREE.Shape();
                    let pts = [];
                    
                    if (el.type === 'custom') {
                        pts = el.points || [];
                    } else {
                        const w2 = (el.width || 48) / 2;
                        const h2 = (el.height || 24) / 2;
                        if (el.type === 'rectangle') {
                            pts = [
                                { x: -w2, y: -h2, type: 'line' },
                                { x: w2, y: -h2, type: 'line' },
                                { x: w2, y: h2, type: 'line' },
                                { x: -w2, y: h2, type: 'line' }
                            ];
                        } else if (el.type === 'circle') {
                            for (let i = 0; i < 32; i++) {
                                const theta = (i / 32) * Math.PI * 2;
                                pts.push({ x: Math.cos(theta) * w2, y: Math.sin(theta) * h2, type: 'line' });
                            }
                        }
                    }

                    if (pts.length === 0) return;
                    
                    const ptScale = 1 / 12;
                    signShape.moveTo(pts[0].x * ptScale, -pts[0].y * ptScale);
                    for(let i = 0; i < pts.length; i++) {
                        const pt = pts[i];
                        const nextPt = pts[(i+1)%pts.length];
                        if (pt.type === 'curve' && pt.cx !== undefined) {
                            signShape.quadraticCurveTo(
                                pt.cx * ptScale, -pt.cy * ptScale,
                                nextPt.x * ptScale, -nextPt.y * ptScale
                            );
                        } else {
                            signShape.lineTo(nextPt.x * ptScale, -nextPt.y * ptScale);
                        }
                    }
                    
                    const depthFt = (sign.depth_inches || 12) / 12;
                    const extrudeSettings = {
                        steps: 1, depth: depthFt, bevelEnabled: true,
                        bevelThickness: 0.5 / 12, bevelSize: 0.5 / 12,
                        bevelOffset: 0, bevelSegments: 2
                    };
                    
                    const signGeo = new THREE.ExtrudeGeometry(signShape, extrudeSettings);
                    signGeo.translate(0, 0, -depthFt / 2);
                    
                    let faceColorHex = 0xffffff;
                    let sideColorHex = 0x475569;
                    if (sign.face_color) faceColorHex = parseInt(sign.face_color.replace('#', ''), 16);
                    if (sign.return_color || sign.side_color) sideColorHex = parseInt((sign.return_color || sign.side_color).replace('#', ''), 16);

                    let signMat;
                    const signOpacity = xrayMode ? 0.35 : 1.0;
                    if (sign.image_url && elements.length === 1) {
                        const texLoader = new THREE.TextureLoader();
                        texLoader.setCrossOrigin('anonymous');
                        const tex = texLoader.load(sign.image_url);
                        tex.colorSpace = THREE.SRGBColorSpace;
                        
                        const faceMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.2, color: faceColorHex, transparent: xrayMode, opacity: signOpacity, depthWrite: !xrayMode });
                        const sideMat = new THREE.MeshStandardMaterial({ color: sideColorHex, roughness: 0.5, transparent: xrayMode, opacity: signOpacity, depthWrite: !xrayMode });
                        signMat = [faceMat, sideMat];
                    } else {
                        const faceMat = new THREE.MeshStandardMaterial({ color: faceColorHex, roughness: 0.2, transparent: xrayMode, opacity: signOpacity, depthWrite: !xrayMode });
                        const sideMat = new THREE.MeshStandardMaterial({ color: sideColorHex, roughness: 0.5, transparent: xrayMode, opacity: signOpacity, depthWrite: !xrayMode });
                        signMat = [faceMat, sideMat];
                    }
                    
                    const elMesh = new THREE.Mesh(signGeo, signMat);
                    const exFt = (el.x || 0) / 12;
                    const eyFt = -(el.y || 0) / 12; // inverted y for 3d
                    elMesh.position.set(exFt, eyFt, 0);
                    elMesh.castShadow = true;
                    signGroup.add(elMesh);
                });
                
                const syOffsetFt = (sign.y_offset_inches || 0) / 12;
                const sxOffsetFt = (sign.x_offset_inches || 0) / 12;
                const szOffsetFt = (sign.z_offset_inches || 0) / 12;
                
                signGroup.position.set(sxOffsetFt, (topOfFoundation + syOffsetFt) - yCenter, szOffsetFt);
                group.add(signGroup);
            });
        }
    });

    // ── Camera framing ────────────────────────────────────────────────────────
    // Only auto-frame the FIRST time items appear. After that, leave the user's
    // camera position untouched so edits don't reset the view.
    if (items.length > 0 && !hasFramedRef.current && cameraRef.current && controlsRef.current) {
      hasFramedRef.current = true;
      const first = items[0];
      const lenFt = (first.length_inches || 48) / 12;
      const widFt = (first.width_inches || 48) / 12;
      const cx = lenFt / 2;
      const cz = widFt / 2;
      const dim = Math.max(lenFt, widFt, (first.depth_inches || 36) / 12);
      const d = Math.max(dim * 3.5, 8);
      cameraRef.current.position.set(cx + d, d * 0.7, cz + d);
      cameraRef.current.lookAt(cx, 0, cz);
      controlsRef.current.target.set(cx, 0, cz);
      controlsRef.current.update();
    }
  }, [items, walls, polesData, wallCaps, capInventory, xrayMode]);

  // ── Update Ground Texture ───────────────────────────────────────────────────
  useEffect(() => {
    if (!groundMatRef.current) return;
    
    if (beautifyDataUrl) {
      const img = new Image();
      if (!beautifyDataUrl.startsWith('data:')) {
          img.crossOrigin = "anonymous";
      }
      img.onload = () => {
        const tex = new THREE.Texture(img);
        tex.needsUpdate = true;
        tex.colorSpace = THREE.SRGBColorSpace;
        groundMatRef.current.map = tex;
        groundMatRef.current.color.setHex(0xffffff); 
        groundMatRef.current.opacity = 1.0;
        groundMatRef.current.needsUpdate = true;
      };
      img.src = beautifyDataUrl;
    } else {
      groundMatRef.current.map = null;
      groundMatRef.current.opacity = 0;
      groundMatRef.current.needsUpdate = true;
    }
  }, [beautifyDataUrl]);

  useEffect(() => {
    if (groundMeshRef.current) {
      groundMeshRef.current.visible = !hideGround;
    }
  }, [hideGround]);

  const snapView = (direction) => {
    if (!cameraRef.current || !controlsRef.current) return;
    const target = controlsRef.current.target.clone();
    const dist = Math.max(10, cameraRef.current.position.distanceTo(target));

    let newPos;
    if (direction === 'front') {
      newPos = new THREE.Vector3(target.x, target.y, target.z + dist);
    } else if (direction === 'side') {
      newPos = new THREE.Vector3(target.x + dist, target.y, target.z);
    } else if (direction === 'top') {
      newPos = new THREE.Vector3(target.x, target.y + dist, target.z + 0.01);
    } else if (direction === 'reset') {
      newPos = new THREE.Vector3(target.x + dist * 0.7, target.y + dist * 0.7, target.z + dist * 0.7);
    }

    if (newPos) {
      cameraRef.current.position.copy(newPos);
      cameraRef.current.lookAt(target);
      controlsRef.current.update();
    }
  };

  const handleSaveImage = () => {
    if (rendererRef.current) {
      const link = document.createElement('a');
      link.href = rendererRef.current.domElement.toDataURL('image/jpeg');
      link.download = 'foundation-walls-view.jpg';
      link.click();
    }
  };

  return (
    <div className={isFullscreen ? "fixed inset-0 z-[100] bg-slate-200 flex flex-col" : "relative w-full h-full rounded-xl overflow-hidden bg-slate-200"}>
      <div ref={mountRef} className="w-full h-full flex-1" />
      <div className="absolute top-2 left-2 right-2 flex justify-between items-start pointer-events-none">
        
        {/* Left side tools */}
        <div className="flex gap-2 flex-wrap pointer-events-auto max-w-[50%]">
          <div className="flex gap-1 items-center bg-white/90 backdrop-blur-sm rounded-md shadow-sm border border-slate-200 p-0.5">
            <Button onClick={() => snapView('front')} variant="ghost" size="sm" className="h-7 px-2 text-xs text-slate-600 hover:text-slate-900" title="Front View">Front</Button>
            <Button onClick={() => snapView('side')} variant="ghost" size="sm" className="h-7 px-2 text-xs text-slate-600 hover:text-slate-900" title="Side View">Side</Button>
            <Button onClick={() => snapView('top')} variant="ghost" size="sm" className="h-7 px-2 text-xs text-slate-600 hover:text-slate-900" title="Top View">Top</Button>
            <div className="w-px h-4 bg-slate-300 mx-1"></div>
            <Button onClick={() => snapView('reset')} variant="ghost" size="sm" className="h-7 px-2 text-xs text-blue-600 hover:text-blue-800" title="Default Perspective"><Crosshair className="w-3.5 h-3.5 mr-1" /> Reset</Button>
            <div className="w-px h-4 bg-slate-300 mx-1"></div>
            <div className="px-2 text-xs font-medium text-slate-500 min-w-[3rem] text-center" title="Zoom Level">{zoomLevel}%</div>
          </div>
        </div>

        {/* Right side tools */}
        <div className="flex gap-2 flex-wrap justify-end pointer-events-auto max-w-[50%]">
          <Button onClick={() => setHideGround(!hideGround)} variant={hideGround ? "default" : "secondary"} size="sm" className={`shadow-sm text-xs h-8 ${hideGround ? "bg-blue-600 hover:bg-blue-700" : "bg-white/90 hover:bg-white backdrop-blur-sm"}`}>
            <EyeOff className="w-3 h-3 mr-1" /> {hideGround ? "Show Ground" : "Hide Ground"}
          </Button>
          <Button onClick={() => setXrayMode(!xrayMode)} variant={xrayMode ? "default" : "secondary"} size="sm" className={`shadow-sm text-xs h-8 ${xrayMode ? "bg-indigo-600 hover:bg-indigo-700" : "bg-white/90 hover:bg-white backdrop-blur-sm"}`}>
            <Eye className="w-3 h-3 mr-1" /> {xrayMode ? "Solid Mode" : "X-Ray Mode"}
          </Button>
          <Button onClick={handleSaveImage} variant="secondary" size="sm" className="bg-white/90 hover:bg-white shadow-sm backdrop-blur-sm text-xs h-8">
            <Camera className="w-3 h-3 mr-1" /> Save View
          </Button>
          <Button onClick={() => { setIsFullscreen(!isFullscreen); setTimeout(() => window.dispatchEvent(new Event('resize')), 100); }} variant="secondary" size="sm" className="bg-white/90 hover:bg-white shadow-sm backdrop-blur-sm text-xs h-8">
            {isFullscreen ? <><Minimize className="w-3 h-3 mr-1" /> Exit Full Screen</> : <><Maximize className="w-3 h-3 mr-1" /> Full Screen</>}
          </Button>
        </div>
      </div>

      <div className="absolute bottom-0 inset-x-0 p-2 flex justify-center pointer-events-none">
        <div className="flex gap-6 items-center text-xs text-white bg-gradient-to-t from-black/80 to-transparent pt-8 pb-2 px-4 shadow-lg w-full justify-center">
          <span className="flex items-center gap-1.5"><strong className="text-white">Left Click + Drag:</strong> <span className="text-slate-300">Orbit/Rotate</span></span>
          <div className="w-1 h-1 rounded-full bg-slate-500"></div>
          <span className="flex items-center gap-1.5"><strong className="text-white">Right Click + Drag:</strong> <span className="text-slate-300">Pan/Move</span></span>
          <div className="w-1 h-1 rounded-full bg-slate-500"></div>
          <span className="flex items-center gap-1.5"><strong className="text-white">Scroll Wheel:</strong> <span className="text-slate-300">Zoom in/out</span></span>
        </div>
      </div>
    </div>
  );
}