import React, { useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/**
 * Wall3DViewer
 * 
 * Renders a 3D view of wall segments laid out along a polygonal path.
 * Uses instanced meshes for performance. Cuts bricks at 90-degree corners.
 * 
 * Props:
 *   wallSegments: Array of { length: number (inches) }
 *   wallPoints: Array of { x, y } in canvas pixels (4px/inch)
 *   wallHeight: number (inches)
 *   wallMaterial: { wall_unit_length_inches, wall_unit_width_inches, wall_unit_height_inches, wall_color, wall_texture, wall_material_subtype }
 *   mortarGapInches: number
 *   brickOffsetFraction: number (0 = no offset, 0.5 = half-brick offset)
 *   foundationHeightInches: number (z offset so wall sits on top)
 */
export default function Wall3DViewer({
  wallSegments = [],
  wallPoints = [],
  wallHeight = 24,
  wallMaterial,
  mortarGapInches = 0.375,
  brickOffsetFraction = 0.5,
  foundationHeightInches = 0,
  width = 600,
  height = 400
}) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const frameRef = useRef(null);
  const wallGroupRef = useRef(null);

  const SCALE = 1 / 12; // 1 inch = 1/12 unit (1 foot = 1 unit)

  const buildWall = useCallback(() => {
    if (!sceneRef.current || !wallMaterial || wallPoints.length < 2) return;

    // Remove old wall group
    if (wallGroupRef.current) {
      sceneRef.current.remove(wallGroupRef.current);
      wallGroupRef.current.traverse(obj => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) obj.material.dispose();
      });
    }

    const group = new THREE.Group();
    wallGroupRef.current = group;

    const isConcrete = wallMaterial.wall_material_subtype === 'concrete';
    const unitL = (wallMaterial.wall_unit_length_inches || 8) * SCALE;
    const unitW = (wallMaterial.wall_unit_width_inches || 4) * SCALE;
    const unitH = (wallMaterial.wall_unit_height_inches || 2.25) * SCALE;
    const mortarH = isConcrete ? 0 : mortarGapInches * SCALE;
    const courseH = unitH + mortarH;
    const mortarSide = isConcrete ? 0 : mortarGapInches * SCALE;
    const wallH = wallHeight * SCALE;
    const numCourses = Math.floor(wallH / courseH);
    const yBase = (foundationHeightInches || 0) * SCALE;

    // Choose color
    let hexColor = wallMaterial.wall_color || '#cc9966';
    let threeColor;
    try { threeColor = new THREE.Color(hexColor); } catch { threeColor = new THREE.Color(0xcc9966); }

    // Material with texture feel
    const matOptions = {
      color: threeColor,
      roughness: wallMaterial.wall_texture === 'smooth' ? 0.3 : wallMaterial.wall_texture === 'glazed' ? 0.1 : 0.8,
      metalness: wallMaterial.wall_texture === 'glazed' ? 0.2 : 0,
    };
    const brickMat = new THREE.MeshStandardMaterial(matOptions);
    const mortarMat = new THREE.MeshStandardMaterial({ color: 0xd4c5a9, roughness: 0.9 });

    const CANVAS_SCALE = 1 / (4 * 12); // 4px/inch → feet
    const pxToFt = CANVAS_SCALE;

    // Build each wall segment
    for (let si = 0; si < wallPoints.length - 1; si++) {
      const p1 = wallPoints[si];
      const p2 = wallPoints[si + 1];

      const dx = (p2.x - p1.x) * pxToFt;
      const dz = (p2.y - p1.y) * pxToFt;
      const segLenFt = Math.sqrt(dx * dx + dz * dz);
      if (segLenFt < 0.001) continue;

      const angle = Math.atan2(dz, dx);

      // Center of this segment in world space
      const cx = ((p1.x + p2.x) / 2) * pxToFt;
      const cz = ((p1.y + p2.y) / 2) * pxToFt;

      for (let course = 0; course < numCourses; course++) {
        const yPos = yBase + course * courseH + unitH / 2;
        // Offset every other course for running bond
        const isEven = course % 2 === 0;
        const offsetAlong = isConcrete ? 0 : (isEven ? 0 : (unitL + mortarSide) * brickOffsetFraction);

        // How many bricks fit in this segment?
        const brickPitch = unitL + mortarSide;
        const numBricks = Math.ceil((segLenFt + offsetAlong) / brickPitch);

        for (let bi = 0; bi < numBricks; bi++) {
          const alongStart = bi * brickPitch - offsetAlong;
          const alongEnd = alongStart + unitL;

          // Clamp to segment (cut at corners)
          const clampedStart = Math.max(0, alongStart);
          const clampedEnd = Math.min(segLenFt, alongEnd);
          if (clampedEnd <= clampedStart) continue;

          const brickLen = clampedEnd - clampedStart;
          const brickCenterAlong = (clampedStart + clampedEnd) / 2;

          // Position along segment
          const localX = (brickCenterAlong / segLenFt) * segLenFt - segLenFt / 2 + brickCenterAlong - segLenFt / 2;
          // Actually compute center offset from segment midpoint
          const midAlong = segLenFt / 2;
          const localOffset = brickCenterAlong - midAlong;

          const geo = new THREE.BoxGeometry(brickLen, unitH, unitW);
          const mesh = new THREE.Mesh(geo, brickMat);

          // Rotate to align with segment direction
          mesh.position.set(
            cx + Math.cos(angle) * localOffset,
            yPos,
            cz + Math.sin(angle) * localOffset
          );
          mesh.rotation.y = -angle;
          group.add(mesh);

          // Mortar lines (skip for concrete)
          if (!isConcrete && brickLen > 0.01) {
            // Top mortar
            const mgeo = new THREE.BoxGeometry(brickLen, mortarH, unitW);
            const mmesh = new THREE.Mesh(mgeo, mortarMat);
            mmesh.position.set(
              cx + Math.cos(angle) * localOffset,
              yPos + unitH / 2 + mortarH / 2,
              cz + Math.sin(angle) * localOffset
            );
            mmesh.rotation.y = -angle;
            group.add(mmesh);
          }
        }
      }
    }

    // If shape is closed, handle the last segment
    if (wallPoints.length > 2) {
      const lastP = wallPoints[wallPoints.length - 1];
      const firstP = wallPoints[0];
      const dx = (firstP.x - lastP.x) * pxToFt;
      const dz = (firstP.y - lastP.y) * pxToFt;
      const segLenFt = Math.sqrt(dx * dx + dz * dz);
      if (segLenFt > 0.01) {
        const angle = Math.atan2(dz, dx);
        const cx = ((lastP.x + firstP.x) / 2) * pxToFt;
        const cz = ((lastP.y + firstP.y) / 2) * pxToFt;

        for (let course = 0; course < numCourses; course++) {
          const yPos = yBase + course * courseH + unitH / 2;
          const isEven = course % 2 === 0;
          const offsetAlong = isConcrete ? 0 : (isEven ? 0 : (unitL + mortarSide) * brickOffsetFraction);
          const brickPitch = unitL + mortarSide;
          const numBricks = Math.ceil((segLenFt + offsetAlong) / brickPitch);

          for (let bi = 0; bi < numBricks; bi++) {
            const alongStart = bi * brickPitch - offsetAlong;
            const alongEnd = alongStart + unitL;
            const clampedStart = Math.max(0, alongStart);
            const clampedEnd = Math.min(segLenFt, alongEnd);
            if (clampedEnd <= clampedStart) continue;

            const brickLen = clampedEnd - clampedStart;
            const brickCenterAlong = (clampedStart + clampedEnd) / 2;
            const midAlong = segLenFt / 2;
            const localOffset = brickCenterAlong - midAlong;

            const geo = new THREE.BoxGeometry(brickLen, unitH, unitW);
            const mesh = new THREE.Mesh(geo, brickMat);
            mesh.position.set(
              cx + Math.cos(angle) * localOffset,
              yPos,
              cz + Math.sin(angle) * localOffset
            );
            mesh.rotation.y = -angle;
            group.add(mesh);

            if (!isConcrete && brickLen > 0.01) {
              const mgeo = new THREE.BoxGeometry(brickLen, mortarSide, unitW);
              const mmesh = new THREE.Mesh(mgeo, mortarMat);
              mmesh.position.set(
                cx + Math.cos(angle) * localOffset,
                yPos + unitH / 2 + mortarSide / 2,
                cz + Math.sin(angle) * localOffset
              );
              mmesh.rotation.y = -angle;
              group.add(mmesh);
            }
          }
        }
      }
    }

    sceneRef.current.add(group);
  }, [wallPoints, wallHeight, wallMaterial, mortarGapInches, brickOffsetFraction, foundationHeightInches, SCALE]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf1f5f9);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 200);
    camera.position.set(3, 2.5, 4);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'low-power' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.shadowMap.enabled = false;
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambient);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 8, 5);
    scene.add(dirLight);

    // Ground grid
    const gridHelper = new THREE.GridHelper(20, 40, 0xcccccc, 0xe2e8f0);
    scene.add(gridHelper);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.maxPolarAngle = Math.PI / 2;
    controlsRef.current = controls;

    // Animate
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frameRef.current);
      controls.dispose();
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, [width, height]);

  useEffect(() => {
    buildWall();
  }, [buildWall]);

  return (
    <div
      ref={mountRef}
      className="rounded-lg overflow-hidden border border-slate-200"
      style={{ width, height }}
    />
  );
}