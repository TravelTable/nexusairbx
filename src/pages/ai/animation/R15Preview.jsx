import React, { useEffect, useRef, useState } from "react";

const PREVIEW_MODEL_URL = "/models/nexusrbx-r15-preview.glb";
const R15_JOINTS = new Set([
  "Head", "UpperTorso", "LowerTorso",
  "LeftUpperArm", "LeftLowerArm", "LeftHand",
  "RightUpperArm", "RightLowerArm", "RightHand",
  "LeftUpperLeg", "LeftLowerLeg", "LeftFoot",
  "RightUpperLeg", "RightLowerLeg", "RightFoot",
]);

function findFramePair(keyframes, timeMs) {
  if (!Array.isArray(keyframes) || !keyframes.length) return [null, null, 0];
  if (timeMs <= keyframes[0].timeMs) return [keyframes[0], keyframes[0], 0];
  for (let index = 1; index < keyframes.length; index += 1) {
    const next = keyframes[index];
    if (timeMs <= next.timeMs) {
      const previous = keyframes[index - 1];
      const span = Math.max(1, next.timeMs - previous.timeMs);
      return [previous, next, Math.max(0, Math.min(1, (timeMs - previous.timeMs) / span))];
    }
  }
  const last = keyframes[keyframes.length - 1];
  return [last, last, 0];
}

