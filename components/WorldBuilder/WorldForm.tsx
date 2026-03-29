import React from 'react';
import { Globe, Plus, BookPlus } from 'lucide-react';
import { useWorldBuilder } from './WorldBuilderContext';

/**
 * 世界观空状态表单组件
 * 当没有选中条目且没有草稿时显示
 */
export const WorldForm: React.FC = () => {
  const { handleManualAdd, setActiveItemId } = useWorldBuilder();

  return (
    <div className="flex flex-col items-center justify-center h-full text-slate-600 space-y-4">
      <Globe size={64} className="opacity-20" />
      <p>选择或生成一个设定条目以查看详情。</p>
      <div className="flex gap-4 mt-4">
        <button
          onClick={handleManualAdd}
          className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-all flex items-center gap-2"
        >
          <BookPlus size={18} /> 手动创建
        </button>
        <button
          onClick={() => setActiveItemId(null)}
          className="px-6 py-2 bg-muse-900/40 hover:bg-muse-800/50 text-muse-400 rounded-xl border border-muse-500/30 transition-all flex items-center gap-2"
        >
          <Plus size={18} /> AI 灵感
        </button>
      </div>
    </div>
  );
};

export default WorldForm;
