import React from 'react';

interface VoiceControlsProps {
  isMuted: boolean;
  onToggleMute: () => void;
  onLeave: () => void;
  isLoading?: boolean;
}

const VoiceControls: React.FC<VoiceControlsProps> = ({
  isMuted,
  onToggleMute,
  onLeave,
  isLoading = false
}) => {
  return (
    <div className="flex justify-center gap-4">
      <button
        onClick={onToggleMute}
        disabled={isLoading}
        className={`
          w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all duration-200
          ${isMuted 
            ? 'bg-red-500 hover:bg-red-600 text-white' 
            : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white'
          }
          ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          shadow-lg
        `}
        title={isMuted ? '取消静音' : '静音'}
      >
        {isMuted ? (
          <svg className="w-5 h-5 sm:w-7 sm:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
          </svg>
        ) : (
          <svg className="w-5 h-5 sm:w-7 sm:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        )}
      </button>
      
      <button
        onClick={onLeave}
        disabled={isLoading}
        className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-all duration-200 shadow-lg"
        title="离开语音房"
      >
        <svg className="w-5 h-5 sm:w-7 sm:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
};

export default VoiceControls;