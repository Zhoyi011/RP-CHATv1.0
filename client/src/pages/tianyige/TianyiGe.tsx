// client/src/pages/tianyige/TianyiGe.tsx

import React, { useState, useMemo, useRef, useEffect } from "react";
import { Canvas, useLoader } from "@react-three/fiber";
import { TextureLoader } from "three";
import { CameraController } from "./components/CameraController";
import { Planet } from "./components/Planet";
import { SearchBar } from "./components/SearchBar";
import { SettingsPanel } from "./components/SettingsPanel";
import { planets } from "./data/planets";
import * as THREE from "three";
import { X, Info, Loader2, ArrowLeft } from "lucide-react";
import { setGlobalAFKDisabled } from "../../contexts/AFKContext";
import { auth } from "../../firebase/config";
import { useNavigate } from "react-router-dom";
import "./TianyiGe.css";

// ============================================================
// 加载状态
// ============================================================
const LoadingOverlay: React.FC<{ loading: boolean }> = ({ loading }) => {
  if (!loading) return null;
  return (
    <div className="loading-overlay">
      <Loader2 className="loading-spinner" size={40} />
      <p>天仪阁 · 宇宙加载中</p>
      <span className="loading-sub">星辰万物，正在汇聚...</span>
    </div>
  );
};

