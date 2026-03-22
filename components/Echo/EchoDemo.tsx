/**
 * Echo系统渐进式确认UI组件 - 使用示例
 *
 * 这个文件展示如何使用新的EchoSummaryCard和EchoReviewPanel组件
 */

import React, { useState } from 'react';
import { Echo, Chapter, Character } from '../../types';
import { EchoSummaryCard, EchoReviewPanel, EchoDeepReview } from '../Echo';
import { useToast } from '../../hooks/useToast';

// 示例Echo数据（包含置信度和提取证据）
const sampleEchoes: Echo[] = [
  {
    id: '1',
    type: 'CHARACTER',
    targetId: 'char-001',
    targetName: '李明',
    description: '左臂在战斗中受重伤',
    reason: '与反派对决时被剑刺中',
    status: 'PENDING',
    timestamp: Date.now(),
    confidence: 0.92,
    extractionEvidence: '李明感到一阵剧痛，反派的剑已经刺穿了他的左臂，鲜血喷涌而出。'
  },
  {
    id: '2',
    type: 'CHARACTER',
    targetId: 'char-002',
    targetName: '王芳',
    description: '获得了神秘传承',
    reason: '在古老遗迹中接受了传承',
    status: 'PENDING',
    timestamp: Date.now(),
    confidence: 0.75,
    extractionEvidence: '一道金光笼罩了王芳，她感受到体内涌入了强大的力量，这是千年前的传承。'
  },
  {
    id: '3',
    type: 'WORLD',
    targetId: 'world-001',
    targetName: '青云宗',
    description: '宗门主殿被毁',
    reason: '受到魔族攻击',
    status: 'PENDING',
    timestamp: Date.now(),
    confidence: 0.45,
    extractionEvidence: '青云宗的主殿在魔族的攻击下轰然倒塌，但可能有修复的可能。'
  },
  {
    id: '4',
    type: 'CHARACTER',
    targetId: 'char-001',
    targetName: '李明',
    description: '与王芳结为盟友',
    reason: '共同对抗魔族',
    status: 'PENDING',
    timestamp: Date.now() - 3600000,
    confidence: 0.68,
    extractionEvidence: '李明与王芳对视一眼，默契地点了点头，决定携手对抗共同的敌人。',
    triples: [
      {
        subject: '李明',
        relation: '结盟',
        object: '王芳',
        weight: 80,
        trajectory: 'rising'
      }
    ]
  },
  {
    id: '5',
    type: 'CHARACTER',
    targetId: 'char-003',
    targetName: '张三',
    description: '获得上古宝剑',
    reason: '在秘境中寻得',
    status: 'ACCEPTED',
    timestamp: Date.now() - 7200000,
    confidence: 0.88,
    extractionEvidence: '张三握住那把散发着青光的宝剑，感受到了其中蕴含的强大剑意。'
  }
];

// 示例章节和角色数据
const sampleChapters: Chapter[] = [
  { id: 'ch-1', title: '第1章 - 初入江湖', content: '', order: 1, lastModified: Date.now() },
  { id: 'ch-2', title: '第2章 - 遭遇强敌', content: '', order: 2, lastModified: Date.now() },
  { id: 'ch-3', title: '第3章 - 传承觉醒', content: '', order: 3, lastModified: Date.now() }
];

const sampleCharacters: Character[] = [
  { id: 'char-001', name: '李明', role: 'Protagonist', archetype: '英雄', description: '年轻剑客' },
  { id: 'char-002', name: '王芳', role: 'Support', archetype: '智者', description: '神秘少女' },
  { id: 'char-003', name: '张三', role: 'Support', archetype: '战士', description: '豪爽侠客' }
];

