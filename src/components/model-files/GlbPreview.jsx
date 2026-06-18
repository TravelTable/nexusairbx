import React, { useCallback, useEffect, useRef, useState } from "react";
import { Grid2X2, Loader2, RotateCcw } from "lucide-react";

function disposeObject(object) {
  object.traverse?.((child) => {
    if (child.geometry) child.geometry.dispose?.();
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.filter(Boolean).forEach((material) => {
      Object.values(material).forEach((value) => {
        if (value && typeof value === "object" && value.isTexture) value.dispose?.();
      });
      material.dispose?.();
    });
  });
}

export default function GlbPreview({ previewUrl, modelFileId }) {
  const mountRef = useRef(null);
  const stateRef = useRef(null);
  const [loading, setLoading] = useState(Boolean(previewUrl));
  const [error, setError] = useState("");
  const [gridVisible, setGridVisible] = useState(true);

  const resetCamera = useCallback(() => {
    const state = stateRef.current;
    if (!state) return;
    const { camera, controls, target, distance } = state;
    camera.position.set(target.x + distance, target.y + distance * 0.65, target.z + distance);
    camera.near = Math.max(distance / 1000, 0.01);
    camera.far = Math.max(distance * 100, 1000);
    camera.updateProjectionMatrix();
    controls.target.copy(target);
    controls.update();
  }, []);

  useEffect(() => {
    let cancelled = false;
    let animationId = null;
    let objectUrl = null;
    const mount = mountRef.current;
    if (!mount || !previewUrl) return undefined;

    setLoading(true);
    setError("");

    async function loadPreview() {
      const [
        THREE,
        { GLTFLoader },
        { OrbitControls },
      ] = await Promise.all([
        import("three"),
        import("three/examples/jsm/loaders/GLTFLoader.js"),
        import("three/examples/jsm/controls/OrbitControls.js"),
      ]);
      if (cancelled) return;

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x0b0d10);
      const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 1000);
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.setSize(mount.clientWidth || 640, mount.clientHeight || 420);
      mount.appendChild(renderer.domElement);

      const ambient = new THREE.HemisphereLight(0xffffff, 0x303040, 2.4);
      const key = new THREE.DirectionalLight(0xffffff, 1.6);
      key.position.set(4, 8, 6);
      scene.add(ambient, key);

      const grid = new THREE.GridHelper(10, 10, 0x2dd4bf, 0x26323a);
      grid.visible = true;
      scene.add(grid);

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.autoRotate = false;

      const onContextLost = (event) => {
        event.preventDefault();
        setError("Preview renderer context was lost.");
      };
      renderer.domElement.addEventListener("webglcontextlost", onContextLost, false);

      const resize = () => {
        if (!mount.clientWidth || !mount.clientHeight) return;
        camera.aspect = mount.clientWidth / mount.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(mount.clientWidth, mount.clientHeight);
      };
      window.addEventListener("resize", resize);

      const response = await fetch(previewUrl, { cache: "no-store" });
      if (!response.ok) throw new Error("Preview file could not be downloaded.");
      const blob = await response.blob();
      objectUrl = URL.createObjectURL(blob);

      const loader = new GLTFLoader();
      const gltf = await loader.loadAsync(objectUrl);
      if (cancelled) {
        disposeObject(gltf.scene);
        return;
      }
      scene.add(gltf.scene);

      const box = new THREE.Box3().setFromObject(gltf.scene);
      const size = new THREE.Vector3();
      const target = new THREE.Vector3();
      box.getSize(size);
      box.getCenter(target);
      const maxAxis = Math.max(size.x, size.y, size.z, 1);
      const distance = maxAxis * 1.8;
      stateRef.current = { camera, controls, target, distance, grid, scene, renderer, object: gltf.scene };
      resetCamera();
      resize();

      const animate = () => {
        controls.update();
        renderer.render(scene, camera);
        animationId = window.requestAnimationFrame(animate);
      };
      animate();
      setLoading(false);

      stateRef.current.cleanup = () => {
        window.removeEventListener("resize", resize);
        renderer.domElement.removeEventListener("webglcontextlost", onContextLost);
        if (animationId) window.cancelAnimationFrame(animationId);
        controls.dispose();
        disposeObject(gltf.scene);
        renderer.dispose();
        renderer.forceContextLoss?.();
        renderer.domElement.remove();
      };
    }

    loadPreview().catch((err) => {
      if (!cancelled) {
        setError(err.message || "Preview failed to load.");
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
      stateRef.current?.cleanup?.();
      stateRef.current = null;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [previewUrl, modelFileId, resetCamera]);

  useEffect(() => {
    if (stateRef.current?.grid) stateRef.current.grid.visible = gridVisible;
  }, [gridVisible]);

  return (
    <div className="relative min-h-[420px] overflow-hidden rounded-lg border border-white/10 bg-[#0b0d10]">
      <div ref={mountRef} className="h-[420px] w-full" />
      <div className="absolute right-3 top-3 flex items-center gap-2">
        <button
          type="button"
          title="Toggle grid"
          onClick={() => setGridVisible((value) => !value)}
          className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border transition ${
            gridVisible ? "border-[#00f5d4]/40 bg-[#00f5d4]/10 text-[#00f5d4]" : "border-white/10 bg-black/50 text-gray-300"
          }`}
        >
          <Grid2X2 className="h-4 w-4" />
        </button>
        <button
          type="button"
          title="Reset camera"
          onClick={resetCamera}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-black/50 text-gray-300 transition hover:text-white"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
          <Loader2 className="h-6 w-6 animate-spin text-[#00f5d4]" />
        </div>
      )}
      {error && (
        <div className="absolute inset-x-4 bottom-4 rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {error}
        </div>
      )}
    </div>
  );
}
