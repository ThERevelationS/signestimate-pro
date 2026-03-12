import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Combined 3D viewer: foundation items + walls with individual brick rendering.
 * Wall shape points are in world inches (origin = foundation origin).
 * Foundation item 0 is placed at world origin; its center is at (L/2, 0, W/2) in feet.
 */
export default function FoundationWalls3DViewer({ items = [], walls = [] }) {
  const mountRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const animFrameRef = useRef(null);

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

    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
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
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(200, 200),
      new THREE.MeshStandardMaterial({ map: dirtTex, roughness: 1.0, transparent: true, opacity: 0.55, depthWrite: false })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    ground.userData.isGround = true;
    scene.add(ground);

    const grid = new THREE.GridHelper(100, 50, 0x3d2b1a, 0x5a3f28);
    grid.position.y = 0.01;
    grid.material.transparent = true; grid.material.opacity = 0.4;
    grid.userData.isGrid = true;
    scene.add(grid);

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

      for (let i = 0; i < qty; i++) {
        const col = i % gridSize;
        const row = Math.floor(i / gridSize);
        // Place so the group of foundations for this item starts at cumulativeOffsetX
        const ox = cumulativeOffsetX + col * spacingX + footprintX / 2;
        const oz = row * spacingZ + footprintZ / 2;

        const group = new THREE.Group();
        group.position.set(ox, 0, oz);

        if (isSpread) {
          const geo = new THREE.BoxGeometry(lenFt, depFt, widFt);
          const mesh = new THREE.Mesh(geo, concMat);
          mesh.position.y = -depFt / 2 + gradeOff;
          mesh.castShadow = true;
          group.add(mesh);
          group.add(Object.assign(
            new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: 0x1e293b })),
            { position: mesh.position.clone() }
          ));
        } else {
          const r = diaFt / 2;
          const geo = new THREE.CylinderGeometry(r, r, depFt, 24);
          const mesh = new THREE.Mesh(geo, concMat);
          mesh.position.y = -depFt / 2 + gradeOff;
          mesh.castShadow = true;
          group.add(mesh);
        }

        // Rebar
        if (item.include_rebar && isSpread) {
          const rebarMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.5, metalness: 0.4 });
          const spacL = (item.rebar_spacing_length || 12) / 12;
          const spacW = (item.rebar_spacing_width || 12) / 12;
          const clearance = 3 / 12;
          const effL = lenFt - 2 * clearance;
          const effW = widFt - 2 * clearance;
          const nL = Math.max(1, Math.floor(effW / spacW) + 1);
          const nW = Math.max(1, Math.floor(effL / spacL) + 1);
          const rDia = 0.04;
          const yPos = -clearance + gradeOff;
          for (let j = 0; j < nL; j++) {
            const zOff = -effW / 2 + j * spacW;
            const rg = new THREE.CylinderGeometry(rDia, rDia, effL, 6);
            const rm = new THREE.Mesh(rg, rebarMat);
            rm.rotation.z = Math.PI / 2; rm.position.set(0, yPos, zOff);
            group.add(rm);
          }
          for (let j = 0; j < nW; j++) {
            const xOff = -effL / 2 + j * spacL;
            const rg = new THREE.CylinderGeometry(rDia, rDia, effW, 6);
            const rm = new THREE.Mesh(rg, rebarMat);
            rm.rotation.x = Math.PI / 2; rm.position.set(xOff, yPos - 0.03, 0);
            group.add(rm);
          }
        }

        scene.add(group);
        foundationCenters.push({ x: ox, z: oz });
      }

      // Next item group starts after this item's grid
      cumulativeOffsetX += gridSize * spacingX + 2;
    });

    // ── WALLS ─────────────────────────────────────────────────────────────────
    // Wall shape points are in WORLD INCHES with origin matching the drawing canvas.
    // In the canvas, the foundation is drawn starting at world inch (0,0).
    // In 3D, the first foundation's corner is also at (0, 0, 0) in feet.
    // So: 3D X = worldInchX / 12, 3D Z = worldInchY / 12
    // The grade offset of the first item determines where walls sit on top.

    const firstItem = items[0];
    const gradeOffsetFt = firstItem ? (firstItem.grade_offset_inches || 0) / 12 : 0;

    walls.forEach((wall) => {
      const shape = wall.shape;
      const mat = wall.selectedMaterial;
      if (!shape || !shape.segments || shape.segments.length === 0 || !mat) return;

      const heightInches = wall.heightInches || 24;
      const mortarGap = wall.mortarGapInches ?? 0.375;

      // Brick/unit dimensions from material
      const brickL = (mat.wall_unit_length_inches || mat.brick_length_inches || 7.625) * INCH; // ft
      const brickH = (mat.wall_unit_height_inches || mat.brick_height_inches || 2.25) * INCH;   // ft
      const brickW = (mat.wall_unit_width_inches || mat.brick_width_inches || 3.625) * INCH;    // ft (thickness of wall)
      const mortarFt = mortarGap * INCH;

      const courseH = brickH + mortarFt; // height of one course
      const numCourses = Math.max(1, Math.round(heightInches * INCH / courseH));
      const wallTopY = gradeOffsetFt + numCourses * courseH;

      // Wall color
      let colorHex = 0xb5451b;
      if (mat.wall_color) {
        const parsed = parseInt(mat.wall_color.replace('#', ''), 16);
        if (!isNaN(parsed)) colorHex = parsed;
      }
      const mortarColor = 0xd4c5a9;

      const brickMat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.9, metalness: 0.02 });
      const mortarMat = new THREE.MeshStandardMaterial({ color: mortarColor, roughness: 1.0 });

      shape.segments.forEach((seg) => {
        const p1 = seg.p1;
        const p2 = seg.p2;
        if (!p1 || !p2) return;

        // Convert world inches → feet for 3D
        const x1 = p1.x / 12;
        const z1 = p1.y / 12;
        const x2 = p2.x / 12;
        const z2 = p2.y / 12;

        const dx = x2 - x1;
        const dz = z2 - z1;
        const segLen = Math.sqrt(dx * dx + dz * dz);
        if (segLen < 0.01) return;

        const angle = -Math.atan2(dz, dx); // rotation around Y
        const cx = (x1 + x2) / 2;
        const cz = (z1 + z2) / 2;

        // How many bricks fit along this segment
        const brickWithMortar = brickL + mortarFt;
        const numBricksAlong = Math.max(1, Math.round(segLen / brickWithMortar));
        const actualBrickL = (segLen - (numBricksAlong + 1) * mortarFt) / numBricksAlong;
        const brickLFinal = Math.max(actualBrickL, 0.01);

        for (let course = 0; course < numCourses; course++) {
          const y = gradeOffsetFt + course * courseH + brickH / 2;
          // Offset alternate courses by half a brick for running bond
          const offset = (course % 2 === 0) ? 0 : brickLFinal / 2;

          // Horizontal mortar bed (between courses, except base)
          if (course > 0) {
            const mortarBedGeo = new THREE.BoxGeometry(segLen, mortarFt, brickW);
            const mortarBed = new THREE.Mesh(mortarBedGeo, mortarMat);
            mortarBed.position.set(cx, gradeOffsetFt + course * courseH - mortarFt / 2, cz);
            mortarBed.rotation.y = angle;
            scene.add(mortarBed);
          }

          // Mortar at start and end of row (head joints)
          // We place bricks with a small gap between them (the head joint)

          for (let b = 0; b < numBricksAlong; b++) {
            // Position along the segment (local X before rotation)
            const localX = -segLen / 2 + offset + mortarFt + b * (brickLFinal + mortarFt) + brickLFinal / 2;
            
            // Handle offset wrapping: if offset pushes brick out of bounds, skip
            const absPos = localX + segLen / 2;
            if (absPos < 0 || absPos > segLen) continue;

            const brickGeo = new THREE.BoxGeometry(brickLFinal, brickH, brickW);
            const brick = new THREE.Mesh(brickGeo, brickMat);

            // Position in world: rotate localX around segment center
            const cosA = Math.cos(-angle);
            const sinA = Math.sin(-angle);
            const worldX = cx + localX * cosA;
            const worldZ = cz + localX * sinA;

            brick.position.set(worldX, y, worldZ);
            brick.rotation.y = angle;
            brick.castShadow = true;
            brick.receiveShadow = true;
            scene.add(brick);

            // Thin head joint mortar between bricks (only if not first brick)
            if (b > 0) {
              const headJointX = localX - brickLFinal / 2 - mortarFt / 2;
              const hjX = cx + headJointX * cosA;
              const hjZ = cz + headJointX * sinA;
              const hjGeo = new THREE.BoxGeometry(mortarFt, brickH, brickW);
              const hj = new THREE.Mesh(hjGeo, mortarMat);
              hj.position.set(hjX, y, hjZ);
              hj.rotation.y = angle;
              scene.add(hj);
            }
          }

          // Top mortar on final course
          if (course === numCourses - 1) {
            const topMortarGeo = new THREE.BoxGeometry(segLen, mortarFt, brickW);
            const topMortar = new THREE.Mesh(topMortarGeo, mortarMat);
            topMortar.position.set(cx, wallTopY - mortarFt / 2, cz);
            topMortar.rotation.y = angle;
            scene.add(topMortar);
          }
        }
      });
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
  }, [items, walls]);

  const handleSaveImage = () => {
    if (rendererRef.current) {
      const link = document.createElement('a');
      link.href = rendererRef.current.domElement.toDataURL('image/jpeg');
      link.download = 'foundation-walls-view.jpg';
      link.click();
    }
  };

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden bg-slate-200">
      <div ref={mountRef} className="w-full h-full" />
      <Button
        onClick={handleSaveImage}
        variant="secondary"
        size="sm"
        className="absolute top-2 right-2 bg-white/80 hover:bg-white shadow-sm backdrop-blur-sm text-xs"
      >
        <Camera className="w-3 h-3 mr-1" /> Save View
      </Button>
      <div className="absolute bottom-2 left-2 text-xs text-white/70 bg-black/30 rounded px-2 py-1 pointer-events-none">
        Drag to orbit · Scroll to zoom
      </div>
    </div>
  );
}