export default function R15Preview({ animation = null, currentTime = 0, selectedJoint = "", modelUrl = PREVIEW_MODEL_URL, modelLabel = "Blocky R15" }) {
  const hostRef = useRef(null);
  const sceneStateRef = useRef(null);
  const animationRef = useRef(animation);
  const timeRef = useRef(currentTime);
  const selectedJointRef = useRef(selectedJoint);
  const [status, setStatus] = useState("loading");

  animationRef.current = animation;
  timeRef.current = currentTime;
  selectedJointRef.current = selectedJoint;

  useEffect(() => {
    let disposed = false;
    let frameId = 0;
    let resizeObserver = null;

    async function mountPreview() {
      const host = hostRef.current;
      if (!host) return;
      setStatus("loading");
      try {
        const THREE = await import("three");
        const [{ GLTFLoader }, { OrbitControls }] = await Promise.all([
          import("three/examples/jsm/loaders/GLTFLoader.js"),
          import("three/examples/jsm/controls/OrbitControls.js"),
        ]);
        if (disposed || !hostRef.current) return;

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
        camera.position.set(6, 4, 8);
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFShadowMap;
        renderer.domElement.setAttribute("aria-hidden", "true");
        host.appendChild(renderer.domElement);

        scene.add(new THREE.HemisphereLight(0xe8dcff, 0x17111f, 2.25));
        const keyLight = new THREE.DirectionalLight(0xffffff, 3.1);
        keyLight.position.set(5, 8, 6);
        keyLight.castShadow = true;
        scene.add(keyLight);
        const rimLight = new THREE.DirectionalLight(0xb45cff, 2.2);
        rimLight.position.set(-6, 4, -4);
        scene.add(rimLight);
        const grid = new THREE.GridHelper(18, 18, 0x5f4277, 0x302838);
        grid.position.y = -3.02;
        grid.material.opacity = 0.34;
        grid.material.transparent = true;
        scene.add(grid);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.enablePan = false;
        controls.target.set(0, 0, 0);

        const gltf = await new GLTFLoader().loadAsync(modelUrl || PREVIEW_MODEL_URL);
        if (disposed) return;
        const rig = gltf.scene;
        const bones = new Map();
        const restRotations = new Map();
        const meshMaterials = [];
        rig.traverse((node) => {
          if (node.isBone && R15_JOINTS.has(node.name) && !bones.has(node.name)) {
            bones.set(node.name, node);
            restRotations.set(node.name, node.quaternion.clone());
          }
          if (node.isMesh || node.isSkinnedMesh) {
            node.castShadow = true;
            node.receiveShadow = true;
            const material = new THREE.MeshStandardMaterial({ color: 0xd8d2e4, roughness: 0.72, metalness: 0.02 });
            node.material = material;
            meshMaterials.push({ node, material });
          }
        });
        const missingJoints = [...R15_JOINTS].filter((joint) => !bones.has(joint));
        if (missingJoints.length) {
          throw new Error(`Selected model is missing R15 joints: ${missingJoints.join(", ")}`);
        }
        scene.add(rig);

        // Frame the imported model from its real world-space bounds. The R15
        // preview asset stands above Y=0, so targeting the origin crops its
        // upper body and makes the floor appear several studs below its feet.
        const bounds = new THREE.Box3().setFromObject(rig);
        const size = bounds.getSize(new THREE.Vector3());
        const center = bounds.getCenter(new THREE.Vector3());
        const width = Math.max(host.clientWidth, 1);
        const height = Math.max(host.clientHeight, 1);
        camera.aspect = width / height;
        const verticalFov = THREE.MathUtils.degToRad(camera.fov);
        const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * camera.aspect);
        const fitHeight = (size.y / 2) / Math.tan(verticalFov / 2);
        const fitWidth = (size.x / 2) / Math.tan(horizontalFov / 2);
        const distance = Math.max(fitHeight, fitWidth, size.z * 2, 1) * 1.28;
        const viewDirection = new THREE.Vector3(0.82, 0.28, 1).normalize();

        controls.target.copy(center);
        camera.position.copy(center).addScaledVector(viewDirection, distance);
        camera.near = Math.max(distance / 100, 0.02);
        camera.far = Math.max(distance * 20, 100);
        camera.updateProjectionMatrix();
        controls.minDistance = Math.max(distance * 0.45, 2);
        controls.maxDistance = Math.max(distance * 3, 18);
        controls.update();
        grid.position.y = bounds.min.y - 0.015;
        setStatus("ready");

        const state = { bones, restRotations, meshMaterials };
        sceneStateRef.current = state;

        const resize = () => {
          const width = Math.max(host.clientWidth, 1);
          const height = Math.max(host.clientHeight, 1);
          renderer.setSize(width, height, false);
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
        };
        resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(host);
        resize();

        const animateFrame = () => {
          const document = animationRef.current;
          const [previous, next, alpha] = findFramePair(document?.keyframes, timeRef.current * 1000);
          for (const [name, bone] of bones) {
            const rest = restRotations.get(name);
            if (!rest) continue;
            bone.quaternion.copy(rest);
            const from = previous?.joints?.[name]?.rotation;
            const to = next?.joints?.[name]?.rotation || from;
            if (Array.isArray(from) && from.length === 4 && Array.isArray(to) && to.length === 4) {
              const offset = new THREE.Quaternion(from[0], from[1], from[2], from[3]);
              offset.slerp(new THREE.Quaternion(to[0], to[1], to[2], to[3]), alpha);
              bone.quaternion.multiply(offset.normalize());
            }
          }
          for (const { node, material } of meshMaterials) {
            const baseName = node.name.replace(/\.\d+$/, "");
            const selected = selectedJointRef.current && baseName === selectedJointRef.current;
            material.color.set(selected ? 0xc77dff : 0xd8d2e4);
            material.emissive.set(selected ? 0x2d103f : 0x000000);
          }
          controls.update();
          renderer.render(scene, camera);
          frameId = window.requestAnimationFrame(animateFrame);
        };
        animateFrame();

        state.dispose = () => {
          controls.dispose();
          renderer.dispose();
          scene.traverse((node) => {
            node.geometry?.dispose?.();
            if (Array.isArray(node.material)) node.material.forEach((material) => material.dispose?.());
            else node.material?.dispose?.();
          });
          renderer.domElement.remove();
        };
      } catch (_) {
        if (!disposed) setStatus("error");
      }
    }

    mountPreview();
    return () => {
      disposed = true;
      window.cancelAnimationFrame(frameId);
      resizeObserver?.disconnect();
      sceneStateRef.current?.dispose?.();
      sceneStateRef.current = null;
    };
  }, [modelUrl]);

  return (
    <div className="animate-preview" data-status={status} data-model={modelLabel}>
      <div ref={hostRef} className="animate-preview__canvas" />
      {status === "loading" ? <p role="status">Loading the rigged R15 preview…</p> : null}
      {status === "error" ? (
        <div className="animate-preview__error" role="alert">
          <strong>{modelLabel} preview unavailable</strong>
          <span>Choose another R15 model or import a GLB containing all 15 standard deform joints.</span>
        </div>
      ) : null}
      <span className="animate-preview__hint">Drag to orbit · Scroll to zoom</span>
    </div>
  );
}
