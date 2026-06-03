// client/src/components/chat/AudioRecorderButton.tsx
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { audioRecorder, type AudioRecording } from '../../services/audioRecorderService';

interface AudioRecorderButtonProps {
  onSendAudio: (audioBlob: Blob, duration: number) => Promise<void>;
  disabled?: boolean;
}

const MAX_DURATION = 60; // 最大60秒
const MIN_DURATION = 1;  // 最小1秒

const AudioRecorderButton: React.FC<AudioRecorderButtonProps> = ({ onSendAudio, disabled = false }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [showCancelPanel, setShowCancelPanel] = useState(false);
  const [isSending, setIsSending] = useState(false);
  
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startYRef = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 更新录音时长
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        const duration = audioRecorder.getDuration();
        setRecordingDuration(duration);
        
        // 达到最大时长自动停止
        if (duration >= MAX_DURATION) {
          stopRecordingAndSend();
        }
      }, 100);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRecording]);

  // 开始录音
  const startRecording = async () => {
    if (disabled || isRecording) return;
    
    try {
      await audioRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      setShowCancelPanel(false);
      // 震动反馈（移动端）
      if (window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate(50);
      }
    } catch (error) {
      console.error('录音失败:', error);
      alert('无法获取麦克风权限，请检查浏览器设置');
    }
  };

  // 停止录音并发送
  const stopRecordingAndSend = async () => {
    if (!isRecording) return;
    
    setIsRecording(false);
    setShowCancelPanel(false);
    
    try {
      const recording = await audioRecorder.stop();
      
      // 检查时长是否足够
      if (recording.duration < MIN_DURATION) {
        alert('录音时间太短，请至少录制1秒');
        URL.revokeObjectURL(recording.url);
        return;
      }
      
      setIsSending(true);
      await onSendAudio(recording.blob, recording.duration);
      URL.revokeObjectURL(recording.url);
    } catch (error) {
      console.error('停止录音失败:', error);
    } finally {
      setIsSending(false);
    }
  };

  // 取消录音
  const cancelRecording = () => {
    if (!isRecording) return;
    
    audioRecorder.cancel();
    setIsRecording(false);
    setRecordingDuration(0);
    setShowCancelPanel(false);
  };

  // 触摸/鼠标事件处理
  const handlePointerDown = (e: React.PointerEvent) => {
    if (disabled || isRecording || isSending) return;
    
    e.preventDefault();
    startYRef.current = e.clientY;
    
    longPressTimerRef.current = setTimeout(() => {
      startRecording();
      longPressTimerRef.current = null;
    }, 150); // 长按150ms开始录音
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isRecording) return;
    
    const deltaY = startYRef.current - e.clientY;
    // 向上滑动超过50px显示取消面板
    if (deltaY > 50 && !showCancelPanel) {
      setShowCancelPanel(true);
      if (window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate(30);
      }
    } else if (deltaY < 30 && showCancelPanel) {
      setShowCancelPanel(false);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    // 清除长按定时器
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    
    if (showCancelPanel) {
      cancelRecording();
    } else if (isRecording) {
      stopRecordingAndSend();
    }
  };

  const handlePointerLeave = () => {
    if (isRecording) {
      cancelRecording();
    }
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  // 格式化时长显示
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`;
  };

  if (!audioRecorder.isSupported()) {
    return null; // 不支持录音就不显示按钮
  }

  return (
    <div ref={containerRef} className="relative">
      {/* 录音状态指示器 */}
      <AnimatePresence>
        {isRecording && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-3 py-1.5 bg-red-500 text-white rounded-full text-xs font-medium flex items-center gap-2 whitespace-nowrap shadow-lg z-50"
          >
            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
            <span>录音中 {formatDuration(recordingDuration)}</span>
            <span className="text-[10px] opacity-80">
              {recordingDuration >= MAX_DURATION ? '即将发送' : '↑上滑取消'}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 上滑取消面板 */}
      <AnimatePresence>
        {showCancelPanel && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-medium flex items-center gap-2 shadow-lg z-50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            松手取消录音
          </motion.div>
        )}
      </AnimatePresence>

      {/* 录音按钮 */}
      <motion.button
        type="button"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        disabled={disabled || isSending}
        animate={isRecording ? { scale: 1.1 } : { scale: 1 }}
        whileHover={!disabled && !isRecording ? { scale: 1.05 } : {}}
        whileTap={!disabled && !isRecording ? { scale: 0.9 } : {}}
        className={`
          w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200
          ${isRecording 
            ? 'bg-red-500 text-white shadow-lg animate-pulse' 
            : disabled || isSending
              ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
              : 'text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30'
          }
        `}
        title={isSending ? '发送中...' : '长按录音'}
      >
        {isSending ? (
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : isRecording ? (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <rect x="8" y="5" width="8" height="14" rx="1" strokeWidth={2} />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        )}
      </motion.button>
    </div>
  );
};

export default AudioRecorderButton;