'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js';
import type { ScanObject, Vec3 } from '@/lib/scan';

interface Props {
  pointcloudUrl: string;
  objects: ScanObject[];
  cameraTrajectory: Vec3[];
}

const MULTI_VIEW_COLOR = 0x22c55e; // green-500: 複数視点で確認
const SINGLE_VIEW_COLOR = 0xf59e0b; // amber-500: 単一視点のみ
const TRAJECTORY_COLOR = 0xef4444; // red-500

interface Marker {
  mesh: THREE.Mesh;
  object: ScanObject;
}

interface SceneRefs {
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  markers: Marker[];
  trajectoryLine: THREE.Line | null;
  pointsMaterial: THREE.PointsMaterial | null;
  basePointSize: number;
  focusTarget: { position: THREE.Vector3; target: THREE.Vector3 } | null;
}

export function ScanViewer({ pointcloudUrl, objects, cameraTrajectory }: Props) {
  const t = useTranslations('space.viewer');
  const containerRef = useRef<HTMLDivElement>(null);
  const refs = useRef<SceneRefs | null>(null);

  const [showTrajectory, setShowTrajectory] = useState(true);
  const [showSingleView, setShowSingleView] = useState(true);
  const [pointSize, setPointSize] = useState(1);
  const [pointCount, setPointCount] = useState<number | null>(null);
  const [hovered, setHovered] = useState<ScanObject | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);

  const multiViewCount = objects.filter((o) => o.viewCount >= 2).length;
  const singleViewCount = objects.length - multiViewCount;

  // シーン構築（データが変わったときだけ作り直す）
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0a);

    const camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.01,
      1000
    );
    camera.position.set(2, 2, 2);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    scene.add(new THREE.AmbientLight(0xffffff, 0.9));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
    dirLight.position.set(3, 5, 2);
    scene.add(dirLight);

    // 対象物マーカー（視点数で色分け）。半径は点群読み込み後にスケールへ合わせて調整する
    const markerGeometry = new THREE.SphereGeometry(1, 16, 16);
    const markers: Marker[] = objects.map((obj) => {
      const isMultiView = obj.viewCount >= 2;
      const material = new THREE.MeshBasicMaterial({
        color: isMultiView ? MULTI_VIEW_COLOR : SINGLE_VIEW_COLOR,
      });
      const mesh = new THREE.Mesh(markerGeometry, material);
      mesh.position.set(obj.position.x, obj.position.y, obj.position.z);
      mesh.scale.setScalar(0.035); // 読み込み前の暫定値
      mesh.visible = isMultiView || showSingleView;
      scene.add(mesh);
      return { mesh, object: obj };
    });

    // カメラ軌跡
    let trajectoryLine: THREE.Line | null = null;
    if (cameraTrajectory.length > 1) {
      const points = cameraTrajectory.map((p) => new THREE.Vector3(p.x, p.y, p.z));
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({ color: TRAJECTORY_COLOR });
      trajectoryLine = new THREE.Line(geometry, material);
      trajectoryLine.visible = showTrajectory;
      scene.add(trajectoryLine);
    }

    refs.current = {
      camera,
      renderer,
      controls,
      markers,
      trajectoryLine,
      pointsMaterial: null,
      basePointSize: 0.01,
      focusTarget: null,
    };

    const loader = new PLYLoader();
    loader.load(
      pointcloudUrl,
      (geometry) => {
        geometry.computeBoundingBox();
        geometry.computeVertexNormals();

        const hasColor = !!geometry.attributes.color;
        const box = geometry.boundingBox ?? new THREE.Box3();
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3()).length() || 1;

        // マーカー半径は点群のスケール（バウンディングボックスの対角線長）に対する
        // 相対サイズにする。SfMの復元スケールはセッションごとに異なりうるため、
        // 固定の絶対値だと大きすぎたり見えなくなったりする（doc/spec.md 9章参照）
        const markerRadius = size * 0.012;

        // 点のサイズは sizeAttenuation を切り、画面上のピクセル数で固定する。
        // 距離減衰ありだと計算上のサイズがWebGLの最小描画サイズ(1px)未満になり、
        // スライダーを動かしても見た目が変わらなくなるため（1pxにクランプされる）
        const basePointSize = 2; // px
        const material = new THREE.PointsMaterial({
          size: basePointSize,
          sizeAttenuation: false,
          vertexColors: hasColor,
          color: hasColor ? undefined : 0xaaaaaa,
        });
        const points = new THREE.Points(geometry, material);
        scene.add(points);

        for (const marker of markers) {
          marker.mesh.scale.setScalar(markerRadius);
        }

        if (refs.current) {
          refs.current.pointsMaterial = material;
          refs.current.basePointSize = basePointSize;
        }
        setPointCount(geometry.attributes.position.count);

        controls.target.copy(center);
        camera.position.copy(center).add(new THREE.Vector3(size, size, size));
        camera.near = size / 100;
        camera.far = size * 100;
        camera.updateProjectionMatrix();
        controls.update();
      },
      undefined,
      (error) => console.error('Failed to load point cloud:', error)
    );

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const pickMarker = (clientX: number, clientY: number): Marker | null => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const meshes = markers.filter((m) => m.mesh.visible).map((m) => m.mesh);
      const intersects = raycaster.intersectObjects(meshes);
      if (intersects.length === 0) return null;
      return markers.find((m) => m.mesh === intersects[0].object) || null;
    };

    const handlePointerMove = (event: PointerEvent) => {
      const found = pickMarker(event.clientX, event.clientY);
      const rect = renderer.domElement.getBoundingClientRect();
      if (found) {
        setHovered(found.object);
        setHoverPos({ x: event.clientX - rect.left, y: event.clientY - rect.top });
        renderer.domElement.style.cursor = 'pointer';
      } else {
        setHovered(null);
        renderer.domElement.style.cursor = 'default';
      }
    };

    const handleClick = (event: MouseEvent) => {
      const found = pickMarker(event.clientX, event.clientY);
      if (!found || !refs.current) return;
      const dir = new THREE.Vector3()
        .subVectors(camera.position, controls.target)
        .normalize()
        .multiplyScalar(0.4);
      refs.current.focusTarget = {
        target: found.mesh.position.clone(),
        position: found.mesh.position.clone().add(dir),
      };
    };

    renderer.domElement.addEventListener('pointermove', handlePointerMove);
    renderer.domElement.addEventListener('click', handleClick);

    let frameId: number;
    const animate = () => {
      frameId = requestAnimationFrame(animate);

      const focus = refs.current?.focusTarget;
      if (focus) {
        controls.target.lerp(focus.target, 0.12);
        camera.position.lerp(focus.position, 0.12);
        if (camera.position.distanceTo(focus.position) < 0.005) {
          refs.current!.focusTarget = null;
        }
      }

      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('pointermove', handlePointerMove);
      renderer.domElement.removeEventListener('click', handleClick);
      controls.dispose();
      renderer.dispose();
      container.removeChild(renderer.domElement);
      refs.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pointcloudUrl, objects, cameraTrajectory]);

  // トグル・スライダーの反映（シーンを作り直さず既存オブジェクトを更新するだけ）
  useEffect(() => {
    if (!refs.current) return;
    for (const marker of refs.current.markers) {
      const isMultiView = marker.object.viewCount >= 2;
      marker.mesh.visible = isMultiView || showSingleView;
    }
  }, [showSingleView]);

  useEffect(() => {
    if (refs.current?.trajectoryLine) {
      refs.current.trajectoryLine.visible = showTrajectory;
    }
  }, [showTrajectory]);

  useEffect(() => {
    if (refs.current?.pointsMaterial) {
      refs.current.pointsMaterial.size = refs.current.basePointSize * pointSize;
    }
  }, [pointSize]);

  return (
    <div ref={containerRef} className="relative w-full h-full bg-[#0a0a0a]">
      {/* 統計パネル */}
      <div className="absolute top-3 left-3 bg-black/70 backdrop-blur rounded-lg px-4 py-3 text-white text-sm space-y-1 max-w-[220px]">
        <div className="text-blue-300 text-[11px] font-semibold tracking-wide">
          {t('badge')}
        </div>
        <dl className="space-y-1 pt-1">
          <div className="flex justify-between gap-4">
            <dt className="text-gray-400">{t('pointCount')}</dt>
            <dd className="font-semibold">{pointCount !== null ? pointCount.toLocaleString() : '—'}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-gray-400">{t('cameraCount')}</dt>
            <dd className="font-semibold">{cameraTrajectory.length}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-gray-400">{t('detectedTotal')}</dt>
            <dd className="font-semibold">{objects.length}</dd>
          </div>
          <div className="flex justify-between gap-4 pl-2 text-xs">
            <dt className="text-green-400">└ {t('multiView')}</dt>
            <dd className="text-green-400">{multiViewCount}</dd>
          </div>
          <div className="flex justify-between gap-4 pl-2 text-xs">
            <dt className="text-amber-400">└ {t('singleView')}</dt>
            <dd className="text-amber-400">{singleViewCount}</dd>
          </div>
        </dl>
      </div>

      {/* 表示設定パネル */}
      <div className="absolute top-3 right-3 bg-black/70 backdrop-blur rounded-lg px-4 py-3 text-white text-sm w-52 space-y-3">
        <div className="text-gray-300 text-xs font-semibold">{t('settingsTitle')}</div>
        <label className="flex items-center justify-between">
          <span>{t('trajectoryToggle')}</span>
          <input
            type="checkbox"
            checked={showTrajectory}
            onChange={(e) => setShowTrajectory(e.target.checked)}
          />
        </label>
        <label className="flex items-center justify-between">
          <span>{t('singleViewToggle')}</span>
          <input
            type="checkbox"
            checked={showSingleView}
            onChange={(e) => setShowSingleView(e.target.checked)}
          />
        </label>
        <div>
          <div className="flex justify-between text-xs text-gray-300 mb-1">
            <span>{t('pointSize')}</span>
            <span>{pointSize.toFixed(2)}x</span>
          </div>
          <input
            type="range"
            min={0.2}
            max={3}
            step={0.1}
            value={pointSize}
            onChange={(e) => setPointSize(Number(e.target.value))}
            className="w-full"
          />
        </div>
        <p className="text-[10px] text-gray-400 leading-relaxed pt-1 border-t border-gray-700">
          {t('hints')}
        </p>
      </div>

      {/* 凡例 */}
      <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur rounded-lg px-3 py-2 text-white text-xs space-y-1">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-gray-300 inline-block" /> {t('legendPoints')}
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> {t('legendTrajectory')}
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> {t('legendMultiView')}
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> {t('legendSingleView')}
        </div>
      </div>

      {/* ホバー時のツールチップ */}
      {hovered && hoverPos && (
        <div
          className="absolute bg-black/85 text-white text-xs rounded px-2 py-1 pointer-events-none"
          style={{ left: hoverPos.x + 12, top: hoverPos.y + 12 }}
        >
          <div className="font-semibold">{hovered.label}</div>
          <div className="text-gray-300">
            {t('tooltipViewCount', { count: hovered.viewCount })}
          </div>
        </div>
      )}
    </div>
  );
}
