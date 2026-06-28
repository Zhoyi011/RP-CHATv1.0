// client/src/components/tianyige/TimeControls.tsx
import React, { useState } from 'react';
import { useTimeEngine } from '../../hooks/useTimeEngine';

interface TimeControlsProps {
  className?: string;
  onSpeedChange?: (speed: number) => void;
  onDateChange?: (date: Date) => void;
}

export const TimeControls: React.FC<TimeControlsProps> = ({
  className = '',
  onSpeedChange,
  onDateChange
}) => {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [customDate, setCustomDate] = useState<string>('');
  
  const timeEngine = useTimeEngine({
    initialSpeed: 1,
    minSpeed: 0.01,
    maxSpeed: 1000,
    onTimeChange: (date, speed) => {
      if (onSpeedChange) onSpeedChange(speed);
      if (onDateChange) onDateChange(date);
    }
  });

  const { state, controls, formatDate, formatSpeed } = timeEngine;

  const handleSpeedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const speed = parseFloat(e.target.value);
    controls.setSpeed(speed);
  };

  const handleCustomDateSubmit = () => {
    if (customDate) {
      try {
        const date = new Date(customDate);
        if (!isNaN(date.getTime())) {
          controls.jumpToDate(date);
          setShowDatePicker(false);
          setCustomDate('');
        }
      } catch (error) {
        console.error('Invalid date format:', error);
      }
    }
  };

  const presetDates = [
    { label: '现在', date: new Date() },
    { label: '2024年元旦', date: new Date('2024-01-01') },
    { label: '2023年夏至', date: new Date('2023-06-21') },
    { label: '2022年冬至', date: new Date('2022-12-22') },
    { label: '2000年千禧年', date: new Date('2000-01-01') },
    { label: '1969年登月', date: new Date('1969-07-20') }
  ];

  return (
    <div className={`time-controls ${className}`}>
      <div className="time-controls-header">
        <h3>时间控制</h3>
        <div className="time-display">
          <span className="current-date">{formatDate(state.currentDate)}</span>
          <span className="current-speed">{formatSpeed(state.speed)}</span>
        </div>
      </div>

      <div className="time-controls-main">
        {/* 播放控制 */}
        <div className="playback-controls">
          <button
            className={`play-pause-btn ${state.isPlaying ? 'playing' : 'paused'}`}
            onClick={state.isPlaying ? controls.pause : controls.play}
            title={state.isPlaying ? '暂停' : '播放'}
          >
            {state.isPlaying ? '⏸️' : '▶️'}
          </button>
          
          <button
            className={`direction-btn ${state.isReversed ? 'reversed' : 'normal'}`}
            onClick={controls.toggleDirection}
            title={state.isReversed ? '正向播放' : '反向播放'}
          >
            {state.isReversed ? '⏪' : '⏩'}
          </button>
          
          <button
            className="reset-btn"
            onClick={controls.reset}
            title="重置时间"
          >
            🔄
          </button>
        </div>

        {/* 速度控制 */}
        <div className="speed-controls">
          <div className="speed-header">
            <span>速度控制</span>
            <span className="speed-value">{state.speed.toFixed(2)}x</span>
          </div>
          
          <div className="speed-slider-container">
            <input
              type="range"
              min="0.01"
              max="1000"
              step="0.01"
              value={state.speed}
              onChange={handleSpeedChange}
              className="speed-slider"
            />
            <div className="speed-presets">
              <button onClick={() => controls.setSpeed(0.01)}>0.01x</button>
              <button onClick={() => controls.setSpeed(1)}>1x</button>
              <button onClick={() => controls.setSpeed(10)}>10x</button>
              <button onClick={() => controls.setSpeed(100)}>100x</button>
              <button onClick={() => controls.setSpeed(1000)}>1000x</button>
            </div>
          </div>
          
          <div className="speed-quick-controls">
            <button onClick={controls.decreaseSpeed} title="减速">➖</button>
            <button onClick={controls.increaseSpeed} title="加速">➕</button>
          </div>
        </div>

        {/* 日期跳转 */}
        <div className="date-jump-controls">
          <div className="date-jump-header">
            <span>日期跳转</span>
            <button
              className="date-picker-toggle"
              onClick={() => setShowDatePicker(!showDatePicker)}
            >
              {showDatePicker ? '收起' : '自定义日期'}
            </button>
          </div>
          
          {showDatePicker && (
            <div className="custom-date-picker">
              <input
                type="datetime-local"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                placeholder="选择日期和时间"
              />
              <button onClick={handleCustomDateSubmit}>跳转</button>
            </div>
          )}
          
          <div className="date-presets">
            {presetDates.map((preset, index) => (
              <button
                key={index}
                onClick={() => controls.jumpToDate(preset.date)}
                className="date-preset-btn"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        .time-controls {
          background: rgba(15, 23, 42, 0.92);
          backdrop-filter: blur(16px);
          border: 1px solid #1e293b;
          border-radius: 12px;
          padding: 16px;
          width: 320px;
          color: #e2e8f0;
          font-family: 'Segoe UI', system-ui, sans-serif;
        }

        .time-controls-header {
          margin-bottom: 16px;
          padding-bottom: 12px;
          border-bottom: 1px solid #334155;
        }

        .time-controls-header h3 {
          margin: 0 0 8px 0;
          font-size: 18px;
          font-weight: 600;
          color: #f8fafc;
        }

        .time-display {
          display: flex;
          flex-direction: column;
          gap: 4px;
          font-size: 13px;
        }

        .current-date {
          color: #94a3b8;
        }

        .current-speed {
          color: #60a5fa;
          font-weight: 500;
        }

        .time-controls-main {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .playback-controls {
          display: flex;
          gap: 12px;
          justify-content: center;
        }

        .playback-controls button {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          border: 1px solid #475569;
          background: rgba(30, 41, 59, 0.8);
          color: #e2e8f0;
          font-size: 18px;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .playback-controls button:hover {
          background: rgba(51, 65, 85, 0.8);
          border-color: #60a5fa;
          transform: scale(1.05);
        }

        .playback-controls button:active {
          transform: scale(0.95);
        }

        .play-pause-btn.playing {
          background: rgba(22, 163, 74, 0.2);
          border-color: #22c55e;
        }

        .play-pause-btn.paused {
          background: rgba(239, 68, 68, 0.2);
          border-color: #ef4444;
        }

        .direction-btn.reversed {
          background: rgba(249, 115, 22, 0.2);
          border-color: #f97316;
        }

        .direction-btn.normal {
          background: rgba(59, 130, 246, 0.2);
          border-color: #3b82f6;
        }

        .speed-controls {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .speed-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 14px;
          font-weight: 500;
        }

        .speed-value {
          color: #60a5fa;
          font-weight: 600;
        }

        .speed-slider-container {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .speed-slider {
          width: 100%;
          height: 6px;
          border-radius: 3px;
          background: linear-gradient(to right, #3b82f6, #8b5cf6);
          outline: none;
          -webkit-appearance: none;
        }

        .speed-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #f8fafc;
          border: 2px solid #3b82f6;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        }

        .speed-presets {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }

        .speed-presets button {
          padding: 4px 8px;
          border-radius: 6px;
          border: 1px solid #475569;
          background: rgba(30, 41, 59, 0.8);
          color: #94a3b8;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .speed-presets button:hover {
          background: rgba(51, 65, 85, 0.8);
          color: #e2e8f0;
          border-color: #60a5fa;
        }

        .speed-quick-controls {
          display: flex;
          gap: 12px;
          justify-content: center;
        }

        .speed-quick-controls button {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          border: 1px solid #475569;
          background: rgba(30, 41, 59, 0.8);
          color: #e2e8f0;
          font-size: 16px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .speed-quick-controls button:hover {
          background: rgba(51, 65, 85, 0.8);
          border-color: #60a5fa;
        }

        .date-jump-controls {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .date-jump-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 14px;
          font-weight: 500;
        }

        .date-picker-toggle {
          padding: 4px 8px;
          border-radius: 6px;
          border: 1px solid #475569;
          background: rgba(30, 41, 59, 0.8);
          color: #94a3b8;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .date-picker-toggle:hover {
          background: rgba(51, 65, 85, 0.8);
          color: #e2e8f0;
          border-color: #60a5fa;
        }

        .custom-date-picker {
          display: flex;
          gap: 8px;
        }

        .custom-date-picker input {
          flex: 1;
          padding: 8px;
          border-radius: 6px;
          border: 1px solid #475569;
          background: rgba(30, 41, 59, 0.8);
          color: #e2e8f0;
          font-size: 13px;
        }

        .custom-date-picker input:focus {
          outline: none;
          border-color: #60a5fa;
        }

        .custom-date-picker button {
          padding: 8px 12px;
          border-radius: 6px;
          border: 1px solid #475569;
          background: rgba(30, 41, 59, 0.8);
          color: #94a3b8;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .custom-date-picker button:hover {
          background: rgba(51, 65, 85, 0.8);
          color: #e2e8f0;
          border-color: #60a5fa;
        }

        .date-presets {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }

        .date-preset-btn {
          padding: 6px 10px;
          border-radius: 6px;
          border: 1px solid #475569;
          background: rgba(30, 41, 59, 0.8);
          color: #94a3b8;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .date-preset-btn:hover {
          background: rgba(51, 65, 85, 0.8);
          color: #e2e8f0;
          border-color: #60a5fa;
        }
      `}</style>
    </div>
  );
};