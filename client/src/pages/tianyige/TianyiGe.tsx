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
import { X, Info } from "lucide-react";
import "./TianyiGe.css";

// ========== 星空背景粒子系统（高密度、高亮度） ==========
const StarField: React.FC<{ quality: "low" | "medium" | "high" }> = ({ quality }) => {
  const count = useMemo(() => {
    switch (quality) {
      case "low": return 4000;
      case "medium": return 10000;
      default: return 20000;
    }
  }, [quality]);

  const [positions, colors] = useMemo(() => {
    const coords = new Float32Array(count * 3);
    const cols = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      // 球状分布，半径更大
      const r = 150 + Math.random() * 400;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      coords[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      coords[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      coords[i * 3 + 2] = r * Math.cos(phi);
      // 星星颜色：白、淡蓝、淡金
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

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.5}
        sizeAttenuation
        vertexColors
        transparent
        opacity={quality === "high" ? 1.0 : quality === "medium" ? 0.9 : 0.7}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

// ========== 银河背景图片 ==========
const MilkyWayBackground: React.FC = () => {
  const texture = useLoader(TextureLoader, "https://res.cloudinary.com/dz8luzlsg/image/upload/q_auto/f_auto/v1781527665/stars_milky_way_zdqpre.jpg");
  return (
    <mesh position={[0, 0, -180]}>
      <planeGeometry args={[500, 500]} />
      <meshBasicMaterial map={texture} transparent depthWrite={false} toneMapped={false} />
    </mesh>
  );
};

export const TianyiGe: React.FC = () => {
  const [quality, setQuality] = useState<"low" | "medium" | "high">("high");
  const [showOrbit, setShowOrbit] = useState<boolean>(true);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [resetTrigger, setResetTrigger] = useState<number>(0);

  const globalPositionsRef = useRef<Record<string, THREE.Vector3>>({});

  // 移动端自动降级
  useEffect(() => {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile && quality === "high") setQuality("medium");
  }, [quality]);

  const handleResetView = () => {
    setSelectedId(null);
    setResetTrigger(prev => prev + 1);
  };

  const selectedPlanet = useMemo(() => planets.find(p => p.id === selectedId) || null, [selectedId]);

  // 画质配置
  const dpr = useMemo(() => {
    switch (quality) {
      case "low": return 1.0;
      case "medium": return 1.2;
      default: return 1.5;
    }
  }, [quality]);

  // ========== 超强光影配置 ==========
  const lightingConfig = useMemo(() => {
    switch (quality) {
      case "low":
        return {
          ambientIntensity: 0.25,
          sunIntensity: 15.0,
          sunCastShadow: false,
          fillLightIntensity: 0.6,
          backLightIntensity: 0.3,
          coolFillIntensity: 0.2,
          exposure: 1.0,
        };
      case "medium":
        return {
          ambientIntensity: 0.15,
          sunIntensity: 28.0,
          sunCastShadow: true,
          fillLightIntensity: 1.0,
          backLightIntensity: 0.5,
          coolFillIntensity: 0.4,
          exposure: 1.3,
        };
      default: // high
        return {
          ambientIntensity: 0.08,
          sunIntensity: 45.0,
          sunCastShadow: true,
          fillLightIntensity: 1.5,
          backLightIntensity: 0.8,
          coolFillIntensity: 0.6,
          exposure: 1.6,
        };
    }
  }, [quality]);

  return (
    <div className="tianyige-root">
      <header className="tianyige-header">
        <div className="header-left">
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
            antialias: quality !== "low",
            powerPreference: "high-performance",
            toneMapping: quality === "high" ? THREE.ACESFilmicToneMapping : THREE.ReinhardToneMapping,
            toneMappingExposure: lightingConfig.exposure,
          }}
        >
          <color attach="background" args={["#010005"]} />

          {/* 银河背景 */}
          <MilkyWayBackground />

          {/* ========== 光照系统 - 极致强化 ========== */}

          {/* 1. 环境光（极低，增强对比） */}
          <ambientLight intensity={lightingConfig.ambientIntensity} />

          {/* 2. 太阳主光源 - 超亮点光源 */}
          <pointLight
            position={[0, 0, 0]}
            intensity={lightingConfig.sunIntensity}
            distance={600}
            decay={1.0}
            color="#ffaa66"
            castShadow={lightingConfig.sunCastShadow}
            shadow-mapSize-width={quality === "high" ? 2048 : 1024}
            shadow-mapSize-height={quality === "high" ? 2048 : 1024}
            shadow-bias={-0.0001}
          />

          {/* 3. 主方向光 - 增强立体感（从右上方） */}
          <directionalLight
            position={[25, 35, 20]}
            intensity={lightingConfig.fillLightIntensity}
            color="#ffffff"
            castShadow={false}
          />

          {/* 4. 暖色背光 - 增强边缘光 */}
          <directionalLight
            position={[-20, -15, -25]}
            intensity={lightingConfig.backLightIntensity}
            color="#ffaa88"
          />

          {/* 5. 冷色侧补光 - 增加科幻感 */}
          {quality !== "low" && (
            <pointLight
              position={[40, 20, 30]}
              intensity={lightingConfig.coolFillIntensity}
              color="#4488ff"
            />
          )}

          {/* 6. 额外氛围光 - 模拟星空漫反射（仅高画质） */}
          {quality === "high" && (
            <hemisphereLight
              intensity={0.3}
              color="#ffffff"
              groundColor="#224466"
            />
          )}

          {/* 星空粒子 */}
          <StarField quality={quality} />

          {/* 行星 */}
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

          <CameraController selectedId={selectedId} globalPositionsRef={globalPositionsRef} resetTrigger={resetTrigger} />
        </Canvas>
      </main>

      {/* UI 覆盖层 */}
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
            <button className="details-close" onClick={() => setSelectedId(null)}><X size={16} /></button>
            <div className="details-header">
              <div className="details-color" style={{ backgroundColor: selectedPlanet.color }} />
              <div><h2>{selectedPlanet.name}</h2><span className="details-en">{selectedPlanet.englishName}</span></div>
            </div>
            <p className="details-desc">{selectedPlanet.description}</p>
            <div className="details-stats">
              <div className="stat-item"><span className="stat-label">质量</span><span className="stat-value">{selectedPlanet.mass || "计算中"}</span></div>
              <div className="stat-item"><span className="stat-label">表面温度</span><span className="stat-value">{selectedPlanet.temp || "计算中"}</span></div>
              <div className="stat-item"><span className="stat-label">公转周期</span><span className="stat-value">{selectedPlanet.orbitalPeriod || "计算中"}</span></div>
              <div className="stat-item"><span className="stat-label">自转周期</span><span className="stat-value">{selectedPlanet.rotationPeriod || "计算中"}</span></div>
            </div>
            <div className="details-footer">
              <Info size={12} /><span>天体跟踪锁定中</span>
              <button onClick={handleResetView} className="unlock-btn">解锁</button>
            </div>
          </div>
        </div>
      )}

      <div className="controls-hint">🖱️ 鼠标拖拽旋转视角 | 滚轮缩放 | 点击星球锁定追踪</div>
    </div>
  );
};

export default TianyiGe;