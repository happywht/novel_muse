import React from 'react';
import { Loader } from '../Loader';
import { useWorldBuilder } from './WorldBuilderContext';

/**
 * 世界观加载遮罩组件
 */
export const WorldLoadingOverlay: React.FC = () => {
  const { isGenerating, isExpanding } = useWorldBuilder();

  if (!isGenerating && !isExpanding) {
    return null;
  }

  return (
    <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-10">
      {isGenerating && (
        <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-10 rounded-xl">
          <Loader text="正在推演万象世界..." />
        </div>
      )}
      {isExpanding && <Loader text="正在挖掘历史..." />}
    </div>
  );
};

export default WorldLoadingOverlay;
