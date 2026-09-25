'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js';
import { ChevronDown } from 'lucide-react';
import { jetsonHeaders, type ScanObject, type Vec3 } from '@/lib/scan';

interface Props {
  pointcloudUrl: string;
  objects: ScanObject[];
  cameraTrajectory: Vec3[];
  // Jetsonへの取得に失敗した場合に代わりに読み込む点群（デバッグ表示専用。本番のスキャンでは渡さない）
  fallbackPointcloudUrl?: string;
}

const MULTI_VIEW_COLOR = 0x22c55e; // green-500: 複数視点で確認
const SINGLE_VIEW_COLOR = 0xf59e0b; // amber-500: 単一視点のみ
const TRAJECTORY_COLOR = 0xef4444; // red-500
const POINT_CLOUD_COLOR = 0x3b82f6; // blue-500: レイヤーUI上の点群アイコン色（点群自体はvertex colorかグレー）
const FLOOR_GRID_COLOR = 0x3b82f6; // blue-500

type ViewPreset = 'fit' | 'top' | 'front' | 'side';

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
  points: THREE.Points | null;
  pointsMaterial: THREE.PointsMaterial | null;
  floorGrid: THREE.GridHelper | null;
  basePointSize: number;
  focusTarget: { position: THREE.Vector3; target: THREE.Vector3 } | null;
  // 上下反転・視点プリセットの回転/移動先を計算するための基準（点群のバウンディングボックス中心・半径）
  // 点群読み込み前はnull
  flipCenter: THREE.Vector3 | null;
  sceneRadius: number | null;
}

// トグルスイッチの色は、対応するレイヤーの3D表示色（マーカー・軌跡・点群）と揃えている。
// three.jsのhex定数から生成することで、凡例と実際の描画色が食い違わないようにする
const toCssColor = (hex: number) => `#${hex.toString(16).padStart(6, '0')}`;

