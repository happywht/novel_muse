/**
 * Advanced Mode Tab
 * Mode switching between FREE and PREMIUM tiers
 */

import React, { useState, useEffect } from 'react';
import { Sparkles, Shield, Zap, Info } from 'lucide-react';
import { getUserTier, setUserTier, UserTier, FeatureFlags, DEFAULT_FEATURE_FLAGS } from '@/config/featureFlags';

export const AdvancedModeTab: React.FC = () => {
  const [tier, setTier] = useState<UserTier>('FREE');
  const [features, setFeatures] = useState<FeatureFlags>(DEFAULT_FEATURE_FLAGS.FREE);

  useEffect(() => {
    const currentTier = getUserTier();
    setTier(currentTier);
    setFeatures(DEFAULT_FEATURE_FLAGS[currentTier]);
  }, []);

  const handleTierChange = (newTier: UserTier) => {
    setTier(newTier);
    setUserTier(newTier);
    setFeatures(DEFAULT_FEATURE_FLAGS[newTier]);
  };

  return (
    <div className="space-y-6">
      {/* 模式选择 */}
      <div className="grid grid-cols-2 gap-4">
        {/* 普通版 */}
        <button
          onClick={() => handleTierChange('FREE')}
          className={`p-4 rounded-xl border-2 transition-all ${
            tier === 'FREE'
              ? 'border-green-500 bg-green-500/10'
              : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
          }`}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className={`p-2 rounded-lg ${tier === 'FREE' ? 'bg-green-500/20' : 'bg-slate-700'}`}>
              <Shield size={20} className={tier === 'FREE' ? 'text-green-400' : 'text-slate-400'} />
            </div>
            <div className="text-left">
              <h3 className="font-bold text-white">普通版</h3>
              <p className="text-xs text-slate-400">稳定、高效</p>
            </div>
          </div>
          <ul className="text-xs text-slate-400 space-y-1">
            <li>✓ 自动AI调用</li>
            <li>✓ 无额外确认弹窗</li>
            <li>✓ 最佳性能</li>
          </ul>
        </button>

        {/* 高级版 */}
        <button
          onClick={() => handleTierChange('PREMIUM')}
          className={`p-4 rounded-xl border-2 transition-all ${
            tier === 'PREMIUM'
              ? 'border-purple-500 bg-purple-500/10'
              : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
          }`}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className={`p-2 rounded-lg ${tier === 'PREMIUM' ? 'bg-purple-500/20' : 'bg-slate-700'}`}>
              <Sparkles size={20} className={tier === 'PREMIUM' ? 'text-purple-400' : 'text-slate-400'} />
            </div>
            <div className="text-left">
              <h3 className="font-bold text-white">高级版</h3>
              <p className="text-xs text-slate-400">完全控制</p>
            </div>
          </div>
          <ul className="text-xs text-slate-400 space-y-1">
            <li>✓ AI调用前确认</li>
            <li>✓ 完整Prompt编辑</li>
            <li>✓ 调用历史记录</li>
          </ul>
        </button>
      </div>

      {/* 功能状态 */}
      <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
        <h4 className="text-sm font-bold text-slate-300 mb-3 flex items-center gap-2">
          <Zap size={14} /> 当前功能状态
        </h4>
        <div className="space-y-2">
          {Object.entries(features).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between text-xs">
              <span className="text-slate-400">{key}</span>
              <span className={value ? 'text-green-400' : 'text-slate-500'}>
                {value ? '✓ 启用' : '○ 禁用'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 说明 */}
      <div className="p-3 bg-amber-900/20 border border-amber-500/20 rounded-lg flex items-start gap-2">
        <Info size={14} className="text-amber-400 mt-0.5 shrink-0" />
        <p className="text-xs text-amber-300/80">
          高级版功能仅供专业用户使用。在AI调用前会弹出确认对话框，让您查看和编辑完整的Prompt。
        </p>
      </div>
    </div>
  );
};
