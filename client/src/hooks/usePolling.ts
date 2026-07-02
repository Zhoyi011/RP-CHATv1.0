// client/src/hooks/usePolling.ts

import { useEffect, useRef, useCallback, useState } from 'react';
import { pollingService } from '../services/pollingService';

type PollingOptions = {
  id: string;                    // 唯一标识
  interval?: number;             // 自定义间隔
  enabled?: boolean;             // 是否启用
  onError?: (error: Error) => void;
};

export function usePolling<T>(
  fn: () => Promise<T>,
  onSuccess: (data: T) => void,
  options: PollingOptions
): { refresh: () => void; isRunning: boolean } {
  const { id, interval, enabled = true, onError } = options;
  const [isRunning, setIsRunning] = useState(false);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!enabled) {
      pollingService.unregister(id);
      return;
    }

    const wrappedOnSuccess = (data: T) => {
      if (isMounted.current) {
        onSuccess(data);
      }
    };

    const wrappedOnError = (error: Error) => {
      if (onError && isMounted.current) {
        onError(error);
      }
    };

    pollingService.register(
      id,
      fn,
      wrappedOnSuccess,
      wrappedOnError,
      interval
    );

    return () => {
      pollingService.unregister(id);
    };
  }, [id, fn, onSuccess, onError, interval, enabled]);

  const refresh = useCallback(() => {
    pollingService.refresh(id);
  }, [id]);

  // 获取运行状态
  useEffect(() => {
    const checkStatus = () => {
      const status = pollingService.getStatus(id);
      if (status) {
        setIsRunning(status.isRunning);
      }
    };
    
    const intervalId = setInterval(checkStatus, 1000);
    return () => clearInterval(intervalId);
  }, [id]);

  return { refresh, isRunning };
}