import React from 'react';
import { SAMPLE_PRESETS, SamplePreset } from '../data/samplePresets';
import { Sparkles, ArrowRight } from 'lucide-react';

interface PresetSelectorProps {
  onSelect: (preset: SamplePreset) => void;
  selectedId: string | null;
}

export const PresetSelector: React.FC<PresetSelectorProps> = ({ onSelect, selectedId }) => {
  return (
    <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 mb-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          <span>추천 예시 생기부로 즉시 테스트해보기</span>
        </div>
        <span className="text-[11px] text-slate-400">클릭 시 자동 입력</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {SAMPLE_PRESETS.map((preset) => {
          const isSelected = selectedId === preset.id;
          return (
            <button
              key={preset.id}
              onClick={() => onSelect(preset)}
              type="button"
              className={`text-left p-2.5 rounded-lg border text-xs transition-all relative flex flex-col justify-between ${
                isSelected
                  ? 'bg-blue-50/90 border-blue-500 text-blue-900 shadow-xs ring-1 ring-blue-500/20'
                  : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50/80'
              }`}
            >
              <div>
                <span className="inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 mb-1">
                  {preset.badge}
                </span>
                <p className="font-semibold truncate text-[11px] leading-tight">
                  {preset.major}
                </p>
              </div>
              <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-400">
                <span className="truncate">{preset.name.split('(')[1]?.replace(')', '') || '세특 탐구'}</span>
                <ArrowRight className="w-2.5 h-2.5 opacity-60" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