// ============================================================
// ✅ 星空背景粒子（大幅减少数量）
// ============================================================
const StarField: React.FC<{ quality: "low" | "medium" | "high" }> = ({ quality }) => {
  const count = useMemo(() => {
    switch (quality) {
      case "low": return 600;
      case "medium": return 1500;
      default: return 3000;
    }
  }, [quality]);

  const pointsRef = useRef<THREE.Points>(null);

  const [positions, colors] = useMemo(() => {
    const coords = new Float32Array(count * 3);
    const cols = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 150 + Math.random() * 400;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      coords[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      coords[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      coords[i * 3 + 2] = r * Math.cos(phi);
      const t = Math.random();
      if (t < 0.7) {
        cols[i * 3] = 1.0; cols[i * 3 + 1] = 1.0; cols[i * 3 + 2] = 1.0;
      } else if (t < 0.85) {
        cols[i * 3] = 0.7; cols[i * 3 + 1] = 0.8; cols[i * 3 + 2] = 1.0;
      } else {
        cols[i * 3] = 1.0; cols[i * 3 + 1] = 0.7; cols[i * 3 + 2] = 0.5;
      }
    }
    return [coords, cols];
  }, [count]);

  useEffect(() => {
    return () => {
      if (pointsRef.current) {
        const geom = pointsRef.current.geometry;
        const mat = pointsRef.current.material;
        if (geom && typeof geom.dispose === 'function') {
          geom.dispose();
        }
        if (mat) {
          if (Array.isArray(mat)) {
            mat.forEach((m) => {
              if (m && typeof (m as THREE.Material).dispose === 'function') {
                (m as THREE.Material).dispose();
              }
            });
          } else if (typeof (mat as THREE.Material).dispose === 'function') {
            (mat as THREE.Material).dispose();
          }
        }
      }
    };
  }, []);

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.4}
        sizeAttenuation
        vertexColors
        transparent
        opacity={quality === "high" ? 0.9 : 0.8}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

// ============================================================
// 银河背景
// ============================================================
const MilkyWayBackground: React.FC = () => {
  const texture = useLoader(
    TextureLoader,
    "https://res.cloudinary.com/dz8luzlsg/image/upload/w_128/v1781527665/stars_milky_way_zdqpre.jpg"
  );

  useEffect(() => {
    return () => {
      if (texture && typeof texture.dispose === 'function') {
        texture.dispose();
      }
    };
  }, [texture]);

  return (
    <mesh position={[0, 0, -180]}>
      <planeGeometry args={[500, 500]} />
      <meshBasicMaterial map={texture} transparent depthWrite={false} toneMapped={false} />
    </mesh>
  );
};

// ============================================================
// 主组件
// ============================================================
export const TianyiGe: React.FC = () => {
  const navigate = useNavigate();
  const [quality, setQuality] = useState<"low" | "medium" | "high">("low");
  const [showOrbit, setShowOrbit] = useState<boolean>(true);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [resetTrigger, setResetTrigger] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);

  const globalPositionsRef = useRef<Record<string, THREE.Vector3>>({});
  const mobileCheckRef = useRef<boolean>(false);

  // ============================================================
  // 检查登录状态
  // ============================================================
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setIsLoggedIn(!!user);
    });
    return () => unsubscribe();
  }, []);

  // ============================================================
  // 返回按钮处理
  // ============================================================
  const handleBack = () => {
    if (isLoggedIn) {
      navigate('/chat');
    } else {
      navigate('/login');
    }
  };

  // ============================================================
  // 天仪阁禁用 AFK
  // ============================================================
  useEffect(() => {
    setGlobalAFKDisabled(true);
    return () => setGlobalAFKDisabled(false);
  }, []);

  // ============================================================
  // 移动端自动降级
  // ============================================================
  useEffect(() => {
    if (mobileCheckRef.current) return;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile) {
      setQuality("low");
    }
    mobileCheckRef.current = true;
  }, []);

  // ============================================================
  // 加载完成
  // ============================================================
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  // ============================================================
  // 离开天仪阁时清理
  // ============================================================
  useEffect(() => {
    return () => {
      Object.keys(globalPositionsRef.current).forEach(key => {
        delete globalPositionsRef.current[key];
      });
      if (typeof window !== 'undefined' && (window as any).gc) {
        (window as any).gc();
      }
    };
  }, []);

  const handleResetView = () => {
    setSelectedId(null);
    setResetTrigger(prev => prev + 1);
  };

  const selectedPlanet = useMemo(() => planets.find(p => p.id === selectedId) || null, [selectedId]);

  // ============================================================
  // ✅ 画质配置（降低 DPR）
  // ============================================================
  const dpr = useMemo(() => {
    switch (quality) {
      case "low": return 0.8;
      case "medium": return 1.0;
      default: return 1.2;
    }
  }, [quality]);

  // ============================================================
  // ✅ 光影配置（低内存版）
  // ============================================================
  const lightingConfig = useMemo(() => {
  switch (quality) {
    case "low":
      return {
        ambientIntensity: 0.08,
        sunIntensity: 50.0,
        sunCastShadow: false,
        fillLightIntensity: 0.3,
        backLightIntensity: 0.2,
        coolFillIntensity: 0.1,
        exposure: 1.2,
      };
    case "medium":
      return {
        ambientIntensity: 0.6,
        sunIntensity: 60.0,
        sunCastShadow: false,
        fillLightIntensity: 0.5,
        backLightIntensity: 0.3,
        coolFillIntensity: 0.2,
        exposure: 1.3,
      };
    default: // high
      return {
        ambientIntensity: 0.04,
        sunIntensity: 80.0,
        sunCastShadow: true,
        fillLightIntensity: 0.8,
        backLightIntensity: 0.5,
        coolFillIntensity: 0.3,
        exposure: 1.5,
      };
  }
}, [quality]);

  return (
    <div className="tianyige-root">
      <LoadingOverlay loading={isLoading} />

      <header className="tianyige-header">
        <div className="header-left">
          {/* 🔥 返回按钮 */}
          <button 
            className="back-to-chat-btn"
            onClick={handleBack}
            title={isLoggedIn ? "返回聊天" : "返回登录"}
          >
            <ArrowLeft size={18} />
            <span>{isLoggedIn ? "返回聊天" : "返回登录"}</span>
          </button>
          
          <div className="logo">
            <div className="logo-dot" />
            <h1>天仪阁</h1>
          </div>
          <p className="subtitle">万物阁 · 3D 宇宙观测仪</p>
        </div>
        <div className="header-right">
          <SearchBar planets={planets} onSelectPlanet={setSelectedId} selectedId={selectedId} />
        </div>
      </header>

      <main className="canvas-container">
        <Canvas
          shadows={lightingConfig.sunCastShadow}
          dpr={dpr}
          camera={{ position: [0, 28, 55], fov: 50 }}
          gl={{
            antialias: quality === "high",
            powerPreference: "low-power",
            toneMapping: THREE.ReinhardToneMapping,
            toneMappingExposure: lightingConfig.exposure,
            failIfMajorPerformanceCaveat: false,
            stencil: false,
            depth: true,
            alpha: false,
          }}
        >
          <color attach="background" args={["#010005"]} />

          <ambientLight intensity={lightingConfig.ambientIntensity} />

          <pointLight
            position={[0, 0, 0]}
            intensity={lightingConfig.sunIntensity}
            distance={400}
            decay={1.0}
            color="#ffaa66"
            castShadow={lightingConfig.sunCastShadow}
            shadow-mapSize-width={quality === "high" ? 1024 : 512}
            shadow-mapSize-height={quality === "high" ? 1024 : 512}
            shadow-bias={-0.0001}
          />

          <directionalLight
            position={[25, 35, 20]}
            intensity={lightingConfig.fillLightIntensity}
            color="#ffffff"
            castShadow={false}
          />

          <directionalLight
            position={[-20, -15, -25]}
            intensity={lightingConfig.backLightIntensity}
            color="#ffaa88"
          />

          {quality === "high" && (
            <pointLight
              position={[40, 20, 30]}
              intensity={lightingConfig.coolFillIntensity}
              color="#4488ff"
            />
          )}

          <StarField quality={quality} />

          {planets.map(planet => (
            <Planet
              key={planet.id}
              data={planet}
              quality={quality}
              isSelected={selectedId === planet.id}
              onSelect={setSelectedId}
              globalPositionsRef={globalPositionsRef}
              showOrbit={showOrbit}
              isPaused={isPaused}
            />
          ))}

          <CameraController
            selectedId={selectedId}
            globalPositionsRef={globalPositionsRef}
            resetTrigger={resetTrigger}
          />
        </Canvas>
      </main>

      <div className="settings-wrapper">
        <SettingsPanel
          quality={quality}
          setQuality={setQuality}
          showOrbit={showOrbit}
          setShowOrbit={setShowOrbit}
          isPaused={isPaused}
          setIsPaused={setIsPaused}
          onResetView={handleResetView}
        />
      </div>

      {selectedPlanet && (
        <div className="details-panel">
          <div className="details-content">
            <button className="details-close" onClick={() => setSelectedId(null)}>
              <X size={16} />
            </button>
            <div className="details-header">
              <div className="details-color" style={{ backgroundColor: selectedPlanet.color }} />
              <div>
                <h2>{selectedPlanet.name}</h2>
                <span className="details-en">{selectedPlanet.englishName}</span>
              </div>
            </div>
            <p className="details-desc">{selectedPlanet.description}</p>
            <div className="details-stats">
              <div className="stat-item">
                <span className="stat-label">质量</span>
                <span className="stat-value">{selectedPlanet.mass || "计算中"}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">表面温度</span>
                <span className="stat-value">{selectedPlanet.temp || "计算中"}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">公转周期</span>
                <span className="stat-value">{selectedPlanet.orbitalPeriod || "计算中"}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">自转周期</span>
                <span className="stat-value">{selectedPlanet.rotationPeriod || "计算中"}</span>
              </div>
            </div>
            <div className="details-footer">
              <Info size={12} />
              <span>天体跟踪锁定中</span>
              <button onClick={handleResetView} className="unlock-btn">解锁</button>
            </div>
          </div>
        </div>
      )}

      <div className="controls-hint">
        🖱️ 鼠标拖拽旋转 | 滚轮缩放 | WASD/方向键移动 | 点击星球锁定
        {quality === "low" && " | ⚡ 节能模式"}
      </div>
    </div>
  );
};

export default TianyiGe;