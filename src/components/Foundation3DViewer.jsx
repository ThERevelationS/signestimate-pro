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
  gradeOffsetInches = 0,
  poleData = null,
  wallData = null  // { lengthInches, widthInches, heightInches, brickItem, mortarGapInches, layerOffsetInches, fillMaterialItem }
}) {
  const mountRef = useRef(null);
  const rendererRef = useRef(null);

  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xe0f2fe);

    const camera = new THREE.PerspectiveCamera(50, mountRef.current.clientWidth / mountRef.current.clientHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10, 20, 10);
    dirLight.castShadow = true;
    dirLight.shadow.camera.near = 0.1;
    dirLight.shadow.camera.far = 100;
    dirLight.shadow.camera.left = -50; dirLight.shadow.camera.right = 50;
    dirLight.shadow.camera.top = 50; dirLight.shadow.camera.bottom = -50;
    dirLight.shadow.mapSize.set(2048, 2048);
    scene.add(dirLight);

    // Ground
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(200, 200),
      new THREE.MeshStandardMaterial({ color: 0x8b7355, roughness: 0.8, transparent: true, opacity: 0.6 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0.02;
    ground.receiveShadow = true;
    scene.add(ground);

    const gridHelper = new THREE.GridHelper(200, 40, 0x666666, 0x888888);
    gridHelper.position.y = 0.03;
    scene.add(gridHelper);

    const lengthFeet = lengthInches / 12;
    const widthFeet = widthInches / 12;
    const depthFeet = depthInches / 12;
    const diameterFeet = diameter / 12;
    const gradeOffsetFeet = gradeOffsetInches / 12;

    const gridSize = Math.ceil(Math.sqrt(quantity));
    const spacing = foundationType === 'spread_foot'
      ? Math.max(lengthFeet, widthFeet) * 2.5
      : diameterFeet * 2.5;

    // ---- Build each foundation instance ----
    for (let i = 0; i < quantity; i++) {
      const row = Math.floor(i / gridSize);
      const col = i % gridSize;
      const offsetX = (col - (gridSize - 1) / 2) * spacing;
      const offsetZ = (row - (gridSize - 1) / 2) * spacing;

      const foundationGroup = new THREE.Group();
      foundationGroup.position.set(offsetX, 0, offsetZ);

      const concreteMat = new THREE.MeshStandardMaterial({ color: 0x9ca3af, roughness: 0.7, metalness: 0.1, transparent: true, opacity: 0.7, side: THREE.DoubleSide });

      if (foundationType === 'spread_foot') {
        const geo = new THREE.BoxGeometry(lengthFeet, depthFeet, widthFeet);
        const concrete = new THREE.Mesh(geo, concreteMat);
        concrete.position.y = -depthFeet / 2 + gradeOffsetFeet;
        concrete.castShadow = true;
        foundationGroup.add(concrete);
        const wire = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: 0x1e293b }));
        wire.position.copy(concrete.position);
        foundationGroup.add(wire);

        // Forming
        if (includeForming) {
          let formThickness = 1.5 / 12;
          if (formingMaterial?.thickness_inches) formThickness = formingMaterial.thickness_inches / 12;
          else if (formingMaterial?.lumber_size === 'plywood_3/4') formThickness = 0.75 / 12;

          const embedmentFeet = 2 / 12;
          const formHeight = depthFeet + embedmentFeet;
          const formY = concrete.position.y - (embedmentFeet / 2);
          const formMat = new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.9, side: THREE.DoubleSide });

          const s1Geo = new THREE.BoxGeometry(lengthFeet + 2 * formThickness, formHeight, formThickness);
          const s3Geo = new THREE.BoxGeometry(formThickness, formHeight, widthFeet);

          const s1 = new THREE.Mesh(s1Geo, formMat); s1.position.set(0, formY, widthFeet / 2 + formThickness / 2); foundationGroup.add(s1);
          const s2 = new THREE.Mesh(s1Geo, formMat); s2.position.set(0, formY, -(widthFeet / 2 + formThickness / 2)); foundationGroup.add(s2);
          const s3 = new THREE.Mesh(s3Geo, formMat); s3.position.set(-(lengthFeet / 2 + formThickness / 2), formY, 0); foundationGroup.add(s3);
          const s4 = new THREE.Mesh(s3Geo, formMat); s4.position.set(lengthFeet / 2 + formThickness / 2, formY, 0); foundationGroup.add(s4);
        }

        // Rebar
        if (includeRebar) {
          const rSpL = rebarSpacingLength / 12;
          const rSpW = rebarSpacingWidth / 12;
          if (rSpL < lengthFeet && rSpW < widthFeet) {
            const rDiams = { '#3': 0.0313, '#4': 0.0417, '#5': 0.0521, '#6': 0.0625 };
            const rDiam = rDiams[rebarSize] || 0.0417;
            const rebarMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.6, metalness: 0.4 });
            const edge = 3 / 12;
            const effL = lengthFeet - 2 * edge;
            const effW = widthFeet - 2 * edge;
            const nL = Math.floor(effW / rSpW) + 1;
            const nW = Math.floor(effL / rSpL) + 1;

            for (let j = 0; j < nL; j++) {
              const zOff = -effW / 2 + j * rSpW;
              const r = new THREE.Mesh(new THREE.CylinderGeometry(rDiam, rDiam, effL, 8), rebarMat);
              r.rotation.z = Math.PI / 2;
              r.position.set(0, -3 / 12 + gradeOffsetFeet, zOff);
              foundationGroup.add(r);
            }
            for (let j = 0; j < nW; j++) {
              const xOff = -effL / 2 + j * rSpL;
              const r = new THREE.Mesh(new THREE.CylinderGeometry(rDiam, rDiam, effW, 8), rebarMat);
              r.rotation.x = Math.PI / 2;
              r.position.set(xOff, -3 / 12 + gradeOffsetFeet, 0);
              foundationGroup.add(r);
            }
          }
        }

      } else {
        // Pillar
        const radius = diameterFeet / 2;
        const geo = new THREE.CylinderGeometry(radius, radius, depthFeet, 32);
        const concrete = new THREE.Mesh(geo, concreteMat);
        concrete.position.y = -depthFeet / 2 + gradeOffsetFeet;
        concrete.castShadow = true;
        foundationGroup.add(concrete);
        const wire = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: 0x1e293b }));
        wire.position.copy(concrete.position);
        foundationGroup.add(wire);

        if (includeForming) {
          let formThickness = 0.25 / 12;
          if (formingMaterial?.thickness_inches) formThickness = formingMaterial.thickness_inches / 12;
          const embedmentFeet = 2 / 12;
          const formHeight = depthFeet + embedmentFeet;
          const formY = concrete.position.y - embedmentFeet / 2;
          const formGeo = new THREE.CylinderGeometry(radius + formThickness, radius + formThickness, formHeight, 32, 1, true);
          foundationGroup.add(new THREE.Mesh(formGeo, new THREE.MeshStandardMaterial({ color: 0xd2b48c, roughness: 0.8, side: THREE.DoubleSide })));
        }
      }

      // ---- Pole rendering (FIXED - inside the loop, using foundationGroup) ----
      if (poleData && poleData.totalHeightInches > 0) {
        const poleHeightFt = poleData.totalHeightInches / 12;
        const poleWidthFt = (poleData.widthInches || 4) / 12;
        const poleOffsetFt = (poleData.offsetFromBottomInches || 0) / 12;
        const poleBottomY = -depthFeet + gradeOffsetFeet + poleOffsetFt;
        const poleCenterY = poleBottomY + poleHeightFt / 2;
        const poleMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.5, metalness: 0.3 });
        let poleGeo;
        if (poleData.shape === 'round') {
          poleGeo = new THREE.CylinderGeometry(poleWidthFt / 2, poleWidthFt / 2, poleHeightFt, 16);
        } else {
          poleGeo = new THREE.BoxGeometry(poleWidthFt, poleHeightFt, poleWidthFt);
        }
        const poleMesh = new THREE.Mesh(poleGeo, poleMat);
        poleMesh.position.y = poleCenterY;
        poleMesh.castShadow = true;
        foundationGroup.add(poleMesh);
        const poleEdge = new THREE.LineSegments(new THREE.EdgesGeometry(poleGeo), new THREE.LineBasicMaterial({ color: 0x1e293b }));
        poleEdge.position.y = poleCenterY;
        foundationGroup.add(poleEdge);
      }

      // ---- Brick/Stone Wall rendering ----
      if (wallData && wallData.heightInches > 0 && wallData.brickItem) {
        const { lengthInches: wL, widthInches: wW, heightInches: wH, brickItem, mortarGapInches = 0.375, layerOffsetInches = 0, fillMaterialItem } = wallData;

        const wallLenFt = wL / 12;
        const wallWidFt = wW / 12;

        // Clamp wall to foundation footprint
        const maxWL = foundationType === 'spread_foot' ? lengthFeet : diameterFeet;
        const maxWW = foundationType === 'spread_foot' ? widthFeet : diameterFeet;
        const clampedWL = Math.min(wallLenFt, maxWL);
        const clampedWW = Math.min(wallWidFt, maxWW);

        const brickLFt = (brickItem.brick_length_inches || 8) / 12;
        const brickWFt = (brickItem.brick_width_inches || 4) / 12;
        const brickHFt = (brickItem.brick_height_inches || 2.625) / 12;
        const mortarFt = mortarGapInches / 12;
        const courseHeight = brickHFt + mortarFt;
        const brickSpaceFt = brickLFt + mortarFt;
        const offsetFt = layerOffsetInches / 12;

        // Parse brick color
        let brickColor = 0xcc6633;
        if (brickItem.brick_color) {
          const hex = brickItem.brick_color.replace('#', '');
          if (/^[0-9A-Fa-f]{6}$/.test(hex)) brickColor = parseInt(hex, 16);
        }
        const brickMat = new THREE.MeshStandardMaterial({ color: brickColor, roughness: brickItem.brick_texture === 'smooth' ? 0.3 : 0.8 });
        const mortarMat = new THREE.MeshStandardMaterial({ color: 0xd4c5a5, roughness: 0.9 });

        // Wall starts at grade level = gradeOffsetFeet
        const wallBaseY = gradeOffsetFeet;
        const numCourses = Math.ceil(wH / (brickHFt * 12 + mortarGapInches));

        let currentY = wallBaseY + brickHFt / 2 + mortarFt / 2;

        for (let course = 0; course < numCourses; course++) {
          const isOdd = course % 2 === 1;
          const rowOffset = isOdd && offsetFt > 0 ? offsetFt : 0;
          const topOfCourse = currentY + brickHFt / 2;
          const wallTopFt = wallBaseY + wH / 12;
          const partialFactor = topOfCourse > wallTopFt ? Math.max(0, 1 - (topOfCourse - wallTopFt) / brickHFt) : 1;
          const thisBrickH = brickHFt * partialFactor;

          if (thisBrickH <= 0) break;

          // Front face bricks (along length)
          const numBricksAlongL = Math.ceil(clampedWL / brickSpaceFt);
          for (let b = 0; b < numBricksAlongL; b++) {
            const brickX = -clampedWL / 2 + brickSpaceFt / 2 + b * brickSpaceFt + rowOffset;
            const clampedBrickW = Math.min(brickLFt, clampedWL - b * brickSpaceFt + brickSpaceFt / 2 - mortarFt);
            if (clampedBrickW <= 0.001) continue;
            const brickGeo = new THREE.BoxGeometry(clampedBrickW, thisBrickH, brickWFt);
            const brick = new THREE.Mesh(brickGeo, brickMat);
            brick.position.set(brickX, currentY - (brickHFt - thisBrickH) / 2, -clampedWW / 2 + brickWFt / 2);
            foundationGroup.add(brick);
            // Mortar joint
            if (b < numBricksAlongL - 1) {
              const mGeo = new THREE.BoxGeometry(mortarFt, thisBrickH, brickWFt);
              const mortar = new THREE.Mesh(mGeo, mortarMat);
              mortar.position.set(brickX + clampedBrickW / 2 + mortarFt / 2, brick.position.y, brick.position.z);
              foundationGroup.add(mortar);
            }
          }

          // Back face bricks
          for (let b = 0; b < numBricksAlongL; b++) {
            const brickX = -clampedWL / 2 + brickSpaceFt / 2 + b * brickSpaceFt + rowOffset;
            const clampedBrickW = Math.min(brickLFt, clampedWL - b * brickSpaceFt + brickSpaceFt / 2 - mortarFt);
            if (clampedBrickW <= 0.001) continue;
            const brickGeo = new THREE.BoxGeometry(clampedBrickW, thisBrickH, brickWFt);
            const brick = new THREE.Mesh(brickGeo, brickMat);
            brick.position.set(brickX, currentY - (brickHFt - thisBrickH) / 2, clampedWW / 2 - brickWFt / 2);
            foundationGroup.add(brick);
          }

          // Side walls (2 sides)
          const numBricksAlongW = Math.ceil(clampedWW / brickSpaceFt);
          for (let side of [-1, 1]) {
            for (let b = 0; b < numBricksAlongW; b++) {
              const brickZ = -clampedWW / 2 + brickSpaceFt / 2 + b * brickSpaceFt + rowOffset;
              const clampedBrickW = Math.min(brickLFt, clampedWW - b * brickSpaceFt + brickSpaceFt / 2 - mortarFt);
              if (clampedBrickW <= 0.001) continue;
              const brickGeo = new THREE.BoxGeometry(brickWFt, thisBrickH, clampedBrickW);
              const brick = new THREE.Mesh(brickGeo, brickMat);
              brick.position.set(side * (clampedWL / 2 - brickWFt / 2), currentY - (brickHFt - thisBrickH) / 2, brickZ);
              foundationGroup.add(brick);
            }
          }

          // Horizontal mortar layer between courses
          if (course > 0) {
            const hMGeo = new THREE.BoxGeometry(clampedWL, mortarFt, brickWFt);
            const hM = new THREE.Mesh(hMGeo, mortarMat);
            hM.position.set(0, currentY - thisBrickH / 2, -clampedWW / 2 + brickWFt / 2);
            foundationGroup.add(hM);
            const hM2 = new THREE.Mesh(hMGeo, mortarMat);
            hM2.position.set(0, currentY - thisBrickH / 2, clampedWW / 2 - brickWFt / 2);
            foundationGroup.add(hM2);
          }

          currentY += courseHeight;
        }

        // Fill material inside wall (semi-transparent box)
        if (fillMaterialItem) {
          const innerL = Math.max(0, clampedWL - 2 * brickWFt);
          const innerW = Math.max(0, clampedWW - 2 * brickWFt);
          const wallTotalH = (wH / 12);
          if (innerL > 0 && innerW > 0) {
            const fillColor = fillMaterialItem.fill_material_subtype === 'cinder_block' ? 0x94a3b8 : 0xa8a29e;
            const fillMat = new THREE.MeshStandardMaterial({ color: fillColor, transparent: true, opacity: 0.6 });
            const fillGeo = new THREE.BoxGeometry(innerL, wallTotalH, innerW);
            const fill = new THREE.Mesh(fillGeo, fillMat);
            fill.position.set(0, wallBaseY + wallTotalH / 2, 0);
            foundationGroup.add(fill);
          }
        }
      }

      scene.add(foundationGroup);
    }

    // Labels
    const addLabel = (text, position) => {
      const canvas = document.createElement('canvas');
      canvas.width = 256; canvas.height = 64;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, 256, 64);
      ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 8; ctx.shadowOffsetX = 2; ctx.shadowOffsetY = 2;
      ctx.font = 'Bold 28px Arial'; ctx.fillStyle = 'white'; ctx.strokeStyle = 'rgba(59,130,246,0.9)';
      ctx.lineWidth = 3; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.strokeText(text, 128, 32); ctx.fillText(text, 128, 32);
      const tex = new THREE.CanvasTexture(canvas);
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
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

    // Camera positioning
    const wallMaxH = wallData ? wallData.heightInches / 12 : 0;
    const maxDim = Math.max(
      foundationType === 'spread_foot' ? Math.max(lengthFeet, widthFeet) : diameterFeet,
      depthFeet,
      wallMaxH
    ) * gridSize * 1.5;

    camera.position.set(maxDim * 1.2, maxDim * 0.8, maxDim * 1.2);
    camera.lookAt(0, gradeOffsetFeet, 0);
    controls.target.set(0, gradeOffsetFeet, 0);
    controls.update();

    const animate = () => { requestAnimationFrame(animate); controls.update(); renderer.render(scene, camera); };
    animate();

    const handleResize = () => {
      if (!mountRef.current) return;
      camera.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (mountRef.current && renderer.domElement) mountRef.current.removeChild(renderer.domElement);
      renderer.dispose();
      controls.dispose();
    };
  }, [foundationType, lengthInches, widthInches, depthInches, diameter, rebarSize, rebarSpacingLength, rebarSpacingWidth, includeRebar, includeForming, formingMaterial, quantity, gradeOffsetInches, poleData, wallData]);

  const handleSaveImage = () => {
    if (rendererRef.current) {
      const link = document.createElement("a");
      link.href = rendererRef.current.domElement.toDataURL("image/jpeg");
      link.download = "foundation-view.jpg";
      link.click();
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
      <Button onClick={handleSaveImage} variant="secondary" size="sm" className="absolute top-4 right-4 bg-white/80 hover:bg-white shadow-sm backdrop-blur-sm">
        <Camera className="w-4 h-4 mr-2" />Save View
      </Button>
    </div>
  );
}