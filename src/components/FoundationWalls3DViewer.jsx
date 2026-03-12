import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Persistent combined 3D viewer showing all foundation items + all walls together.
 * Props:
 *   items: foundation items array
 *   walls: wall sections array (each with shape, heightInches, selectedMaterial, mortarGapInches, offsetFraction)
 */
export default function FoundationWalls3DViewer({ items = [], walls = [] }) {
  const mountRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const animFrameRef = useRef(null);

  // Initial scene setup — runs once
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

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const sun = new THREE.DirectionalLight(0xffffff, 0.9);
    sun.position.set(15, 25, 15);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.left = -60;
    sun.shadow.camera.right = 60;
    sun.shadow.camera.top = 60;
    sun.shadow.camera.bottom = -60;
    scene.add(sun);

    // Ground — semi-transparent dirt texture
    const dirtCanvas = document.createElement('canvas');
    dirtCanvas.width = 512;
    dirtCanvas.height = 512;
    const dCtx = dirtCanvas.getContext('2d');
    // Base dirt color
    dCtx.fillStyle = '#7a5c3a';
    dCtx.fillRect(0, 0, 512, 512);
    // Add noise/texture to simulate dirt
    for (let i = 0; i < 8000; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const r = Math.random() * 3 + 0.5;
      const brightness = Math.random();
      const alpha = 0.15 + Math.random() * 0.25;
      dCtx.beginPath();
      dCtx.arc(x, y, r, 0, Math.PI * 2);
      dCtx.fillStyle = brightness > 0.5
        ? `rgba(${180 + Math.floor(Math.random()*40)}, ${130 + Math.floor(Math.random()*30)}, ${80 + Math.floor(Math.random()*20)}, ${alpha})`
        : `rgba(${60 + Math.floor(Math.random()*30)}, ${40 + Math.floor(Math.random()*20)}, ${20 + Math.floor(Math.random()*10)}, ${alpha})`;
      dCtx.fill();
    }
    // Small stones
    for (let i = 0; i < 200; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const rw = Math.random() * 6 + 2;
      const rh = Math.random() * 4 + 2;
      dCtx.beginPath();
      dCtx.ellipse(x, y, rw, rh, Math.random() * Math.PI, 0, Math.PI * 2);
      const g = 130 + Math.floor(Math.random() * 60);
      dCtx.fillStyle = `rgba(${g},${g - 10},${g - 20},0.35)`;
      dCtx.fill();
    }
    const dirtTexture = new THREE.CanvasTexture(dirtCanvas);
    dirtTexture.wrapS = THREE.RepeatWrapping;
    dirtTexture.wrapT = THREE.RepeatWrapping;
    dirtTexture.repeat.set(20, 20);

    const groundGeo = new THREE.PlaneGeometry(200, 200);
    const groundMat = new THREE.MeshStandardMaterial({
      map: dirtTexture,
      roughness: 1.0,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    ground.receiveShadow = true;
    ground.userData.isGround = true;
    scene.add(ground);

    const grid = new THREE.GridHelper(100, 50, 0x3d2b1a, 0x5a3f28);
    grid.position.y = 0.01;
    grid.material.transparent = true;
    grid.material.opacity = 0.4;
    grid.userData.isGrid = true;
    scene.add(grid);

    // Animate
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!mountRef.current) return;
      const nw = mountRef.current.clientWidth;
      const nh = mountRef.current.clientHeight;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', handleResize);
      controls.dispose();
      renderer.dispose();
      if (mountRef.current && renderer.domElement.parentNode === mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Rebuild scene objects whenever items or walls change
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Remove all non-permanent objects
    const toRemove = scene.children.filter(c => !c.userData.isGround && !c.userData.isGrid && !(c instanceof THREE.AmbientLight) && !(c instanceof THREE.DirectionalLight));
    toRemove.forEach(o => scene.remove(o));

    // ── FOUNDATIONS ──
    const firstItem = items[0];
    const refLenFt = firstItem ? (firstItem.length_inches || 48) / 12 : 4;
    const refWidFt = firstItem ? (firstItem.width_inches || 48) / 12 : 4;

    items.forEach((item, idx) => {
      const qty = item.quantity || 1;
      const gridSize = Math.ceil(Math.sqrt(qty));
      const isSpread = item.foundation_type !== 'pillar';
      const lenFt = (item.length_inches || 48) / 12;
      const widFt = (item.width_inches || 48) / 12;
      const depFt = (item.depth_inches || 36) / 12;
      const diaFt = (item.diameter || 24) / 12;
      const gradeOff = (item.grade_offset_inches || 0) / 12;
      const spacing = isSpread ? Math.max(lenFt, widFt) * 2.5 : diaFt * 2.5;
      const baseOffsetX = idx * (Math.max(lenFt, diaFt) + 3);

      const concMat = new THREE.MeshStandardMaterial({ color: 0x9ca3af, roughness: 0.7, transparent: true, opacity: 0.75 });

      for (let i = 0; i < qty; i++) {
        const row = Math.floor(i / gridSize);
        const col = i % gridSize;
        const ox = baseOffsetX + (col - (gridSize - 1) / 2) * spacing;
        const oz = (row - (gridSize - 1) / 2) * spacing;

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
          const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: 0x1e293b }));
          edges.position.copy(mesh.position);
          group.add(edges);
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
            const r = new THREE.Mesh(rg, rebarMat);
            r.rotation.z = Math.PI / 2;
            r.position.set(0, yPos, zOff);
            group.add(r);
          }
          for (let j = 0; j < nW; j++) {
            const xOff = -effL / 2 + j * spacL;
            const rg = new THREE.CylinderGeometry(rDia, rDia, effW, 6);
            const r = new THREE.Mesh(rg, rebarMat);
            r.rotation.x = Math.PI / 2;
            r.position.set(xOff, yPos - 0.03, 0);
            group.add(r);
          }
        }

        scene.add(group);
      }
    });

    // ── WALLS ──
    // The WallShapeBuilder emits points in inches with an offset (origin at canvas offset ~40px = 10in).
    // We center the wall points around the first foundation's center so walls sit on top of it.
    const firstItemForWall = items[0];
    const foundCenterXInches = firstItemForWall ? (firstItemForWall.length_inches || 48) / 2 : 24;
    const foundCenterZInches = firstItemForWall ? (firstItemForWall.width_inches || 48) / 2 : 24;

    walls.forEach((wall) => {
      const shape = wall.shape;
      const mat = wall.selectedMaterial;
      if (!shape || !shape.segments || shape.segments.length === 0 || !mat) return;

      const heightInches = wall.heightInches || 24;
      const heightFt = heightInches / 12;
      const wallWidthFt = (mat.wall_unit_width_inches || 8) / 12;

      let colorInt = 0xb5451b;
      if (mat.wall_color) {
        const hex = mat.wall_color.replace('#', '');
        const parsed = parseInt(hex, 16);
        if (!isNaN(parsed)) colorInt = parsed;
      }

      const wallMat3D = new THREE.MeshStandardMaterial({ color: colorInt, roughness: 0.85, metalness: 0.05 });

      // Compute bounding box of the wall shape to find its center in inches
      const allPoints = shape.segments.flatMap(s => [s.p1, s.p2]).filter(Boolean);
      const xs = allPoints.map(p => p.x);
      const ys = allPoints.map(p => p.y);
      const shapeCenterX = (Math.min(...xs) + Math.max(...xs)) / 2;
      const shapeCenterY = (Math.min(...ys) + Math.max(...ys)) / 2;

      // Offset so wall shape center aligns with foundation center
      const offX = (foundCenterXInches - shapeCenterX) / 12;
      const offZ = (foundCenterZInches - shapeCenterY) / 12;

      shape.segments.forEach((seg) => {
        const p1 = seg.p1;
        const p2 = seg.p2;
        if (!p1 || !p2) return;

        // Points are in inches → convert to feet and apply centering offset
        const x1 = p1.x / 12 + offX;
        const z1 = p1.y / 12 + offZ;
        const x2 = p2.x / 12 + offX;
        const z2 = p2.y / 12 + offZ;

        const dx = x2 - x1;
        const dz = z2 - z1;
        const segLen = Math.sqrt(dx * dx + dz * dz);
        if (segLen < 0.01) return;

        const geo = new THREE.BoxGeometry(segLen, heightFt, wallWidthFt);
        const mesh = new THREE.Mesh(geo, wallMat3D);

        const cx = (x1 + x2) / 2;
        const cz = (z1 + z2) / 2;
        mesh.position.set(cx, heightFt / 2, cz);
        mesh.rotation.y = -Math.atan2(dz, dx);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        scene.add(mesh);

        const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: 0x333333, transparent: true, opacity: 0.5 }));
        edges.position.copy(mesh.position);
        edges.rotation.copy(mesh.rotation);
        scene.add(edges);
      });
    });

    // Auto-frame camera if we have items
    if (items.length > 0 && cameraRef.current && controlsRef.current) {
      const first = items[0];
      const dim = Math.max((first.length_inches || 48) / 12, (first.width_inches || 48) / 12, (first.depth_inches || 36) / 12);
      const dist = Math.max(dim * 3, 8);
      cameraRef.current.position.set(dist, dist * 0.7, dist);
      cameraRef.current.lookAt(0, 0, 0);
      controlsRef.current.target.set(0, 0, 0);
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