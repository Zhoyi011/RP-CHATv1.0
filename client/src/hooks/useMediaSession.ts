// client/src/hooks/useMediaSession.ts
import { useEffect, useRef, useCallback } from 'react';

interface MediaMetadata {
  title: string;
  artist: string;
  album?: string;
  artwork?: { src: string; sizes?: string; type?: string }[];
}

interface MediaSessionHandlers {
  onPlay?: () => void;
  onPause?: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  onSeek?: (time: number) => void;
  onSeekBackward?: () => void;
  onSeekForward?: () => void;
  onStop?: () => void;
}

export const useMediaSession = () => {
  const isSupported = typeof window !== 'undefined' && 'mediaSession' in navigator;
  const handlersRef = useRef<MediaSessionHandlers>({});

  // 设置媒体元数据（显示在锁屏/通知栏）
  const setMetadata = useCallback((metadata: MediaMetadata) => {
    if (!isSupported) return;
    
    navigator.mediaSession.metadata = new MediaMetadata({
      title: metadata.title,
      artist: metadata.artist,
      album: metadata.album,
      artwork: metadata.artwork || [
        { src: metadata.artwork?.[0]?.src || '', sizes: '96x96', type: 'image/png' },
      ],
    });
  }, [isSupported]);

  // 设置播放状态
  const setPlaybackState = useCallback((playing: boolean) => {
    if (!isSupported) return;
    navigator.mediaSession.playbackState = playing ? 'playing' : 'paused';
  }, [isSupported]);

  // 设置位置状态（进度条）
  const setPositionState = useCallback((position: number, duration: number, playbackRate = 1) => {
    if (!isSupported || !duration) return;
    navigator.mediaSession.setPositionState({
      duration: duration,
      position: position,
      playbackRate: playbackRate,
    });
  }, [isSupported]);

  // 注册控制处理
  const setupHandlers = useCallback((handlers: MediaSessionHandlers) => {
    if (!isSupported) return;
    
    handlersRef.current = handlers;
    
    if (handlers.onPlay) {
      navigator.mediaSession.setActionHandler('play', handlers.onPlay);
    }
    if (handlers.onPause) {
      navigator.mediaSession.setActionHandler('pause', handlers.onPause);
    }
    if (handlers.onNext) {
      navigator.mediaSession.setActionHandler('nexttrack', handlers.onNext);
    }
    if (handlers.onPrevious) {
      navigator.mediaSession.setActionHandler('previoustrack', handlers.onPrevious);
    }
    if (handlers.onStop) {
      navigator.mediaSession.setActionHandler('stop', handlers.onStop);
    }
    if (handlers.onSeek) {
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined) {
          handlers.onSeek?.(details.seekTime);
        }
      });
    }
    if (handlers.onSeekBackward) {
      navigator.mediaSession.setActionHandler('seekbackward', (details) => {
        handlers.onSeekBackward?.();
      });
    }
    if (handlers.onSeekForward) {
      navigator.mediaSession.setActionHandler('seekforward', (details) => {
        handlers.onSeekForward?.();
      });
    }
  }, [isSupported]);

  // 清除所有处理器
  const clearHandlers = useCallback(() => {
    if (!isSupported) return;
    
    navigator.mediaSession.setActionHandler('play', null);
    navigator.mediaSession.setActionHandler('pause', null);
    navigator.mediaSession.setActionHandler('nexttrack', null);
    navigator.mediaSession.setActionHandler('previoustrack', null);
    navigator.mediaSession.setActionHandler('stop', null);
    navigator.mediaSession.setActionHandler('seekto', null);
    navigator.mediaSession.setActionHandler('seekbackward', null);
    navigator.mediaSession.setActionHandler('seekforward', null);
  }, [isSupported]);

  // 启用媒体控制（在锁屏/通知栏显示）
  const enableMediaControl = useCallback(() => {
    if (!isSupported) return;
    navigator.mediaSession.playbackState = 'none';
  }, [isSupported]);

  return {
    isSupported,
    setMetadata,
    setPlaybackState,
    setPositionState,
    setupHandlers,
    clearHandlers,
    enableMediaControl,
  };
};