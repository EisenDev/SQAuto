import React from 'react';

export type DatabasePreset = 'postgresql' | 'mysql' | 'sqlite';

interface DatabasePresetSelectorProps {
  selectedPreset: DatabasePreset | null;
  onSelect: (preset: DatabasePreset) => void;
}

export default function DatabasePresetSelector({ selectedPreset, onSelect }: DatabasePresetSelectorProps) {
  const presets = [
    { id: 'postgresql', label: 'PostgreSQL', icon: '🐘' },
    { id: 'mysql', label: 'MySQL', icon: '🐬' },
    { id: 'sqlite', label: 'SQLite', icon: '🪶' },
  ] as const;

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {presets.map(preset => (
        <button
          key={preset.id}
          type="button"
          onClick={() => onSelect(preset.id)}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl border text-xs font-bold uppercase tracking-widest transition-all ${
            selectedPreset === preset.id
              ? 'bg-teal-50 border-teal-500 text-teal-800 shadow-sm'
              : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50 hover:border-teal-200 hover:text-teal-600'
          }`}
        >
          <span className="text-sm">{preset.icon}</span>
          <span>{preset.label}</span>
        </button>
      ))}
    </div>
  );
}
