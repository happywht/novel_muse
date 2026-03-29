import React from 'react';
import { Users, GitBranch, AlertTriangle, Loader2, ArrowRight } from 'lucide-react';
import { useEchoChamber } from './EchoChamberContext';

/**
 * 图谱查询面板组件
 *
 * 职责：
 * - 关系时间线查询
 * - 未回收伏笔展示
 * - 矛盾检测
 */
export const EchoGraphPanel: React.FC = () => {
  const {
    project,
    selectedChar1Id,
    setSelectedChar1Id,
    selectedChar2Id,
    setSelectedChar2Id,
    relationshipTimeline,
    foreshadowingList,
    contradictions,
    isLoadingTimeline,
    isLoadingForeshadowing,
    isLoadingContradictions,
    loadRelationshipTimeline,
    loadForeshadowing,
    loadContradictions,
  } = useEchoChamber();

  return (
    <div className="border-b border-slate-800 bg-slate-950/20 p-4 space-y-4">
      {/* Relationship Timeline Section */}
      <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
        <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
          <Users size={16} className="text-muse-400" />
          关系时间线
        </h3>
        <div className="flex gap-2 mb-3">
          <select
            value={selectedChar1Id || ''}
            onChange={(e) => setSelectedChar1Id(e.target.value || null)}
            className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-300"
          >
            <option value="">选择角色1</option>
            {project.characters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            value={selectedChar2Id || ''}
            onChange={(e) => setSelectedChar2Id(e.target.value || null)}
            className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-300"
          >
            <option value="">选择角色2</option>
            {project.characters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button
            onClick={loadRelationshipTimeline}
            disabled={isLoadingTimeline || !selectedChar1Id || !selectedChar2Id}
            className="bg-muse-600 hover:bg-muse-500 disabled:bg-slate-700 text-white px-3 py-1.5 rounded text-xs font-bold transition-all"
          >
            {isLoadingTimeline ? <Loader2 size={12} className="animate-spin" /> : '查询'}
          </button>
        </div>

        {relationshipTimeline.length > 0 && (
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {relationshipTimeline.map((item, idx) => (
              <div
                key={idx}
                className="bg-slate-900/50 p-2 rounded border border-slate-800 text-xs"
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="text-muse-400 font-bold">{item.relation}</span>
                  <span className="text-slate-500">
                    {new Date(item.timestamp).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-slate-400">{item.description}</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        item.weight > 70
                          ? 'bg-rose-500'
                          : item.weight > 40
                            ? 'bg-amber-500'
                            : 'bg-blue-500'
                      }`}
                      style={{ width: `${item.weight}%` }}
                    />
                  </div>
                  <span
                    className={`text-[8px] px-1 rounded font-bold ${
                      item.trajectory === 'rising'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : item.trajectory === 'falling'
                          ? 'bg-rose-500/20 text-rose-400'
                          : 'bg-slate-700 text-slate-400'
                    }`}
                  >
                    {item.trajectory === 'rising'
                      ? '^ 上升'
                      : item.trajectory === 'falling'
                        ? 'v 下降'
                        : '- 稳定'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Foreshadowing Section */}
      <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <GitBranch size={16} className="text-amber-400" />
            未回收伏笔 ({foreshadowingList.length})
          </h3>
          <button
            onClick={loadForeshadowing}
            disabled={isLoadingForeshadowing}
            className="text-[10px] text-slate-400 hover:text-white"
          >
            {isLoadingForeshadowing ? <Loader2 size={12} className="animate-spin" /> : '刷新'}
          </button>
        </div>

        {foreshadowingList.length > 0 ? (
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {foreshadowingList.map((item, idx) => (
              <div
                key={idx}
                className="bg-amber-900/10 border border-amber-500/20 p-2 rounded text-xs"
              >
                <div className="flex items-center gap-1 text-amber-300 mb-1">
                  <span className="font-bold">{item.subject}</span>
                  <ArrowRight size={10} className="text-amber-500" />
                  <span className="text-amber-400">[{item.relation}]</span>
                  <ArrowRight size={10} className="text-amber-500" />
                  <span className="font-bold">{item.object}</span>
                </div>
                <div className="flex justify-between text-slate-500 text-[10px]">
                  <span>来源: {item.relatedChapter || '未知章节'}</span>
                  <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-500 text-center py-4">暂未发现未回收的伏笔</p>
        )}
      </div>

      {/* Contradiction Detection Section */}
      <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <AlertTriangle size={16} className="text-rose-400" />
            矛盾检测
          </h3>
          <button
            onClick={loadContradictions}
            disabled={isLoadingContradictions}
            className="bg-rose-600 hover:bg-rose-500 disabled:bg-slate-700 text-white px-3 py-1 rounded text-xs font-bold transition-all"
          >
            {isLoadingContradictions ? <Loader2 size={12} className="animate-spin" /> : '检测矛盾'}
          </button>
        </div>

        {contradictions.length > 0 && (
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {contradictions.map((item, idx) => (
              <div
                key={idx}
                className={`p-2 rounded border text-xs ${
                  item.severity === 'HIGH'
                    ? 'bg-rose-900/20 border-rose-500/50'
                    : item.severity === 'MEDIUM'
                      ? 'bg-amber-900/20 border-amber-500/50'
                      : 'bg-slate-900/20 border-slate-700/50'
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span
                    className={`font-bold ${
                      item.severity === 'HIGH'
                        ? 'text-rose-400'
                        : item.severity === 'MEDIUM'
                          ? 'text-amber-400'
                          : 'text-slate-400'
                    }`}
                  >
                    {item.severity === 'HIGH'
                      ? '严重'
                      : item.severity === 'MEDIUM'
                        ? '中等'
                        : '轻微'}
                  </span>
                  <span className="text-slate-500 text-[10px]">{item.type.replace(/_/g, ' ')}</span>
                </div>
                <p className="text-slate-300 mb-1">{item.description}</p>
                <div className="text-slate-500 text-[10px]">
                  涉及实体: {item.entities.join(', ')}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
