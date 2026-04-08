import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { Camera, Maximize, Minimize } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Combined 3D viewer: foundation items + walls with individual brick rendering.
 * Wall shape points are in world inches (origin = foundation origin).
 * Foundation item 0 is placed at world origin; its center is at (L/2, 0, W/2) in feet.
 */
export default function FoundationWalls3DViewer({ items = [], walls = [], polesData = [], polesInventory = [], formingInventory = [], beautifyDataUrl = null }) {
  const mountRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const animFrameRef = useRef(null);
  const groundMatRef = useRef(null);
  const dirtTexRef = useRef(null);

  const [isFullscreen, setIsFullscreen] = useState(false);

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
    dirtCanvas.width = 256; dirtCanvas.height = 256;
    const dCtx = dirtCanvas.getContext('2d');
    dCtx.fillStyle = '#7a5c3a';
    dCtx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 4000; i++) {
      const x = Math.random() * 256, y = Math.random() * 256, r = Math.random() * 2 + 0.5;
      const b = Math.random(), a = 0.1 + Math.random() * 0.2;
      dCtx.beginPath(); dCtx.arc(x, y, r, 0, Math.PI * 2);
      dCtx.fillStyle = b > 0.5
        ? `rgba(${160 + Math.floor(Math.random()*40)},${110+Math.floor(Math.random()*30)},${70+Math.floor(Math.random()*20)},${a})`
        : `rgba(${50+Math.floor(Math.random()*20)},${30+Math.floor(Math.random()*15)},${15+Math.floor(Math.random()*10)},${a})`;
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
      new THREE.PlaneGeometry(200, 200),
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
      .filter(c => !c.userData.isGround && !c.userData.isGrid && !(c instanceof THREE.AmbientLight) && !(c instanceof THREE.DirectionalLight))
      .forEach(o => scene.remove(o));

    const INCH = 1 / 12; // 1 inch in feet

    // ── FOUNDATIONS ──────────────────────────────────────────────────────────
    // First foundation item is placed with its corner at world origin (x=0, z=0).
    // Subsequent items are offset along X.

    const concMat = new THREE.MeshStandardMaterial({ color: 0x9ca3af, roughness: 0.7, transparent: true, opacity: 0.8 });

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

      const userOffsetX = (item.offset_x_inches || 0) / 12;
      const userOffsetZ = (item.offset_z_inches || 0) / 12;

      for (let i = 0; i < qty; i++) {
        const col = i % gridSize;
        const row = Math.floor(i / gridSize);
        const ox = cumulativeOffsetX + col * spacingX + footprintX / 2 + userOffsetX;
        const oz = row * spacingZ + footprintZ / 2 + userOffsetZ;

        const group = new THREE.Group();
        group.position.set(ox, 0, oz);

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
        if (item.include_forming && isSpread) {
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

      const heightInches = wall.heightInches || 24;
      
      const drawWallLayer = (material, isInternal) => {
        if (!material) return;
        const mortarGap = isInternal ? (wall.internalMortarGapInches ?? 0.375) : (wall.mortarGapInches ?? 0.375);
        const brickL = (material.wall_unit_length_inches || material.brick_length_inches || 7.625) * INCH;
        const brickH = (material.wall_unit_height_inches || material.brick_height_inches || 2.25) * INCH;
        const brickW = (material.wall_unit_width_inches || material.brick_width_inches || 3.625) * INCH;
        const mortarFt = mortarGap * INCH;
        const courseH = brickH + mortarFt;
        const numCourses = Math.max(1, Math.round(heightInches * INCH / courseH));
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
          const x1 = p1.x / 12, z1 = p1.y / 12;
          const x2 = p2.x / 12, z2 = p2.y / 12;
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

    // ── POLES ─────────────────────────────────────────────────────────────────
    polesData.forEach(p => {
        const inv = polesInventory.find(i => i.id === p.pole_id);
        if (!inv) return;
        
        const hFt = (p.height_inches || 0) / 12;
        const yOffFt = (p.y_offset_inches || 0) / 12;
        const widFt = (inv.pole_width_inches || 6) / 12;
        const depFt = (inv.pole_depth_inches || 6) / 12;
        
        const cx = p.x_inches / 12;
        const cz = p.z_inches / 12;
        
        // y_offset is from top of foundation downwards.
        // top of foundation is at gradeOffsetFt.
        const topOfFoundation = gradeOffsetFt;
        const topOfPole = topOfFoundation - yOffFt + hFt;
        const yCenter = topOfPole - hFt / 2;

        let mat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.3, metalness: 0.8 }); // default steel
        if (p.paint) mat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.6 });
        
        let mesh;
        if (inv.pole_shape === 'round') {
            mesh = new THREE.Mesh(new THREE.CylinderGeometry(widFt/2, widFt/2, hFt, 16), mat);
        } else {
            mesh = new THREE.Mesh(new THREE.BoxGeometry(widFt, hFt, depFt), mat);
        }
        
        mesh.position.set(cx, yCenter, cz);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        scene.add(mesh);
    });

    // ── Camera framing ────────────────────────────────────────────────────────
    if (items.length > 0 && cameraRef.current && controlsRef.current) {
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
  }, [items, walls, polesData]);

  // ── Update Ground Texture ───────────────────────────────────────────────────
  useEffect(() => {
    if (!groundMatRef.current) return;
    
    if (beautifyDataUrl) {
      const img = new Image();
      img.crossOrigin = "anonymous";
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
      <div className="absolute top-2 right-2 flex gap-2">
        <Button
          onClick={handleSaveImage}
          variant="secondary"
          size="sm"
          className="bg-white/80 hover:bg-white shadow-sm backdrop-blur-sm text-xs"
        >
          <Camera className="w-3 h-3 mr-1" /> Save View
        </Button>
        <Button
          onClick={() => {
            setIsFullscreen(!isFullscreen);
            setTimeout(() => window.dispatchEvent(new Event('resize')), 100);
          }}
          variant="secondary"
          size="sm"
          className="bg-white/80 hover:bg-white shadow-sm backdrop-blur-sm text-xs"
        >
          {isFullscreen ? <><Minimize className="w-3 h-3 mr-1" /> Exit Full Screen</> : <><Maximize className="w-3 h-3 mr-1" /> Full Screen</>}
        </Button>
      </div>
      <div className="absolute bottom-2 left-2 text-xs text-white bg-black/60 rounded px-3 py-2 pointer-events-none border border-white/20 shadow-lg">
        <div className="font-semibold mb-1">3D Viewer Controls:</div>
        <ul className="list-disc pl-4 space-y-0.5">
          <li><strong>Left Click + Drag:</strong> Orbit / Rotate view</li>
          <li><strong>Right Click + Drag:</strong> Pan / Move camera</li>
          <li><strong>Scroll Wheel:</strong> Zoom in / out</li>
        </ul>
      </div>
    </div>
  );
}