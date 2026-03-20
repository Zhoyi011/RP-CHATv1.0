import React from 'react';
import { type Persona } from '../../services/api';

interface Props {
  personas: Persona[];
  onSelect?: (persona: Persona) => void;
  selectedId?: string;
}

const PersonaList: React.FC<Props> = ({ personas, onSelect, selectedId }) => {
  const getStatusBadge = (status: string) => {
    const styles = {
      approved: 'bg-green-100 text-green-600',
      pending: 'bg-yellow-100 text-yellow-600',
      rejected: 'bg-red-100 text-red-600'
    };
    const texts = {
      approved: '已通过',
      pending: '审核中',
      rejected: '已拒绝'
    };
    return (
      <span className={`text-xs px-2 py-1 rounded-full ${styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-600'}`}>
        {texts[status as keyof typeof texts] || status}
      </span>
    );
  };

  if (personas.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        暂无角色
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {personas.map((persona) => (
        <div
          key={persona._id}
          onClick={() => onSelect?.(persona)}
          className={`bg-white rounded-lg shadow p-4 cursor-pointer transition ${
            selectedId === persona._id ? 'ring-2 ring-green-500' : 'hover:shadow-md'
          }`}
        >
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-medium">{persona.name}</h3>
            {getStatusBadge(persona.status)}
          </div>
          <p className="text-sm text-gray-600 mb-2 line-clamp-2">{persona.description}</p>
          <div className="flex flex-wrap gap-1">
            {persona.tags?.map((tag, index) => (
              <span key={index} className="text-xs text-gray-400">
                #{tag}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default PersonaList;