function ToggleSwitch({
  checked,
  onChange,
  color,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  color: string;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="inline-flex h-4 w-7 shrink-0 items-center rounded-full px-0.5 transition-colors"
      style={{ backgroundColor: checked ? color : 'rgba(255,255,255,0.14)' }}
    >
      <span
        className={`h-3 w-3 transform rounded-full bg-white transition-transform ${
          checked ? 'translate-x-3.5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

function CollapseToggle({ collapsed, onClick, label }: { collapsed: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={!collapsed}
      title={label}
      aria-label={label}
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-white/10 hover:text-zinc-200"
    >
      <ChevronDown className={`h-4 w-4 transition-transform ${collapsed ? '-rotate-90' : ''}`} />
    </button>
  );
}

export function ScanViewer({ pointcloudUrl, objects, cameraTrajectory, fallbackPointcloudUrl }: Props) {
  const t = useTranslations('space.viewer');
  const containerRef = useRef<HTMLDivElement>(null);
  const refs = useRef<SceneRefs | null>(null);
  const gizmoRefs = useRef<{ line: SVGLineElement; label: SVGTextElement }[]>([]);

  const [showTrajectory, setShowTrajectory] = useState(true);
  const [showSingleView, setShowSingleView] = useState(true);
  const [showMultiView, setShowMultiView] = useState(true);
  const [showPointCloud, setShowPointCloud] = useState(true);
  const [showFloorGrid, setShowFloorGrid] = useState(true);
  const [pointSize, setPointSize] = useState(1);
  const [pointCount, setPointCount] = useState<number | null>(null);
  const [hovered, setHovered] = useState<ScanObject | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [activeView, setActiveView] = useState<ViewPreset>('fit');

  const [sceneCollapsed, setSceneCollapsed] = useState(false);
  const [displayCollapsed, setDisplayCollapsed] = useState(false);

  const multiViewCount = objects.filter((o) => o.viewCount >= 2).length;
  const singleViewCount = objects.length - multiViewCount;

  // 点群・マーカー・カメラ軌跡を、点群のバウンディングボックス中心を軸にX軸周りへ180度回転する。
  // 同じ操作を2回行うと元に戻る（180度回転は自身が逆変換になるため）
  const handleFlip = () => {
    const r = refs.current;
    if (!r || !r.flipCenter) return;
    const center = r.flipCenter;
    const axis = new THREE.Vector3(1, 0, 0);

    if (r.points) {
      const g = r.points.geometry;
      g.translate(-center.x, -center.y, -center.z);
      g.rotateX(Math.PI);
      g.translate(center.x, center.y, center.z);
      g.computeVertexNormals();
    }

    if (r.trajectoryLine) {
      const g = r.trajectoryLine.geometry;
      g.translate(-center.x, -center.y, -center.z);
      g.rotateX(Math.PI);
      g.translate(center.x, center.y, center.z);
    }

    for (const marker of r.markers) {
      marker.mesh.position.sub(center).applyAxisAngle(axis, Math.PI).add(center);
    }

    setFlipped((f) => !f);
  };

  // ツールバーの視点プリセット（Fit/Top/Front/Side）。バウンディングボックス中心・半径を基準に
  // カメラを瞬時に配置し直す。Top視点はcamera.upをデフォルト(0,1,0)のままにすると
  // 視線方向と平行になり姿勢が不定になるため、upを(0,0,-1)に切り替える
  const setCameraView = (view: ViewPreset) => {
    const r = refs.current;
    if (!r || !r.flipCenter || r.sceneRadius === null) return;
    const { camera, controls } = r;
    const center = r.flipCenter;
    const distance = Math.max(r.sceneRadius, 0.01) * 1.6;

    if (view === 'fit') {
      camera.up.set(0, 1, 0);
      camera.position.copy(center).add(new THREE.Vector3(distance, distance, distance));
    } else if (view === 'top') {
      camera.up.set(0, 0, -1);
      camera.position.copy(center).add(new THREE.Vector3(0, distance, 0.0001));
    } else if (view === 'front') {
      camera.up.set(0, 1, 0);
      camera.position.copy(center).add(new THREE.Vector3(0, 0, distance));
    } else if (view === 'side') {
      camera.up.set(0, 1, 0);
      camera.position.copy(center).add(new THREE.Vector3(distance, 0, 0));
    }

    controls.target.copy(center);
    controls.update();
    setActiveView(view);
  };

  // シーン構築(データが変わったときだけ作り直す)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0c1019);

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
      mesh.visible = isMultiView ? showMultiView : showSingleView;
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
      points: null,
      pointsMaterial: null,
      floorGrid: null,
      basePointSize: 0.01,
      focusTarget: null,
      flipCenter: null,
      sceneRadius: null,
    };

    // PLYLoader.load()は生URLを直接fetchするためAuthorizationヘッダーを付けられない。
    // Jetson側の点群配信はAPIキー認証必須のため、自前でfetchしてからparse()に渡す
    let cancelled = false;
    const loader = new PLYLoader();

    const renderPointcloud = (buffer: ArrayBuffer) => {
        if (cancelled) return;
        const geometry = loader.parse(buffer);
        geometry.computeBoundingBox();
        geometry.computeVertexNormals();

        const hasColor = !!geometry.attributes.color;
        const box = geometry.boundingBox ?? new THREE.Box3();
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const radius = size.length() || 1;

        // マーカー半径は点群のスケール（バウンディングボックスの対角線長）に対する
        // 相対サイズにする。SfMの復元スケールはセッションごとに異なりうるため、
        // 固定の絶対値だと大きすぎたり見えなくなったりする（doc/spec.md 9章参照）
        const markerRadius = radius * 0.012;

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
        points.visible = showPointCloud;
        scene.add(points);

        // 床グリッド。点群のバウンディングボックス下端に、点群のスケールに合わせた大きさで配置する
        const gridSize = Math.max(radius * 3, 0.1);
        const gridDivisions = 24;
        const floorGrid = new THREE.GridHelper(gridSize, gridDivisions, FLOOR_GRID_COLOR, FLOOR_GRID_COLOR);
        floorGrid.position.set(center.x, box.min.y, center.z);
        const gridMaterial = floorGrid.material as THREE.Material & { opacity: number; transparent: boolean };
        gridMaterial.opacity = 0.12;
        gridMaterial.transparent = true;
        floorGrid.visible = showFloorGrid;
        scene.add(floorGrid);

        for (const marker of markers) {
          marker.mesh.scale.setScalar(markerRadius);
        }

        if (refs.current) {
          refs.current.points = points;
          refs.current.pointsMaterial = material;
          refs.current.floorGrid = floorGrid;
          refs.current.basePointSize = basePointSize;
          refs.current.flipCenter = center.clone();
          refs.current.sceneRadius = radius;
        }
        setPointCount(geometry.attributes.position.count);

        camera.up.set(0, 1, 0);
        controls.target.copy(center);
        camera.position.copy(center).add(new THREE.Vector3(radius, radius, radius) .multiplyScalar(0.92));
        camera.near = radius / 100;
        camera.far = radius * 100;
        camera.updateProjectionMatrix();
        controls.update();
    };

    const fetchPointcloud = (url: string, headers?: HeadersInit) =>
      fetch(url, headers ? { headers } : undefined).then((res) => {
        if (!res.ok) throw new Error(`Failed to fetch point cloud (status ${res.status})`);
        return res.arrayBuffer();
      });

    fetchPointcloud(pointcloudUrl, jetsonHeaders())
      .then(renderPointcloud)
      .catch((error) => {
        if (!fallbackPointcloudUrl) {
          console.error('Failed to load point cloud:', error);
          return;
        }
        console.warn('Failed to load point cloud from Jetson, falling back to sample data:', error);
        fetchPointcloud(fallbackPointcloudUrl)
          .then(renderPointcloud)
          .catch((fallbackError) => console.error('Failed to load fallback point cloud:', fallbackError));
      });

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

    // 方向ガイド（画面右下のX/Y/Z軸インジケーター）。カメラのワールド回転を軸ベクトルへ適用し、
    // その視点空間の(x, y)成分を2D投影として使う。React stateを介さずDOMへ直接書き込むことで、
    // 毎フレームの再レンダリングを避ける（他の描画ループと同じ方針）
    const gizmoAxes: { axis: THREE.Vector3; length: number }[] = [
      { axis: new THREE.Vector3(1, 0, 0), length: 22 },
      { axis: new THREE.Vector3(0, 1, 0), length: 22 },
      { axis: new THREE.Vector3(0, 0, 1), length: 22 },
    ];
    const viewSpace = new THREE.Vector3();
    const updateGizmo = () => {
      const entries = gizmoRefs.current;
      if (entries.length !== 3) return;
      for (let i = 0; i < 3; i++) {
        const { line, label } = entries[i];
        if (!line || !label) continue;
        viewSpace.copy(gizmoAxes[i].axis).applyQuaternion(camera.quaternion).normalize();
        const x2 = 36 + viewSpace.x * gizmoAxes[i].length;
        const y2 = 36 - viewSpace.y * gizmoAxes[i].length;
        line.setAttribute('x2', String(x2));
        line.setAttribute('y2', String(y2));
        label.setAttribute('x', String(36 + viewSpace.x * (gizmoAxes[i].length + 8)));
        label.setAttribute('y', String(36 - viewSpace.y * (gizmoAxes[i].length + 8)));
        // 奥にある軸は少し薄くして手前/奥の区別をつける
        line.setAttribute('opacity', viewSpace.z < 0 ? '0.45' : '1');
        label.setAttribute('opacity', viewSpace.z < 0 ? '0.45' : '1');
      }
    };

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
      updateGizmo();
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
      cancelled = true;
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
  }, [pointcloudUrl, objects, cameraTrajectory, fallbackPointcloudUrl]);

  // トグル・スライダーの反映（シーンを作り直さず既存オブジェクトを更新するだけ）
  useEffect(() => {
    if (!refs.current) return;
    for (const marker of refs.current.markers) {
      const isMultiView = marker.object.viewCount >= 2;
      marker.mesh.visible = isMultiView ? showMultiView : showSingleView;
    }
  }, [showSingleView, showMultiView]);

  useEffect(() => {
    if (refs.current?.trajectoryLine) {
      refs.current.trajectoryLine.visible = showTrajectory;
    }
  }, [showTrajectory]);

  useEffect(() => {
    if (refs.current?.points) {
      refs.current.points.visible = showPointCloud;
    }
  }, [showPointCloud]);

  useEffect(() => {
    if (refs.current?.floorGrid) {
      refs.current.floorGrid.visible = showFloorGrid;
    }
  }, [showFloorGrid]);

  useEffect(() => {
    if (refs.current?.pointsMaterial) {
      refs.current.pointsMaterial.size = refs.current.basePointSize * pointSize;
    }
  }, [pointSize]);

  const densePointCloudColor = toCssColor(POINT_CLOUD_COLOR);
  const trajectoryColor = toCssColor(TRAJECTORY_COLOR);
  const confirmedColor = toCssColor(MULTI_VIEW_COLOR);
  const singleViewColor = toCssColor(SINGLE_VIEW_COLOR);

  const viewButtonClass = (view: ViewPreset) =>
    `shrink-0 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors ${
      activeView === view ? 'bg-white/10 text-zinc-100 font-semibold' : 'text-zinc-400 hover:text-zinc-200'
    }`;

  return (
    <div ref={containerRef} className="relative w-full h-full bg-[#0c1019]" title={t('hints')}>
      {/* Scene panel: 点群/カメラ/検出のKPIとレイヤー表示切替 */}
      <div className="absolute left-[15px] top-[15px] w-[42%] max-w-[190px] rounded-[14px] border border-white/[0.08] bg-[rgba(15,20,34,0.72)] p-2.5 shadow-[0px_12px_32px_0px_rgba(0,0,0,0.45)] backdrop-blur-md sm:w-[288px] sm:max-w-[calc(100%-30px)] sm:p-4">
        <div className="flex w-full items-center justify-between">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: '#6e9bff' }} />
            <p className="whitespace-nowrap text-[10px] font-semibold tracking-[0.08em] text-[#6e9bff] sm:text-[11px]">
              {t('badge')}
            </p>
          </div>
          <CollapseToggle
            collapsed={sceneCollapsed}
            onClick={() => setSceneCollapsed((v) => !v)}
            label={t('togglePanel', { panel: t('badge') })}
          />
        </div>

        {!sceneCollapsed && (
          <div className="mt-2.5 flex flex-col gap-2.5 sm:mt-3.5 sm:gap-3.5">
            <div className="flex gap-1.5 sm:gap-2">
              <div className="flex-1 rounded-lg border border-white/5 bg-white/[0.04] px-2 py-1.5 sm:px-2.5 sm:py-2">
                <p className="text-[10px] text-zinc-500 sm:text-[11px]">{t('pointCount')}</p>
                <p className="text-sm font-semibold text-zinc-100 sm:text-lg">
                  {pointCount !== null ? pointCount.toLocaleString() : '—'}
                </p>
              </div>
              <div className="flex-1 rounded-lg border border-white/5 bg-white/[0.04] px-2 py-1.5 sm:px-2.5 sm:py-2">
                <p className="text-[10px] text-zinc-500 sm:text-[11px]">{t('itemsLabel')}</p>
                <p className="text-sm font-semibold text-zinc-100 sm:text-lg">{objects.length}</p>
              </div>
            </div>

            <div className="h-px w-full bg-white/[0.07]" />

            <p className="text-[9px] font-semibold tracking-[0.1em] text-zinc-500 sm:text-[10px]">{t('layersTitle')}</p>

            <div className="flex flex-col gap-0.5">
              <div className="flex items-center justify-between rounded-lg p-1.5 sm:p-2">
                <div className="flex items-center gap-1.5 sm:gap-2.5">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: densePointCloudColor }} />
                  <div>
                    <p className="text-[11px] font-medium text-zinc-100 sm:text-[13px]">{t('layerDensePointCloud')}</p>
                    <p className="text-[10px] text-zinc-500 sm:text-[11px]">{t('layerDensePointCloudSub')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-3">
                  <span className="text-[11px] font-medium text-zinc-400 sm:text-xs">
                    {pointCount !== null ? pointCount.toLocaleString() : '—'}
                  </span>
                  <ToggleSwitch
                    checked={showPointCloud}
                    onChange={setShowPointCloud}
                    color={densePointCloudColor}
                    label={t('togglePanel', { panel: t('layerDensePointCloud') })}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg p-1.5 sm:p-2">
                <div className="flex items-center gap-1.5 sm:gap-2.5">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: trajectoryColor }} />
                  <p className="text-[11px] font-medium text-zinc-100 sm:text-[13px]">{t('layerCameraTrajectory')}</p>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-3">
                  <span className="text-[11px] font-medium text-zinc-400 sm:text-xs">{cameraTrajectory.length}</span>
                  <ToggleSwitch
                    checked={showTrajectory}
                    onChange={setShowTrajectory}
                    color={trajectoryColor}
                    label={t('togglePanel', { panel: t('layerCameraTrajectory') })}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg bg-white/[0.04] p-1.5 sm:p-2">
                <div className="flex items-center gap-1.5 sm:gap-2.5">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: confirmedColor }} />
                  <div>
                    <p className="text-[11px] font-medium text-zinc-100 sm:text-[13px]">{t('layerConfirmed')}</p>
                    <p className="text-[10px] text-zinc-500 sm:text-[11px]">{t('layerConfirmedSub')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-3">
                  <span className="text-[11px] font-medium text-zinc-400 sm:text-xs">{multiViewCount}</span>
                  <ToggleSwitch
                    checked={showMultiView}
                    onChange={setShowMultiView}
                    color={confirmedColor}
                    label={t('togglePanel', { panel: t('layerConfirmed') })}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg p-1.5 sm:p-2">
                <div className="flex items-center gap-1.5 sm:gap-2.5">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: singleViewColor }} />
                  <div>
                    <p className="text-[11px] font-medium text-zinc-100 sm:text-[13px]">{t('layerSingleView')}</p>
                    <p className="text-[10px] text-zinc-500 sm:text-[11px]">{t('layerSingleViewSub')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-3">
                  <span className="text-[11px] font-medium text-zinc-400 sm:text-xs">{singleViewCount}</span>
                  <ToggleSwitch
                    checked={showSingleView}
                    onChange={setShowSingleView}
                    color={singleViewColor}
                    label={t('togglePanel', { panel: t('layerSingleView') })}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Display panel: 点の大きさ・床グリッドの表示設定 */}
      <div className="absolute right-[15px] top-[15px] w-[38%] max-w-[170px] rounded-[14px] border border-white/[0.08] bg-[rgba(15,20,34,0.72)] p-2.5 shadow-[0px_12px_32px_0px_rgba(0,0,0,0.45)] backdrop-blur-md sm:w-[256px] sm:max-w-[calc(100%-30px)] sm:p-4">
        <div className="flex w-full items-center justify-between">
          <p className="text-[9px] font-semibold tracking-[0.1em] text-zinc-500 sm:text-[10px]">{t('displayTitle')}</p>
          <CollapseToggle
            collapsed={displayCollapsed}
            onClick={() => setDisplayCollapsed((v) => !v)}
            label={t('togglePanel', { panel: t('displayTitle') })}
          />
        </div>

        {!displayCollapsed && (
          <div className="mt-2.5 flex flex-col gap-2.5 sm:mt-3.5 sm:gap-3.5">
            <div className="flex flex-col gap-2 sm:gap-2.5">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-medium text-zinc-100 sm:text-[13px]">{t('pointSize')}</p>
                <span className="rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-medium text-zinc-400 sm:text-[11px]">
                  {pointSize.toFixed(2)}×
                </span>
              </div>
              <input
                type="range"
                min={0.25}
                max={3}
                step={0.05}
                value={pointSize}
                onChange={(e) => setPointSize(Number(e.target.value))}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/[0.12] accent-blue-500 [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-white [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
              />
              <div className="flex justify-between text-[9px] text-zinc-500 sm:text-[10px]">
                <span>0.25×</span>
                <span>3.00×</span>
              </div>
            </div>

            <div className="h-px w-full bg-white/[0.07]" />

            <div className="flex items-center justify-between">
              <p className="text-[11px] font-medium text-zinc-100 sm:text-[13px]">{t('floorGrid')}</p>
              <ToggleSwitch
                checked={showFloorGrid}
                onChange={setShowFloorGrid}
                color={densePointCloudColor}
                label={t('togglePanel', { panel: t('floorGrid') })}
              />
            </div>
          </div>
        )}
      </div>

      {/* View toolbar: 視点プリセット + 上下反転 */}
      <div className="absolute bottom-[16px] left-1/2 flex -translate-x-1/2 items-center gap-0.5 rounded-xl border border-white/[0.08] bg-[rgba(15,20,34,0.72)] p-1 shadow-[0px_12px_32px_0px_rgba(0,0,0,0.45)] backdrop-blur-md">
        <button type="button" onClick={() => setCameraView('fit')} className={viewButtonClass('fit')}>
          {t('viewFit')}
        </button>
        <button type="button" onClick={() => setCameraView('top')} className={viewButtonClass('top')}>
          {t('viewTop')}
        </button>
        <button type="button" onClick={() => setCameraView('front')} className={viewButtonClass('front')}>
          {t('viewFront')}
        </button>
        <button type="button" onClick={() => setCameraView('side')} className={viewButtonClass('side')}>
          {t('viewSide')}
        </button>
        <div className="mx-0.5 h-[18px] w-px shrink-0 bg-white/10" />
        <button
          type="button"
          onClick={handleFlip}
          aria-pressed={flipped}
          title={t('flipButton')}
          className="flex shrink-0 items-center gap-1.5 rounded-lg py-1.5 pl-3 pr-3.5 text-xs font-medium text-zinc-400 transition-colors hover:text-zinc-200"
        >
          <span aria-hidden="true">⇅</span>
          {t('flipLabel')}
        </button>
      </div>

      {/* Axis gizmo: カメラ姿勢に追従するX/Y/Z軸インジケーター */}
      <div className="absolute bottom-[16px] right-[16px] h-[72px] w-[72px] overflow-hidden rounded-full border border-white/[0.08] bg-[rgba(15,20,34,0.6)]">
        <svg viewBox="0 0 72 72" className="h-full w-full">
          {(['x', 'y', 'z'] as const).map((axis, i) => {
            const color = axis === 'x' ? '#f87171' : axis === 'y' ? '#4ade80' : '#60a5fa';
            return (
              <g key={axis}>
                <line
                  ref={(el) => {
                    if (el) {
                      gizmoRefs.current[i] = { ...gizmoRefs.current[i], line: el };
                    }
                  }}
                  x1={36}
                  y1={36}
                  x2={36}
                  y2={36}
                  stroke={color}
                  strokeWidth={2}
                  strokeLinecap="round"
                />
                <text
                  ref={(el) => {
                    if (el) {
                      gizmoRefs.current[i] = { ...gizmoRefs.current[i], label: el };
                    }
                  }}
                  x={36}
                  y={36}
                  fill={color}
                  fontSize={9}
                  fontWeight={700}
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  {axis.toUpperCase()}
                </text>
              </g>
            );
          })}
        </svg>
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
