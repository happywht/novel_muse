import React, { useState } from 'react';
import { Wand2, ChevronDown, Sparkles } from 'lucide-react';
import { STRUCTURE_TEMPLATES } from './constants';

interface TemplateSelectorProps {
  onSelect: (template: (typeof STRUCTURE_TEMPLATES)[0] | null) => void;
  isGenerating: boolean;
}

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({ onSelect, isGenerating }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (template: (typeof STRUCTURE_TEMPLATES)[0] | null) => {
    onSelect(template);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <div className="flex bg-muse-800 rounded-lg shadow-lg border border-muse-700 overflow-hidden divide-x divide-muse-700/50">
        <button
          onClick={() => handleSelect(null)}
          disabled={isGenerating}
          className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-muse-100 hover:bg-muse-700 transition-colors disabled:opacity-50"
          title="AI 全局推演 (不限定模板)"
        >
          <Wand2 size={16} /> 自由生成
        </button>
        <button
          onClick={() => setIsOpen(!isOpen)}
          disabled={isGenerating}
          className="px-2 hover:bg-muse-700 transition-colors text-muse-400 disabled:opacity-50"
        >
          <ChevronDown
            size={16}
            className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-2 z-50 animate-fade-in">
          <div className="text-[10px] font-bold text-slate-500 uppercase px-3 py-2 border-b border-slate-800 mb-2 flex items-center gap-2">
            <Sparkles size={12} className="text-muse-400" /> 选择叙事模板生成
          </div>
          <div className="space-y-1">
            <button
              onClick={() => handleSelect(null)}
              className="w-full text-left p-3 rounded-lg hover:bg-slate-800 transition-colors group"
            >
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded bg-slate-800 border border-slate-700 group-hover:bg-slate-700">
                  <Wand2 size={14} className="text-slate-400" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">完全自由发挥</div>
                  <div className="text-[10px] text-slate-500">不做结构限制，由 AI 自由创作。</div>
                </div>
              </div>
            </button>
            {STRUCTURE_TEMPLATES.map((t) => (
              <button
                key={t.id}
                onClick={() => handleSelect(t)}
                className="w-full text-left p-3 rounded-lg hover:bg-slate-800 transition-colors group"
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`p-1.5 rounded bg-slate-800 border border-slate-700 group-hover:bg-slate-700`}
                  >
                    <t.icon size={14} className={t.accentColor} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">{t.name}</div>
                    <div className="text-[10px] text-slate-500 line-clamp-1">{t.description}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
