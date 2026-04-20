/**
 * 增强的知识图谱可视化组件
 *
 * 功能：
 * - 力导向布局优化
 * - 节点拖拽和固定
 * - 缩放和平滑交互
 * - 节点分组和聚类
 * - 关系类型可视化
 */

import React, { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import { useProjectStore } from '@/store';
import * as d3 from 'd3';
import type { GraphNode, GraphEdge, LayoutType } from '@/types';

interface EnhancedGraphProps {
  width: number;
  height: number;
  layout?: LayoutType;
  enableGrouping?: boolean;
  showRelationshipTypes?: boolean;
  onNodeSelect?: (nodeId: string, node: GraphNode) => void;
  onNodeDoubleClick?: (nodeId: string, node: GraphNode) => void;
  onNodeDrag?: (nodeId: string, newPosition: { x: number; y: number }) => void;
  onZoom?: (scale: number) => void;
  onPan?: (position: { x: number; y: number }) => void;
}

export const EnhancedGraph: React.FC<EnhancedGraphProps> = ({
  width,
  height,
  layout = 'force',
  enableGrouping = false,
  showRelationshipTypes = true,
  onNodeSelect,
  onNodeDoubleClick,
  onNodeDrag,
  onZoom,
  onPan,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown>>();
  const simulationRef = useRef<d3.Simulation<any, undefined>>();
  const { project } = useProjectStore();

  // 图谱数据
  const graphData = useMemo(() => {
    const nodes: GraphNode[] = project.characters.map(char => ({
      id: char.id,
      label: char.name,
      type: 'Character',
      group: char.role,
      data: char,
    }));

    // 添加世界设置节点
    project.worldSettings.forEach(ws => {
      nodes.push({
        id: ws.id,
        label: ws.name,
        type: 'WorldSetting',
        group: 'world',
        data: ws,
      });
    });

    // 添加Echo节点
    project.echoes.forEach(echo => {
      nodes.push({
        id: echo.id,
        label: echo.title,
        type: 'Echo',
        group: 'echo',
        data: echo,
      });
    });

    // 构建边
    const edges: GraphEdge[] = [];

    // 角色关系
    project.characters.forEach(char => {
      char.relationships?.forEach(rel => {
        edges.push({
          source: char.id,
          target: rel.characterId,
          type: rel.type,
          label: rel.type,
          data: rel,
        });
      });
    });

    return { nodes, edges };
  }, [project]);

  // 缩放状态
  const [transform, setTransform] = useState({ k: 1, x: 0, y: 0 });
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // 初始化力导向布局
  const initForceSimulation = useCallback(() => {
    if (layout !== 'force') return;

    // 创建节点间链接
    const link = d3.link(graphData.nodes, graphData.edges);

    // 创建力导向模拟
    const simulation = d3.forceSimulation(graphData.nodes as any)
      .force('link', d3.forceLink(link as any)
        .id((d: any) => d.id)
        .distance(100)
        .strength(1))
      .force('charge', d3.forceManyBody()
        .strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide()
        .radius(30)
        .iterations(2))
      .force('x', d3.forceX(width / 2).strength(0.05))
      .force('y', d3.forceY(height / 2).strength(0.05));

    simulationRef.current = simulation;

    return simulation;
  }, [graphData, width, height, layout]);

  // 初始化缩放行为
  const initZoom = useCallback(() => {
    if (!svgRef.current) return;

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        const { transform } = event;
        setTransform({ k: transform.k, x: transform.x, y: transform.y });
        onZoom?.(transform.k);
      });

    zoomRef.current = zoom;
    d3.select(svgRef.current).call(zoom as any);

    return zoom;
  }, [onZoom]);

  // 初始化图谱
  useEffect(() => {
    const simulation = initForceSimulation();
    const zoom = initZoom();

    return () => {
      simulation?.stop();
    };
  }, [initForceSimulation, initZoom]);

  // 更新图谱布局
  useEffect(() => {
    if (layout === 'force' && simulationRef.current) {
      simulationRef.current.alpha(1).restart();
    }
  }, [graphData, layout]);

  // 节点拖拽处理
  const handleNodeDragStart = useCallback((event: React.D3SVGGElementEvent<SVGGElement, GraphNode>, d: GraphNode) => {
    if (layout !== 'force') return;

    // 停止固定节点的力
    if (!d.fx && !d.fy) {
      d.fx = d.x;
      d.fy = d.y;
    }

    simulationRef.current?.alphaTarget(0.3).restart();
  }, [layout]);

  const handleNodeDrag = useCallback((event: React.D3SVGGElementEvent<SVGGElement, GraphNode>, d: GraphNode) => {
    if (layout !== 'force') return;

    d.fx = event.x;
    d.fy = event.y;

    onNodeDrag?.(d.id, { x: d.fx, y: d.fy });
  }, [layout, onNodeDrag]);

  const handleNodeDragEnd = useCallback((event: React.D3SVGGElementEvent<SVGGElement, GraphNode>, d: GraphNode) => {
    if (layout !== 'force') return;

    // 如果节点原本就不固定，则释放
    if (!d.fx && !d.fy) {
      d.fx = null;
      d.fy = null;
    }

    simulationRef.current?.alphaTarget(0).restart();
  }, [layout]);

  // 节点点击处理
  const handleNodeClick = useCallback((event: React.MouseEvent, d: GraphNode) => {
    event.stopPropagation();
    setSelectedNode(d.id);
    onNodeSelect?.(d.id, d);
  }, [onNodeSelect]);

  // 节点双击处理
  const handleNodeDoubleClick = useCallback((event: React.MouseEvent, d: GraphNode) => {
    event.stopPropagation();
    onNodeDoubleClick?.(d.id, d);
  }, [onNodeDoubleClick]);

  // 获取节点颜色
  const getNodeColor = useCallback((node: GraphNode): string => {
    const colors: Record<string, string> = {
      Character: '#3b82f6',
      WorldSetting: '#10b981',
      Echo: '#f59e0b',
      Event: '#ef4444',
    };

    return colors[node.type] || '#6b7280';
  }, []);

  // 获取关系类型颜色
  const getEdgeColor = useCallback((edge: GraphEdge): string => {
    const colors: Record<string, string> = {
      enemy: '#ef4444',
      ally: '#10b981',
      family: '#3b82f6',
      master: '#8b5cf6',
      belongs_to: '#6b7280',
    };

    return colors[edge.type] || '#9ca3af';
  }, []);

  // 渲染图谱
  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      style={{ cursor: 'grab', background: '#f9fafb' }}
      data-testid="enhanced-knowledge-graph"
    >
      <g transform={`translate(${transform.x},${transform.y}) scale(${transform.k})`}>
        {/* 渲染边 */}
        {graphData.edges.map((edge, i) => (
          <g key={`edge-${i}`}>
            <line
              x1={(edge.source as GraphNode).x}
              y1={(edge.source as GraphNode).y}
              x2={(edge.target as GraphNode).x}
              y2={(edge.target as GraphNode).y}
              stroke={getEdgeColor(edge)}
              strokeWidth={2}
              opacity={selectedNode && edge.source !== selectedNode && edge.target !== selectedNode ? 0.2 : 1}
              strokeDasharray={edge.type === 'enemy' ? '5,5' : undefined}
              data-testid={`edge-${edge.source}-${edge.target}`}
            />
            {showRelationshipTypes && (
              <text
                x={((edge.source as GraphNode).x! + (edge.target as GraphNode).x!) / 2}
                y={((edge.source as GraphNode).y! + (edge.target as GraphNode).y!) / 2}
                fontSize={10}
                fill="#6b7280"
                textAnchor="middle"
                style={{ pointerEvents: 'none' }}
              >
                {edge.label}
              </text>
            )}
          </g>
        ))}

        {/* 渲染节点 */}
        {graphData.nodes.map((node) => (
          <g
            key={node.id}
            data-testid={`node-${node.id}`}
            transform={`translate(${node.x},${node.y})`}
            cursor="pointer"
            onClick={(e) => handleNodeClick(e as any, node)}
            onDoubleClick={(e) => handleNodeDoubleClick(e as any, node)}
            onMouseEnter={() => setHoveredNode(node.id)}
            onMouseLeave={() => setHoveredNode(null)}
            style={{
              opacity: selectedNode && selectedNode !== node.id ? 0.5 : 1,
            }}
          >
            {/* 节点圆圈 */}
            <circle
              r={node.type === 'Character' ? 20 : 15}
              fill={getNodeColor(node)}
              stroke={selectedNode === node.id ? '#000' : '#fff'}
              strokeWidth={selectedNode === node.id ? 3 : 2}
            />

            {/* 节点标签 */}
            <text
              y={30}
              fontSize={12}
              fill="#374151"
              textAnchor="middle"
              style={{ pointerEvents: 'none' }}
            >
              {node.label}
            </text>

            {/* 选中状态指示器 */}
            {selectedNode === node.id && (
              <circle
                r={25}
                fill="none"
                stroke="#3b82f6"
                strokeWidth={2}
                strokeDasharray="5,5"
              />
            )}

            {/* 悬停提示 */}
            {hoveredNode === node.id && (
              <g>
                <rect
                  x={-60}
                  y={-50}
                  width={120}
                  height={40}
                  fill="white"
                  stroke="#e5e7eb"
                  rx={4}
                />
                <text
                  y={-35}
                  fontSize={10}
                  fill="#6b7280"
                  textAnchor="middle"
                >
                  {node.type}
                </text>
                <text
                  y={-20}
                  fontSize={10}
                  fill="#6b7280"
                  textAnchor="middle"
                >
                  {node.group || ''}
                </text>
              </g>
            )}
          </g>
        ))}

        {/* 节点分组轮廓 */}
        {enableGrouping && (
          <g opacity={0.1}>
            {Object.entries(
              graphData.nodes.reduce((acc, node) => {
                if (!node.group) return acc;
                if (!acc[node.group]) acc[node.group] = [];
                acc[node.group].push(node);
                return acc;
              }, {} as Record<string, GraphNode[]>)
            ).map(([groupName, groupNodes]) => {
              if (groupNodes.length < 2) return null;

              // 计算组的边界
              const xs = groupNodes.map(n => n.x!);
              const ys = groupNodes.map(n => n.y!);
              const minX = Math.min(...xs) - 30;
              const maxX = Math.max(...xs) + 30;
              const minY = Math.min(...ys) - 30;
              const maxY = Math.max(...ys) + 30;

              return (
                <rect
                  key={groupName}
                  x={minX}
                  y={minY}
                  width={maxX - minX}
                  height={maxY - minY}
                  fill="none"
                  stroke="#9ca3af"
                  strokeWidth={2}
                  rx={10}
                />
              );
            })}
          </g>
        )}
      </g>

      {/* 控制面板 */}
      <g transform="translate(20, 20)">
        <rect
          width={150}
          height={100}
          fill="white"
          stroke="#e5e7eb"
          rx={8}
        />

        {/* 缩放控制 */}
        <g transform="translate(10, 20)">
          <circle
            r={15}
            fill="#3b82f6"
            cursor="pointer"
            onClick={() => {
              const newZoom = Math.min(transform.k * 1.2, 4);
              const zoom = zoomRef.current;
              if (zoom && svgRef.current) {
                d3.select(svgRef.current)
                  .transition()
                  .duration(300)
                  .call(zoom.scaleTo as any, newZoom);
              }
            }}
          />
          <text
            x={0}
            y={5}
            fontSize={16}
            fill="white"
            textAnchor="middle"
          >
            +
          </text>
        </g>

        <g transform="translate(80, 20)">
          <circle
            r={15}
            fill="#3b82f6"
            cursor="pointer"
            onClick={() => {
              const newZoom = Math.max(transform.k / 1.2, 0.1);
              const zoom = zoomRef.current;
              if (zoom && svgRef.current) {
                d3.select(svgRef.current)
                  .transition()
                  .duration(300)
                  .call(zoom.scaleTo as any, newZoom);
              }
            }}
          />
          <text
            x={0}
            y={5}
            fontSize={20}
            fill="white"
            textAnchor="middle"
          >
            -
          </text>
        </g>

        {/* 重置视图 */}
        <g transform="translate(125, 75)">
          <circle
            r={15}
            fill="#6b7280"
            cursor="pointer"
            onClick={() => {
              const zoom = zoomRef.current;
              if (zoom && svgRef.current) {
                d3.select(svgRef.current)
                  .transition()
                  .duration(300)
                  .call(zoom.transform as any, d3.zoomIdentity);
              }
            }}
          />
          <text
            x={0}
            y={5}
            fontSize={10}
            fill="white"
            textAnchor="middle"
          >
            ⟲
          </text>
        </g>
      </g>

      {/* 图例 */}
      <g transform={`translate(${width - 150}, 20)`}>
        <rect
          width={130}
          height={120}
          fill="white"
          stroke="#e5e7eb"
          rx={8}
        />
        <text x={65} y={20} fontSize={12} fontWeight="bold" textAnchor="middle">
          图例
        </text>

        {[
          { type: 'Character', label: '角色', color: '#3b82f6' },
          { type: 'WorldSetting', label: '世界设定', color: '#10b981' },
          { type: 'Echo', label: '伏笔', color: '#f59e0b' },
          { type: 'Event', label: '事件', color: '#ef4444' },
        ].map(({ type, label, color }, i) => (
          <g key={type} transform={`translate(15, ${35 + i * 20})`}>
            <circle r={6} fill={color} />
            <text x={15} y={4} fontSize={10} fill="#374151">
              {label}
            </text>
          </g>
        ))}
      </g>
    </svg>
  );
};
