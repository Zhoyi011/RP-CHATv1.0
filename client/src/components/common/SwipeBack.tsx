import React, { useState, type ReactNode } from 'react';
import { motion, type PanInfo } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

interface Props {
  children: ReactNode;
  onSwipeBack?: () => void;
  disabled?: boolean;
}

const SwipeBack: React.FC<Props> = ({ children, onSwipeBack, disabled = false }) => {
  const navigate = useNavigate();
  const [dragX, setDragX] = useState(0);

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (disabled) {
      setDragX(0);
      return;
    }
    
    // 如果向右滑动超过 100px，触发返回
    if (info.offset.x > 100) {
      if (onSwipeBack) {
        onSwipeBack();
      } else {
        navigate(-1);
      }
    }
    setDragX(0);
  };

  const handleDrag = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    // 只允许向右拖动，且不超过 200px
    if (info.offset.x > 0 && info.offset.x < 200) {
      setDragX(info.offset.x);
    }
  };

  return (
    <motion.div
      drag="x"
      dragConstraints={{ left: 0, right: 200 }}
      dragElastic={0.5}
      onDrag={handleDrag}
      onDragEnd={handleDragEnd}
      style={{ x: dragX }}
      className="min-h-full"
    >
      {/* 滑动时的阴影效果 */}
      {dragX > 0 && (
        <div 
          className="fixed inset-0 pointer-events-none z-50"
          style={{
            background: `linear-gradient(to right, rgba(0,0,0,${dragX / 200 * 0.3}), transparent)`
          }}
        />
      )}
      {children}
    </motion.div>
  );
};

export default SwipeBack;