/**
 * CharacterRelationshipGraph - 角色关系网络可视化组件
 *
 * 功能：
 * - 使用力导向图展示角色关系网络
 * - 支持节点点击、缩放、拖拽交互
 * - 按关系类型显示不同颜色
 * - 边的粗细表示关系强度
 * - 支持多维过滤
 */

import React, { useEffect, useRef, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import type { ForceGraphInstance } from 'force-graph';
import { Filter, Download, RefreshCw } from 'lucide-react';

// 关系类型颜色映射
const RELATION_COLORS = {
  ALLY_OF: '#22c55e',        // 绿色 - 盟友
  ENEMY_OF: '#ef4444',        // 红色 - 敌对
  LOVES: '#ec4899',           // 粉色 - 爱慕
  KIN_OF: '#3b82f6',          // 蓝色 - 亲属
  MENTORS: '#a855f7',         // 紫色 - 师徒
  RIVAL_OF: '#f97316',        // 橙色 - 竞争
  SERVES: '#6b7280',          // 灰色 - 效忠
  FRIEND_OF: '#06b6d4',       // 青色 - 朋友
  RELATED_TO: '#8b5cf6',      // 默认紫色 - 关联
};

// 角色阵营颜色映射（节点颜色）
const ALIGNMENT_COLORS = {
  '守序善良': '#22c55e',
  '中立善良': '#86efac',
  '混乱善良': '#bef264',
  '守序中立': '#3b82f6',
  '绝对中立': '#9ca3af',
  '混乱中立': '#06b6d4',
  '守序邪恶': '#ef4444',
  '中立邪恶': '#f97316',
  '混乱邪恶': '#ec4899',
};

interface NetworkNode {
  id: string;
  name: string;
  role: string;
  alignment?: string;
  archetype?: string;
  tags?: string[];
  desire?: string;
  fear?: string;
  val?: number; // 用于力导向图布局
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

interface NetworkEdge {
  source: string | NetworkNode;
  target: string | NetworkNode;
  type: string;
  weight?: number;
  trajectory?: string;
  isBidirectional?: boolean;
  description?: string;
}

interface CharacterRelationshipGraphProps {
  projectId: string;
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  onNodeClick?: (node: NetworkNode) => void;
  width?: number;
  height?: number;
  className?: string;
}

export const CharacterRelationshipGraph: React.FC<CharacterRelationshipGraphProps> = ({
  projectId,
  nodes,
  edges,
  onNodeClick,
  width = 800,
  height = 600,
  className = ''
}) => {
  const graphRef = useRef<ForceGraphInstance>();
  const [filteredNodes, setFilteredNodes] = useState<NetworkNode[]>(nodes);
  const [filteredEdges, setFilteredEdges] = useState<NetworkEdge[]>(edges);
  const [selectedNode, setSelectedNode] = useState<NetworkNode | null>(null);

  // 过滤条件状态
  const [filters, setFilters] = useState({
    relationTypes: [] as string[],
    minWeight: 0,
    alignments: [] as string[],
  });

  // 应用过滤
  useEffect(() => {
    let newNodes = [...nodes];
    let newEdges = [...edges];

    // 按阵营过滤节点
    if (filters.alignments.length > 0) {
      newNodes = newNodes.filter(n => n.alignment && filters.alignments.includes(n.alignment));
    }

    const nodeIds = new Set(newNodes.map(n => n.id));

    // 按关系类型过滤边
    if (filters.relationTypes.length > 0) {
      newEdges = newEdges.filter(e => filters.relationTypes.includes(e.type));
    }

    // 按最小权重过滤边
    if (filters.minWeight > 0) {
      newEdges = newEdges.filter(e => (e.weight || 0) >= filters.minWeight);
    }

    // 只保留连接到有效节点的边
    newEdges = newEdges.filter(e => {
      const sourceId = typeof e.source === 'string' ? e.source : e.source.id;
      const targetId = typeof e.target === 'string' ? e.target : e.target.id;
      return nodeIds.has(sourceId) && nodeIds.has(targetId);
    });

    setFilteredNodes(newNodes);
    setFilteredEdges(newEdges);
  }, [filters, nodes, edges]);

  // 处理节点点击
  const handleNodeClick = (node: any) => {
    setSelectedNode(node);
    onNodeClick?.(node);

    // 高亮相关节点
    const connectedNodeIds = new Set<string>();
    connectedNodeIds.add(node.id);

    filteredEdges.forEach((edge: any) => {
      const sourceId = typeof edge.source === 'string' ? edge.source : edge.source.id;
      const targetId = typeof edge.target === 'string' ? edge.target : edge.target.id;

      if (sourceId === node.id) {
        connectedNodeIds.add(targetId);
      } else if (targetId === node.id) {
        connectedNodeIds.add(sourceId);
      }
    });

    // 更新节点颜色
    graphRef.current?.graphData({
      nodes: filteredNodes.map(n => ({
        ...n,
        color: connectedNodeIds.has(n.id)
          ? (ALIGNMENT_COLORS[n.alignment as keyof typeof ALIGNMENT_COLORS] || '#8b5cf6')
          : '#374151',
      })),
      links: filteredEdges,
    });
  };

  // 重置视图
  const handleResetView = () => {
    graphRef.current?.zoomToFit(400, 50);
    setSelectedNode(null);
  };

  // 导出图片
  const handleExportImage = () => {
    graphRef.current?.downloadImage('character-relationship-graph.png');
  };

  // 切换关系类型过滤
  const toggleRelationType = (type: string) => {
    setFilters(prev => ({
      ...prev,
      relationTypes: prev.relationTypes.includes(type)
        ? prev.relationTypes.filter(t => t !== type)
        : [...prev.relationTypes, type],
    }));
  };

  // 切换阵营过滤
  const toggleAlignment = (alignment: string) => {
    setFilters(prev => ({
      ...prev,
      alignments: prev.alignments.includes(alignment)
        ? prev.alignments.filter(a => a !== alignment)
        : [...prev.alignments, alignment],
    }));
  };

  if (nodes.length === 0) {
    return (
      <div className="bg-slate-800/50 rounded-lg p-8 border border-slate-700/50 text-center">
        <p className="text-slate-500">暂无角色关系数据</p>
        <p className="text-xs text-slate-600 mt-2">请先为角色添加关系</p>
      </div>
    );
  }

  return (
    <div className={`bg-slate-900 rounded-lg overflow-hidden border border-slate-700 ${className}`}>
      {/* 工具栏 */}
      <div className="bg-slate-800 p-3 border-b border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-slate-300">角色关系网络</h3>
          <span className="text-xs text-slate-500">
            {filteredNodes.length} 节点 / {filteredEdges.length} 关系
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleResetView}
            className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
            title="重置视图"
          >
            <RefreshCw size={16} className="text-slate-300" />
          </button>
          <button
            onClick={handleExportImage}
            className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
            title="导出图片"
          >
            <Download size={16} className="text-slate-300" />
          </button>
        </div>
      </div>

      <div className="flex">
        {/* 过滤面板 */}
        <div className="w-48 bg-slate-800/50 border-r border-slate-700 p-3 overflow-y-auto">
          <div className="mb-4">
            <h4 className="text-xs font-bold text-slate-400 mb-2 flex items-center gap-1">
              <Filter size={12} />
              关系类型
            </h4>
            <div className="space-y-1">
              {Object.keys(RELATION_COLORS).map(type => (
                <label
                  key={type}
                  className="flex items-center gap-2 text-xs cursor-pointer hover:bg-slate-700/50 p-1 rounded"
                >
                  <input
                    type="checkbox"
                    checked={filters.relationTypes.includes(type)}
                    onChange={() => toggleRelationType(type)}
                    className="rounded"
                  />
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: RELATION_COLORS[type as keyof typeof RELATION_COLORS] }}
                  />
                  <span className="text-slate-300">{type}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <h4 className="text-xs font-bold text-slate-400 mb-2">最小权重</h4>
            <input
              type="range"
              min="0"
              max="100"
              value={filters.minWeight}
              onChange={(e) => setFilters(prev => ({ ...prev, minWeight: parseInt(e.target.value) }))}
              className="w-full"
            />
            <div className="text-xs text-slate-500 mt-1">{filters.minWeight}</div>
          </div>

          <div>
            <h4 className="text-xs font-bold text-slate-400 mb-2">道德阵营</h4>
            <div className="space-y-1">
              {Object.keys(ALIGNMENT_COLORS).map(alignment => (
                <label
                  key={alignment}
                  className="flex items-center gap-2 text-xs cursor-pointer hover:bg-slate-700/50 p-1 rounded"
                >
                  <input
                    type="checkbox"
                    checked={filters.alignments.includes(alignment)}
                    onChange={() => toggleAlignment(alignment)}
                    className="rounded"
                  />
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: ALIGNMENT_COLORS[alignment as keyof typeof ALIGNMENT_COLORS] }}
                  />
                  <span className="text-slate-300">{alignment}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* 图谱区域 */}
        <div className="flex-1" style={{ width: width - 192, height: height - 48 }}>
          <ForceGraph2D
            ref={graphRef as any}
            graphData={{
              nodes: filteredNodes,
              links: filteredEdges.map(e => ({
                ...e,
                source: typeof e.source === 'string' ? e.source : e.source.id,
                target: typeof e.target === 'string' ? e.target : e.target.id,
              })),
            }}
            nodeLabel={(node: any) => {
              const n = node as NetworkNode;
              return `
                <div class="bg-slate-800 rounded-lg p-3 border border-slate-700 shadow-lg">
                  <div class="font-bold text-slate-200">${n.name}</div>
                  <div class="text-xs text-slate-500">${n.role}</div>
                  ${n.alignment ? `<div class="text-xs text-slate-400 mt-1">阵营: ${n.alignment}</div>` : ''}
                  ${n.tags && n.tags.length > 0 ? `<div class="text-xs text-cyan-400 mt-1">${n.tags.join(', ')}</div>` : ''}
                </div>
              `;
            }}
            nodeColor={(node: any) => {
              const n = node as NetworkNode;
              return ALIGNMENT_COLORS[n.alignment as keyof typeof ALIGNMENT_COLORS] || '#8b5cf6';
            }}
            nodeVal={() => 20}
            linkColor={(link: any) => {
              const l = link as NetworkEdge;
              return RELATION_COLORS[l.type as keyof typeof RELATION_COLORS] || '#6b7280';
            }}
            linkWidth={(link: any) => {
              const l = link as NetworkEdge;
              return (l.weight || 50) / 20;
            }}
            linkDirectionalArrowLength={4}
            linkDirectionalArrowRelPos={1}
            onNodeClick={handleNodeClick}
            onNodeDragEnd={node => {
              node.fx = node.x;
              node.fy = node.y;
            }}
            width={width - 192}
            height={height - 48}
            backgroundColor="#0f172a"
            d3AlphaDecay={0.02}
            d3VelocityDecay={0.3}
            enableNodeDrag={true}
            enableZoomPanInteraction={true}
            enablePanInteraction={true}
          />
        </div>
      </div>

      {/* 选中节点信息面板 */}
      {selectedNode && (
        <div className="bg-slate-800/90 border-t border-slate-700 p-4">
          <h4 className="text-sm font-bold text-slate-300 mb-2">选中角色: {selectedNode.name}</h4>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-slate-500">角色:</span>
              <span className="text-slate-300 ml-2">{selectedNode.role}</span>
            </div>
            {selectedNode.alignment && (
              <div>
                <span className="text-slate-500">阵营:</span>
                <span className="text-slate-300 ml-2">{selectedNode.alignment}</span>
              </div>
            )}
            {selectedNode.archetype && (
              <div>
                <span className="text-slate-500">原型:</span>
                <span className="text-slate-300 ml-2">{selectedNode.archetype}</span>
              </div>
            )}
            {selectedNode.desire && (
              <div className="col-span-2">
                <span className="text-slate-500">欲望:</span>
                <span className="text-slate-300 ml-2">{selectedNode.desire}</span>
              </div>
            )}
            {selectedNode.fear && (
              <div className="col-span-2">
                <span className="text-slate-500">恐惧:</span>
                <span className="text-slate-300 ml-2">{selectedNode.fear}</span>
              </div>
            )}
            {selectedNode.tags && selectedNode.tags.length > 0 && (
              <div className="col-span-2 flex flex-wrap gap-1">
                {selectedNode.tags.map((tag, i) => (
                  <span key={i} className="px-2 py-0.5 bg-muse-600/20 text-muse-400 rounded text-xs">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