export const EchoDemo: React.FC = () => {
  const { toast } = useToast();
  const [echoes, setEchoes] = useState<Echo[]>(sampleEchoes);
  const [showReviewPanel, setShowReviewPanel] = useState(false);
  const [showDeepReview, setShowDeepReview] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);

  const handleExtract = async () => {
    setIsExtracting(true);
    // 模拟提取过程
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsExtracting(false);
  };

  const handleAccept = (echo: Echo) => {
    console.log('采纳Echo:', echo);
    setEchoes(prev => prev.filter(e => e.id !== echo.id));
  };

  const handleReject = (echo: Echo) => {
    console.log('拒绝Echo:', echo);
    setEchoes(prev => prev.filter(e => e.id !== echo.id));
  };

  const handleSimulate = (targetName: string, description: string) => {
    console.log('蝴蝶效应预演:', { targetName, description });
    toast.info(`蝴蝶效应预演: ${targetName} - ${description}`);
  };

  const handleBatchAccept = (selectedEchoes: Echo[]) => {
    console.log('批量采纳:', selectedEchoes);
    const ids = new Set(selectedEchoes.map(e => e.id));
    setEchoes(prev => prev.filter(e => !ids.has(e.id)));
  };

  const handleBatchReject = (selectedEchoes: Echo[]) => {
    console.log('批量拒绝:', selectedEchoes);
    const ids = new Set(selectedEchoes.map(e => e.id));
    setEchoes(prev => prev.filter(e => !ids.has(e.id)));
  };

  const handleUpdate = (updatedEcho: Echo) => {
    console.log('更新Echo:', updatedEcho);
    setEchoes(prev => prev.map(e => e.id === updatedEcho.id ? updatedEcho : e));
  };

  return (
    <div className="min-h-screen bg-slate-950 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-6">
          Echo渐进式确认UI演示
        </h1>

        <div className="grid grid-cols-3 gap-6">
          {/* 左侧：EchoSummaryCard演示 */}
          <div className="col-span-2">
            <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
              <div className="p-4 border-b border-slate-800 bg-slate-950/50">
                <h2 className="text-lg font-bold text-white">
                  DraftingRoom集成示例
                </h2>
              </div>

              <div className="p-6">
                <div className="bg-slate-800/40 rounded-lg p-4 mb-4">
                  <p className="text-slate-300 text-sm">
                    这里是场景预览区域。当有生成内容时，下方会显示EchoSummaryCard。
                  </p>
                </div>

                <EchoSummaryCard
                  echoes={echoes}
                  isExtracting={isExtracting}
                  onExtract={handleExtract}
                  onAccept={handleAccept}
                  onReject={handleReject}
                  onSimulate={handleSimulate}
                  onViewAll={() => setShowReviewPanel(true)}
                />
              </div>
            </div>
          </div>

          {/* 右侧：EchoReviewPanel演示 */}
          <div className="col-span-1">
            <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden h-[600px]">
              <EchoReviewPanel
                echoes={echoes}
                chapters={sampleChapters}
                characters={sampleCharacters}
                onAccept={handleAccept}
                onReject={handleReject}
                onBatchAccept={handleBatchAccept}
                onBatchReject={handleBatchReject}
                onUpdate={handleUpdate}
                onSimulate={handleSimulate}
                onClose={() => setShowReviewPanel(false)}
                onOpenDeepReview={() => setShowDeepReview(true)}
              />
            </div>
          </div>
        </div>

        {/* 深度审核模式 */}
        <EchoDeepReview
          isOpen={showDeepReview}
          onClose={() => setShowDeepReview(false)}
          echoes={echoes}
          chapters={sampleChapters}
          characters={sampleCharacters}
          onAccept={handleAccept}
          onReject={handleReject}
          onBatchAccept={handleBatchAccept}
          onBatchReject={handleBatchReject}
          onUpdate={handleUpdate}
          onSimulate={handleSimulate}
        />

        {/* 统计信息 */}
        <div className="mt-6 bg-slate-900 rounded-xl border border-slate-800 p-4">
          <h3 className="text-sm font-bold text-white mb-3">当前Echo统计</h3>
          <div className="grid grid-cols-4 gap-4 text-xs">
            <div className="bg-emerald-900/20 border border-emerald-500/50 rounded-lg p-3">
              <div className="text-emerald-400 font-bold">高置信度</div>
              <div className="text-2xl font-bold text-white">
                {echoes.filter(e => (e.confidence || 0.7) >= 0.85).length}
              </div>
              <div className="text-slate-500">自动采纳</div>
            </div>
            <div className="bg-amber-900/20 border border-amber-500/50 rounded-lg p-3">
              <div className="text-amber-400 font-bold">待确认</div>
              <div className="text-2xl font-bold text-white">
                {echoes.filter(e => (e.confidence || 0.7) >= 0.5 && (e.confidence || 0.7) < 0.85).length}
              </div>
              <div className="text-slate-500">需人工审核</div>
            </div>
            <div className="bg-slate-900/20 border border-slate-700/50 rounded-lg p-3">
              <div className="text-slate-500 font-bold">低置信度</div>
              <div className="text-2xl font-bold text-white">
                {echoes.filter(e => (e.confidence || 0.7) < 0.5).length}
              </div>
              <div className="text-slate-600">已过滤</div>
            </div>
            <div className="bg-muse-900/20 border border-muse-500/50 rounded-lg p-3">
              <div className="text-muse-400 font-bold">总计</div>
              <div className="text-2xl font-bold text-white">{echoes.length}</div>
              <div className="text-slate-500">检测到的变更</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
