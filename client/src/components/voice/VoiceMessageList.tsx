import React from 'react';
import type { VoiceMessage } from '../../types/voice';

interface VoiceMessageListProps {
  messages: VoiceMessage[];
  currentUserId: string;
}

const VoiceMessageList: React.FC<VoiceMessageListProps> = ({ messages, currentUserId }) => {
  if (messages.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-xs text-gray-500">暂无消息</p>
      </div>
    );
  }

  return (
    <>
      {messages.map(msg => {
        if (msg.type === 'system') {
          return (
            <div key={msg._id} className="flex justify-center">
              <span className="text-xs text-gray-500 bg-white/5 px-3 py-1 rounded-full">
                {msg.content}
              </span>
            </div>
          );
        }
        
        const isSelf = msg.userId === currentUserId;
        
        return (
          <div key={msg._id} className={`flex ${isSelf ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] ${isSelf ? 'items-end' : ''}`}>
              {!isSelf && (
                <p className="text-xs text-gray-400 mb-1 ml-1">{msg.personaName}</p>
              )}
              <div className={`px-3 py-2 rounded-2xl ${
                isSelf 
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-tr-none' 
                  : 'bg-white/10 text-white rounded-tl-none'
              }`}>
                <p className="text-sm break-words whitespace-pre-wrap">{msg.content}</p>
              </div>
              <p className="text-xs text-gray-500 mt-1 ml-1">
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        );
      })}
    </>
  );
};

export default VoiceMessageList;