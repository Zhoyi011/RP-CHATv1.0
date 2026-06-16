// client/src/pages/tianyige/components/SettingsPanel.tsx

import React from "react";
import { Monitor, Eye, EyeOff, Play, Pause, RefreshCw, Layers } from "lucide-react";

interface SettingsPanelProps {
  quality: "low" | "medium" | "high";
  setQuality: (q: "low" | "medium" | "high") => void;
  showOrbit: boolean;
  setShowOrbit: (show: boolean) => void;
  isPaused: boolean;
  setIsPaused: (paused: boolean) => void;
  onResetView: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  quality,
  setQuality,
  showOrbit,
  setShowOrbit,
  isPaused,
  setIsPaused,
  onResetView,
}) => {
  return (
    <div className="settings-panel">
      <div className="settings-header">
        <Layers className="settings-icon" />
        <span className="settings-title">控制面板</span>
      </div>

      <div className="settings-section">
        <label className="settings-label">
          <Monitor className="label-icon" />
          渲染画质
        </label>
        <div className="quality-buttons">
          {(["low", "medium", "high"] as const).map((q) => (
            <button
              key={q}
              onClick={() => setQuality(q)}
              className={`quality-btn ${quality === q ? "active" : ""}`}
            >
              {q === "low" ? "低" : q === "medium" ? "中" : "高"}
            </button>
          ))}
        </div>
      </div>

      <div className="settings-row">
        <span className="settings-label">星体公转轨道</span>
        <button
          onClick={() => setShowOrbit(!showOrbit)}
          className={`toggle-btn ${showOrbit ? "active" : ""}`}
        >
          {showOrbit ? (
            <>
              <Eye className="btn-icon" />
              <span>已显示</span>
            </>
          ) : (
            <>
              <EyeOff className="btn-icon" />
              <span>已隐藏</span>
            </>
          )}
        </button>
      </div>

      <div className="settings-row">
        <span className="settings-label">公转/自转</span>
        <button
          onClick={() => setIsPaused(!isPaused)}
          className={`toggle-btn ${!isPaused ? "active-green" : "active-amber"}`}
        >
          {isPaused ? (
            <>
              <Pause className="btn-icon" />
              <span>已暂停</span>
            </>
          ) : (
            <>
              <Play className="btn-icon" />
              <span>运动中</span>
            </>
          )}
        </button>
      </div>

      <button onClick={onResetView} className="reset-btn">
        <RefreshCw className="btn-icon" />
        <span>还原宇宙视角</span>
      </button>
    </div>
  );
};