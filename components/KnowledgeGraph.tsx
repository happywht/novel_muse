import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GitBranch, RefreshCw, ZoomIn, ZoomOut, Maximize2, Loader, AlertCircle } from 'lucide-react';
import { fetchGraph, GraphNode, GraphEdge } from '../services/apiService';
import { useToast } from '../hooks/useToast';
import { useAdvancedMode } from '../hooks/useAdvancedMode';
import {
    GRAPH_CONFIG,
    GRAPH_NODE_COLORS,
    GRAPH_NEW_EDGE_COLOR,
    GRAPH_LAYER_LABELS,
    GRAPH_RELATIONSHIP_LABELS
} from '../config/constants';

interface KnowledgeGraphProps {
    projectId: string;
    useBackend: boolean;
    projectData: any; // Add projectData
    updateProject: (data: any) => void; // Add updateProject
}


interface SimNode extends GraphNode {
    x: number;
    y: number;
    vx: number;
    vy: number;
    radius: number;
}

export const KnowledgeGraph: React.FC<KnowledgeGraphProps> = ({ projectId, useBackend, projectData, updateProject }) => {
    const { toast } = useToast();
    const { isAdvanced } = useAdvancedMode();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const animRef = useRef<number>(0);
    const [nodes, setNodes] = useState<SimNode[]>([]);
    const [edges, setEdges] = useState<GraphEdge[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [selectedNode, setSelectedNode] = useState<SimNode | null>(null);
    const [hoveredNode, setHoveredNode] = useState<SimNode | null>(null);
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const isDragging = useRef(false);
    const dragNode = useRef<SimNode | null>(null);
    const lastMouse = useRef({ x: 0, y: 0 });

    // Filtering Lenses - 默认启用所有图层
    const [activeLayers, setActiveLayers] = useState<string[]>([
        'Character', 
        'WorldSetting', 
        'Event', 
        'Echo', 
        'Chapter', 
        'PlotNode'
    ]);
    const [focusNodeId, setFocusNodeId] = useState<string | null>(null);
    const [fullStats, setFullStats] = useState({ nodes: 0, edges: 0 });

    const loadGraph = useCallback(async () => {
        if (!useBackend) {
            setError('知识图谱需要后端服务 (MySQL + Neo4j) 运行中。');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const data = await fetchGraph(projectId, activeLayers);
            if (data.nodes.length === 0) {
                setError('当前图层为空。请确保已选中有效图层，或先同步项目数据。');
                setNodes([]);
                setEdges([]);
                setLoading(false);
                return;
            }

            // Initialize sim nodes with random positions
            const width = containerRef.current?.clientWidth || 800;
            const height = containerRef.current?.clientHeight || 600;
            const cx = width / 2;
            const cy = height / 2;

            // 计算全量统计数据（不过滤）
            setFullStats({ nodes: data.nodes.length, edges: data.edges.length });

            const simNodes: SimNode[] = data.nodes.map((n, i) => ({
                ...n,
                x: cx + (Math.random() - 0.5) * 300,
                y: cy + (Math.random() - 0.5) * 300,
                vx: 0,
                vy: 0,
                radius: n.type === 'Character' ? 28 : n.type === 'Event' ? 20 : 24,
            }));

            setNodes(simNodes);
            setEdges(data.edges);
        } catch (err: any) {
            setError(err.message || '加载图谱失败');
        }
        setLoading(false);
    }, [projectId, useBackend]);

    useEffect(() => {
        loadGraph();
    }, [loadGraph, activeLayers]);

    // Graph filtering and Focus Mode
    const displayNodes = nodes.filter(n => {
        if (focusNodeId) {
            // Include center node and its 1-degree neighbors
            const isCenter = n.id === focusNodeId;
            const isNeighbor = edges.some(e =>
                (e.source === focusNodeId && e.target === n.id) ||
                (e.target === focusNodeId && e.source === n.id)
            );
            return isCenter || isNeighbor;
        }
        return true;
    });

    const displayEdges = edges.filter(e => {
        const sourceExists = displayNodes.some(n => n.id === e.source);
        const targetExists = displayNodes.some(n => n.id === e.target);
        return sourceExists && targetExists;
    });

    // Force simulation
    useEffect(() => {
        if (nodes.length === 0) return;

        const simulate = () => {
            const alpha = 0.1; // 降低力的强度，减少晃动
            const repulsion = 3000; // 降低排斥力
            const attraction = 0.002; // 降低吸引力
            const damping = 0.95; // 增加阻尼，更快稳定
            const centerGravity = 0.005; // 降低向心力
            const minVelocity = 0.01; // 最小速度阈值

            const width = containerRef.current?.clientWidth || 800;
            const height = containerRef.current?.clientHeight || 600;
            const cx = width / 2;
            const cy = height / 2;

            let hasSignificantMovement = false;

            // Apply forces
            for (let i = 0; i < displayNodes.length; i++) {
                const a = displayNodes[i];
                if (dragNode.current && dragNode.current.id === a.id) continue;

                // Center gravity
                a.vx += (cx - a.x) * centerGravity;
                a.vy += (cy - a.y) * centerGravity;

                // Repulsion between all nodes
                for (let j = i + 1; j < displayNodes.length; j++) {
                    const b = displayNodes[j];
                    let dx = a.x - b.x;
                    let dy = a.y - b.y;
                    let dist = Math.sqrt(dx * dx + dy * dy) || 1;
                    let force = repulsion / (dist * dist);
                    let fx = (dx / dist) * force;
                    let fy = (dy / dist) * force;

                    a.vx += fx * alpha;
                    a.vy += fy * alpha;
                    if (!(dragNode.current && dragNode.current.id === b.id)) {
                        b.vx -= fx * alpha;
                        b.vy -= fy * alpha;
                    }
                }
            }

            // Attraction along edges
            for (const edge of displayEdges) {
                const a = displayNodes.find(n => n.id === edge.source);
                const b = displayNodes.find(n => n.id === edge.target);
                if (!a || !b) continue;

                let dx = b.x - a.x;
                let dy = b.y - a.y;
                let dist = Math.sqrt(dx * dx + dy * dy) || 1;
                let force = (dist - 120) * attraction;

                if (!(dragNode.current && dragNode.current.id === a.id)) {
                    a.vx += (dx / dist) * force;
                    a.vy += (dy / dist) * force;
                }
                if (!(dragNode.current && dragNode.current.id === b.id)) {
                    b.vx -= (dx / dist) * force;
                    b.vy -= (dy / dist) * force;
                }
            }

            // Update positions and check for movement
            for (const node of displayNodes) {
                if (dragNode.current && dragNode.current.id === node.id) continue;
                node.vx *= damping;
                node.vy *= damping;
                
                // 如果速度大于阈值，则认为有显著移动
                if (Math.abs(node.vx) > minVelocity || Math.abs(node.vy) > minVelocity) {
                    hasSignificantMovement = true;
                }
                
                node.x += node.vx;
                node.y += node.vy;
            }

            // 只有存在显著移动时才更新状态，减少不必要的重渲染
            if (hasSignificantMovement) {
                setNodes([...nodes]);
            }
            
            animRef.current = requestAnimationFrame(simulate);
        };

        animRef.current = requestAnimationFrame(simulate);
        return () => cancelAnimationFrame(animRef.current);
    }, [nodes.length, displayNodes.length, displayEdges.length]);

    // Canvas rendering
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const width = containerRef.current?.clientWidth || 800;
        const height = containerRef.current?.clientHeight || 600;
        canvas.width = width * 2; // Retina
        canvas.height = height * 2;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        ctx.scale(2, 2);

        // Clear
        ctx.fillStyle = '#0b1222';
        ctx.fillRect(0, 0, width, height);

        ctx.save();
        ctx.translate(pan.x, pan.y);
        ctx.scale(zoom, zoom);

        // Draw edges
        for (const edge of displayEdges) {
            const a = displayNodes.find(n => n.id === edge.source);
            const b = displayNodes.find(n => n.id === edge.target);
            if (!a || !b) continue;

            const isHighlighted = selectedNode && (selectedNode.id === a.id || selectedNode.id === b.id);

            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = isHighlighted ? '#818cf8' : 'rgba(100, 116, 139, 0.3)';
            ctx.lineWidth = isHighlighted ? 2 : 1;
            ctx.stroke();

            // Edge label
            if (isHighlighted) {
                const mx = (a.x + b.x) / 2;
                const my = (a.y + b.y) / 2;
                const label = GRAPH_RELATIONSHIP_LABELS[edge.type] || edge.type;
                ctx.font = '10px sans-serif';
                ctx.fillStyle = '#94a3b8';
                ctx.textAlign = 'center';
                ctx.fillText(label, mx, my - 5);
            }
        }

        // Draw temporary edge while creating
        if (drawingEdgeFrom) {
            ctx.beginPath();
            ctx.moveTo(drawingEdgeFrom.x, drawingEdgeFrom.y);
            ctx.lineTo(currentMousePos.x, currentMousePos.y);
            ctx.strokeStyle = '#10b981'; // Green for new edge
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]); // Dashed line
            ctx.stroke();
            ctx.setLineDash([]); // Reset dash
        }

        // Draw nodes
        for (const node of displayNodes) {
            const colors = GRAPH_NODE_COLORS[node.type] || GRAPH_NODE_COLORS.Character;
            const isSelected = selectedNode?.id === node.id;
            const isHovered = hoveredNode?.id === node.id;
            const r = node.radius;

            // Glow effect
            if (isSelected || isHovered) {
                ctx.beginPath();
                ctx.arc(node.x, node.y, r + 8, 0, Math.PI * 2);
                const glow = ctx.createRadialGradient(node.x, node.y, r, node.x, node.y, r + 12);
                glow.addColorStop(0, colors.border + '40');
                glow.addColorStop(1, 'transparent');
                ctx.fillStyle = glow;
                ctx.fill();
            }

            // Node circle
            ctx.beginPath();
            ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
            ctx.fillStyle = colors.bg;
            ctx.fill();
            ctx.strokeStyle = isSelected ? '#fff' : colors.border;
            ctx.lineWidth = isSelected ? 2.5 : 1.5;
            ctx.stroke();

            // Node label
            ctx.font = `bold ${r > 24 ? 11 : 9}px sans-serif`;
            ctx.fillStyle = colors.text;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const label = (node.label || '').length > 8 ? (node.label || '').slice(0, 7) + '…' : node.label || '';
            ctx.fillText(label, node.x, node.y);

            // Type badge
            const typeLabels: Record<string, string> = { Character: '角色', WorldSetting: '设定', Event: '事件', Echo: '回响', Chapter: '章节' };
            ctx.font = '8px sans-serif';
            ctx.fillStyle = colors.text + 'aa';
            ctx.fillText(typeLabels[node.type] || node.type, node.x, node.y + r + 12);
        }

        ctx.restore();
    }, [displayNodes, displayEdges, selectedNode, hoveredNode, zoom, pan]);

    // Edge drawing state
    const [drawingEdgeFrom, setDrawingEdgeFrom] = useState<SimNode | null>(null);
    const [currentMousePos, setCurrentMousePos] = useState({ x: 0, y: 0 });
    const [edgeCreationDialog, setEdgeCreationDialog] = useState<{ source: SimNode, target: SimNode } | null>(null);

    // Mouse interaction
    const getMousePos = (e: React.MouseEvent): { x: number; y: number } => {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return { x: 0, y: 0 };
        return {
            x: (e.clientX - rect.left - pan.x) / zoom,
            y: (e.clientY - rect.top - pan.y) / zoom,
        };
    };

    const findNodeAt = (mx: number, my: number): SimNode | null => {
        // Search in displayNodes only
        for (let i = displayNodes.length - 1; i >= 0; i--) {
            const n = displayNodes[i];
            const dx = mx - n.x;
            const dy = my - n.y;
            if (dx * dx + dy * dy < n.radius * n.radius) return n;
        }
        return null;
    };

    const handleDoubleClick = (e: React.MouseEvent) => {
        // 聚光灯模式仅限高级模式
        if (!isAdvanced) return;

        const pos = getMousePos(e);
        const node = findNodeAt(pos.x, pos.y);

        if (node) {
            // Toggle Focus Mode
            setFocusNodeId(prev => prev === node.id ? null : node.id);
            setSelectedNode(node);
        } else {
            setFocusNodeId(null);
        }
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        const pos = getMousePos(e);
        const node = findNodeAt(pos.x, pos.y);

        if (node) {
            // Shift+拖拽创建边仅限高级模式
            if (isAdvanced && e.shiftKey) {
                // Start drawing an edge
                setDrawingEdgeFrom(node);
                setCurrentMousePos(pos);
            } else {
                // Normal drag
                dragNode.current = node;
                setSelectedNode(node);
            }
        } else {
            isDragging.current = true;
            setSelectedNode(null);
        }
        lastMouse.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        const pos = getMousePos(e);

        if (drawingEdgeFrom) {
            setCurrentMousePos(pos);
            return;
        }

        if (dragNode.current) {
            dragNode.current.x = pos.x;
            dragNode.current.y = pos.y;
            dragNode.current.vx = 0;
            dragNode.current.vy = 0;
            return;
        }

        if (isDragging.current) {
            setPan(prev => ({
                x: prev.x + e.clientX - lastMouse.current.x,
                y: prev.y + e.clientY - lastMouse.current.y,
            }));
            lastMouse.current = { x: e.clientX, y: e.clientY };
            return;
        }

        setHoveredNode(findNodeAt(pos.x, pos.y));
    };

    const handleMouseUp = (e: React.MouseEvent) => {
        if (drawingEdgeFrom) {
            const pos = getMousePos(e);
            const targetNode = findNodeAt(pos.x, pos.y);

            if (targetNode && targetNode.id !== drawingEdgeFrom.id) {
                // Open creation dialog
                setEdgeCreationDialog({ source: drawingEdgeFrom, target: targetNode });
            }
            setDrawingEdgeFrom(null);
        }
        dragNode.current = null;
        isDragging.current = false;
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const handleWheelNative = (e: WheelEvent) => {
            e.preventDefault();
            setZoom(prev => Math.max(0.3, Math.min(3, prev - e.deltaY * 0.001)));
        };

        canvas.addEventListener('wheel', handleWheelNative, { passive: false });
        return () => canvas.removeEventListener('wheel', handleWheelNative);
    }, []);

    const resetView = () => {
        setZoom(1);
        setPan({ x: 0, y: 0 });
        setSelectedNode(null);
    };

    // Empty state
    if (!useBackend) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-4 p-10">
                <GitBranch size={48} className="text-slate-700" />
                <h3 className="text-lg font-bold text-slate-400">星图引擎 · 知识图谱</h3>
                <p className="text-sm text-center max-w-md">
                    知识图谱功能需要后端服务运行中（MySQL + Neo4j）。<br />
                    请先启动 <code className="text-muse-400">cd server && npm run dev</code>
                </p>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col bg-[#0b1222] rounded-xl overflow-hidden border border-slate-800">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 bg-slate-900/50">
                <div className="flex items-center gap-2">
                    <GitBranch size={16} className="text-muse-400" />
                    <h3 className="text-sm font-bold text-white">星图引擎 · 知识图谱</h3>
                    <span className="text-xs text-slate-500">
                        {displayNodes.length}/{fullStats.nodes} 节点 · {displayEdges.length}/{fullStats.edges} 关系
                    </span>
                </div>
                <div className="flex items-center gap-4">
                    {/* 高级模式：图层过滤器 */}
                    {isAdvanced && (
                        <>
                            <div className="flex items-center gap-1.5 bg-slate-950/50 px-2 py-1 rounded border border-slate-700/50">
                                {Object.entries(GRAPH_LAYER_LABELS).map(([key, label]) => (
                                    <label key={key} className="flex items-center gap-1.5 cursor-pointer px-1.5 hover:bg-slate-800 rounded transition-colors group">
                                        <input
                                            type="checkbox"
                                            checked={activeLayers.includes(key)}
                                            onChange={(e) => {
                                                if (e.target.checked) setActiveLayers(prev => [...prev, key]);
                                                else setActiveLayers(prev => prev.filter(l => l !== key));
                                            }}
                                            className="w-3 h-3 rounded border-slate-700 text-muse-500 focus:ring-muse-500 bg-slate-900"
                                        />
                                        <span className={`text-[10px] font-bold ${activeLayers.includes(key) ? 'text-slate-200' : 'text-slate-500 group-hover:text-slate-400'}`}>
                                            {label}
                                        </span>
                                    </label>
                                ))}
                            </div>
                            <div className="h-4 w-[1px] bg-slate-800" />
                        </>
                    )}
                    <button onClick={() => setZoom(z => Math.min(3, z + 0.2))} className="p-1 text-slate-400 hover:text-white" title="放大">
                        <ZoomIn size={16} />
                    </button>
                    <button onClick={() => setZoom(z => Math.max(0.3, z - 0.2))} className="p-1 text-slate-400 hover:text-white" title="缩小">
                        <ZoomOut size={16} />
                    </button>
                    <button onClick={resetView} className="p-1 text-slate-400 hover:text-white" title="重置视图">
                        <Maximize2 size={16} />
                    </button>
                    <button onClick={loadGraph} className="p-1 text-slate-400 hover:text-white" title="刷新图谱" disabled={loading}>
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* 高级模式：聚光灯模式提示 */}
            {isAdvanced && focusNodeId && (
                <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-muse-600/90 backdrop-blur-md text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-xl border border-muse-400/30 z-20 flex items-center gap-2 animate-bounce-subtle">
                    <span>已开启聚光灯模式 (双击空白处取消)</span>
                    <button onClick={() => setFocusNodeId(null)} className="hover:bg-white/20 rounded-full p-0.5"><Maximize2 size={12} /></button>
                </div>
            )}

            {/* Canvas area */}
            <div ref={containerRef} className="flex-1 relative">
                {loading && (
                    <div className="absolute inset-0 bg-black/50 z-10 flex items-center justify-center">
                        <Loader className="animate-spin text-muse-400" size={32} />
                    </div>
                )}
                {error && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 gap-3 z-10">
                        <AlertCircle size={32} className="text-amber-500/60" />
                        <p className="text-sm max-w-sm text-center">{error}</p>
                        <button onClick={loadGraph} className="text-xs text-muse-400 hover:text-muse-300">
                            重新加载
                        </button>
                    </div>
                )}
                <canvas
                    ref={canvasRef}
                    className="w-full h-full cursor-grab active:cursor-grabbing"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onDoubleClick={handleDoubleClick}
                />
            </div>

            {/* Legend (Moved to bottom left absolute) */}
            <div className="absolute bottom-4 left-4 flex flex-col gap-2 p-3 bg-slate-900/80 backdrop-blur-sm border border-slate-700/50 rounded-lg pointer-events-none z-10 transition-opacity">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 border-b border-slate-800 pb-1">图例 · 图层</div>
                {Object.entries(GRAPH_NODE_COLORS).map(([type, colors]) => (
                    <div key={type} className={`flex items-center gap-2 transition-opacity ${activeLayers.includes(type) ? 'opacity-100' : 'opacity-30'}`}>
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colors.bg, border: `1px solid ${colors.border}` }} />
                        <span className="text-[11px] text-slate-300 font-medium tracking-wide">
                            {GRAPH_LAYER_LABELS[type] || type}
                        </span>
                    </div>
                ))}
            </div>

            {/* Edge Creation Dialog */}
            {edgeCreationDialog && (
                <div className="absolute inset-0 bg-black/60 z-30 flex items-center justify-center">
                    <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 shadow-2xl w-96 max-w-[90%] animate-fade-in-up">
                        <h3 className="text-lg font-bold text-white mb-4">建立新关联网</h3>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="flex-1 text-center bg-slate-800 rounded py-2 px-3">
                                <span className="text-xs text-slate-500 block mb-1">{edgeCreationDialog.source.type}</span>
                                <span className="text-sm font-bold text-slate-200">{edgeCreationDialog.source.label}</span>
                            </div>
                            <div className="text-slate-500">→</div>
                            <div className="flex-1 text-center bg-slate-800 rounded py-2 px-3">
                                <span className="text-xs text-slate-500 block mb-1">{edgeCreationDialog.target.type}</span>
                                <span className="text-sm font-bold text-slate-200">{edgeCreationDialog.target.label}</span>
                            </div>
                        </div>

                        <div className="mb-6">
                            <label className="block text-xs font-bold text-slate-500 mb-2">关系类型</label>
                            <select
                                id="edgeTypeSelect"
                                className="w-full bg-slate-950 border border-slate-700 rounded p-2.5 text-sm text-white focus:border-muse-500 outline-none"
                            >
                                {Object.entries(GRAPH_RELATIONSHIP_LABELS).map(([k, v]) => (
                                    <option key={k} value={k}>{v} ({k})</option>
                                ))}
                                <option value="CUSTOM">自定义...</option>
                            </select>
                        </div>

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setEdgeCreationDialog(null)}
                                className="px-4 py-2 rounded text-sm font-medium text-slate-400 hover:text-white transition-colors"
                            >
                                取消
                            </button>
                            <button
                                onClick={async () => {
                                    const select = document.getElementById('edgeTypeSelect') as HTMLSelectElement;
                                    const relType = select.value;

                                    try {
                                        // Dynamic import of apiService
                                        const { createEdgeApi } = await import('../services/apiService');
                                        await createEdgeApi(projectId, edgeCreationDialog.source.id, edgeCreationDialog.target.id, relType);

                                        // Optimistically update local UI graph
                                        const newEdge: GraphEdge = {
                                            source: edgeCreationDialog.source.id,
                                            target: edgeCreationDialog.target.id,
                                            type: relType,
                                            properties: {}
                                        };
                                        setEdges(prev => [...prev, newEdge]);
                                        setEdgeCreationDialog(null);
                                    } catch (e) {
                                        console.error("Failed to create edge", e);
                                        toast.error("创建关系失败，请检查后端运行状态。");
                                    }
                                }}
                                className="px-5 py-2 rounded text-sm font-bold bg-muse-600 hover:bg-muse-500 text-white shadow-lg transition-colors"
                            >
                                确认创建
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- Embedded NodeEditSidebar Component ---

interface NodeEditSidebarProps {
    node: SimNode;
    projectId: string;
    onClose: () => void;
    projectData: any; // Requires project state passed down
    updateProject: (data: any) => void;
}

const NodeEditSidebar: React.FC<NodeEditSidebarProps> = ({ node, projectId, onClose, projectData, updateProject }) => {
    const { toast } = useToast();
    const [isEditing, setIsEditing] = useState(false);
    const [title, setTitle] = useState(node.label || '');
    const [description, setDescription] = useState(node.properties?.description || node.properties?.content || '');
    const [isSaving, setIsSaving] = useState(false);

    // Reset when node changes
    useEffect(() => {
        setTitle(node.label || '');
        setDescription(node.properties?.description || node.properties?.content || '');
        setIsEditing(false);
    }, [node]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Update local state based on node type
            let updatedData = { ...projectData };

            if (node.type === 'Character') {
                updatedData.characters = projectData.characters.map((c: any) =>
                    c.id === node.id ? { ...c, name: title, description: description } : c
                );
            } else if (node.type === 'WorldSetting') {
                updatedData.worldSettings = projectData.worldSettings.map((w: any) =>
                    w.id === node.id ? { ...w, title: title, content: description } : w
                );
            } else if (node.type === 'Chapter') {
                updatedData.chapters = projectData.chapters.map((c: any) =>
                    c.id === node.id ? { ...c, title: title, summary: description } : c
                );
            } else if (node.type === 'PlotNode') {
                updatedData.plotNodes = projectData.plotNodes.map((pn: any) =>
                    pn.id === node.id ? { ...pn, title: title, description: description } : pn
                );
            } else if (node.type === 'Event') {
                updatedData.timeline = projectData.timeline.map((e: any) =>
                    e.id === node.id ? { ...e, title: title, description: description } : e
                );
            } else if (node.type === 'Echo') {
                // Echo是AI生成的建议，不应直接编辑
                toast.warning('Echo节点为AI生成的建议，不可直接编辑');
                setIsSaving(false);
                return;
            }

            // 1. Update React Local State
            updateProject(updatedData);

            // 2. Trigger async background sync to backend (and Neo4j graph)
            const { syncProject } = await import('../services/apiService');
            await syncProject(updatedData);

            setIsEditing(false);

        } catch (e) {
            console.error("Failed to save node:", e);
            toast.error("保存失败");
        } finally {
            setIsSaving(false);
        }
    };

    const colors = GRAPH_NODE_COLORS[node.type] || GRAPH_NODE_COLORS.Character;

    return (
        <div className="flex flex-col h-full bg-slate-900 text-slate-300">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-800/50">
                <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full shadow-lg" style={{ backgroundColor: colors.bg, border: `1px solid ${colors.border}` }} />
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{node.type}</span>
                </div>
                <button onClick={onClose} className="p-1 text-slate-500 hover:text-white rounded-md hover:bg-slate-700 transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 p-5 overflow-y-auto custom-scrollbar">
                {isEditing ? (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">标识 (Name/Title)</label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-white focus:border-muse-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">详情 (Description/Content/Summary)</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={8}
                                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-white focus:border-muse-500 outline-none resize-none custom-scrollbar"
                            />
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-2xl font-serif font-bold text-white mb-2 leading-tight">{title}</h2>
                            {node.properties?.role && <div className="text-xs font-medium text-muse-400 mb-4 bg-muse-400/10 inline-block px-2 py-1 rounded border border-muse-400/20">{node.properties.role}</div>}
                            {node.properties?.category && <div className="text-xs font-medium text-muse-400 mb-4 bg-muse-400/10 inline-block px-2 py-1 rounded border border-muse-400/20">{node.properties.category}</div>}
                            {node.properties?.type && <div className="text-xs font-medium text-muse-400 mb-4 bg-muse-400/10 inline-block px-2 py-1 rounded border border-muse-400/20">{node.properties.type}</div>}
                            {node.properties?.status && <div className="text-xs font-medium text-muse-400 mb-4 bg-muse-400/10 inline-block px-2 py-1 rounded border border-muse-400/20">{node.properties.status}</div>}
                            {node.properties?.order !== undefined && <div className="text-xs font-medium text-muse-400 mb-4 bg-muse-400/10 inline-block px-2 py-1 rounded border border-muse-400/20">排序: {node.properties.order}</div>}
                        </div>

                        <div>
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 border-b border-slate-800 pb-1">详细描述</h4>
                            <p className="text-sm font-serif leading-relaxed text-slate-400 whitespace-pre-wrap">{description || "暂无描述"}</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer / Actions */}
            <div className="p-4 border-t border-slate-800 bg-slate-800/30 flex justify-end gap-2">
                {node.type !== 'Echo' && ( // Echo节点不可编辑
                    isEditing ? (
                        <>
                            <button onClick={() => setIsEditing(false)} disabled={isSaving} className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white transition-colors">取消</button>
                            <button onClick={handleSave} disabled={isSaving} className="px-4 py-2 text-xs font-bold bg-muse-600 hover:bg-muse-500 text-white rounded shadow-lg flex items-center gap-2">
                                {isSaving ? <Loader size={12} className="animate-spin" /> : null}
                                保存变更
                            </button>
                        </>
                    ) : (
                        <button onClick={() => setIsEditing(true)} className="px-4 py-2 text-xs font-bold bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors w-full">
                            ✏️ 编辑节点
                        </button>
                    )
                )}
            </div>
        </div>
    );
};
