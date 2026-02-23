import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GitBranch, RefreshCw, ZoomIn, ZoomOut, Maximize2, Loader, AlertCircle } from 'lucide-react';
import { fetchGraph, GraphNode, GraphEdge } from '../services/apiService';

interface KnowledgeGraphProps {
    projectId: string;
    useBackend: boolean;
}

// Color palette for node types
const NODE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
    Character: { bg: '#8b5cf6', border: '#a78bfa', text: '#f5f3ff' },
    WorldSetting: { bg: '#3b82f6', border: '#60a5fa', text: '#eff6ff' },
    Event: { bg: '#f59e0b', border: '#fbbf24', text: '#fffbeb' },
    Echo: { bg: '#06b6d4', border: '#22d3ee', text: '#ecfeff' },
};

const REL_LABELS: Record<string, string> = {
    RELATED_TO: '关联',
    ENEMY_OF: '仇敌',
    LOVES: '爱慕',
    ALLY_OF: '盟友',
    MENTORS: '师徒',
    KIN_OF: '血缘',
    LOCATED_IN: '位于',
    INVOLVED_IN: '参与',
    HAS_ECHO: '回响',
    CAUSED: '导致',
};

interface SimNode extends GraphNode {
    x: number;
    y: number;
    vx: number;
    vy: number;
    radius: number;
}

export const KnowledgeGraph: React.FC<KnowledgeGraphProps> = ({ projectId, useBackend }) => {
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

    const loadGraph = useCallback(async () => {
        if (!useBackend) {
            setError('知识图谱需要后端服务 (MySQL + Neo4j) 运行中。');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const data = await fetchGraph(projectId);
            if (data.nodes.length === 0) {
                setError('图谱为空。请先创建角色、世界设定或时间线事件，保存后数据将自动同步到图数据库。');
                setLoading(false);
                return;
            }

            // Initialize sim nodes with random positions
            const width = containerRef.current?.clientWidth || 800;
            const height = containerRef.current?.clientHeight || 600;
            const cx = width / 2;
            const cy = height / 2;

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
    }, [loadGraph]);

    // Force simulation
    useEffect(() => {
        if (nodes.length === 0) return;

        const simulate = () => {
            const alpha = 0.3;
            const repulsion = 5000;
            const attraction = 0.005;
            const damping = 0.85;
            const centerGravity = 0.01;

            const width = containerRef.current?.clientWidth || 800;
            const height = containerRef.current?.clientHeight || 600;
            const cx = width / 2;
            const cy = height / 2;

            // Apply forces
            for (let i = 0; i < nodes.length; i++) {
                const a = nodes[i];
                if (dragNode.current && dragNode.current.id === a.id) continue;

                // Center gravity
                a.vx += (cx - a.x) * centerGravity;
                a.vy += (cy - a.y) * centerGravity;

                // Repulsion between all nodes
                for (let j = i + 1; j < nodes.length; j++) {
                    const b = nodes[j];
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
            for (const edge of edges) {
                const a = nodes.find(n => n.id === edge.source);
                const b = nodes.find(n => n.id === edge.target);
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

            // Update positions
            for (const node of nodes) {
                if (dragNode.current && dragNode.current.id === node.id) continue;
                node.vx *= damping;
                node.vy *= damping;
                node.x += node.vx;
                node.y += node.vy;
            }

            setNodes([...nodes]);
            animRef.current = requestAnimationFrame(simulate);
        };

        animRef.current = requestAnimationFrame(simulate);
        return () => cancelAnimationFrame(animRef.current);
    }, [nodes.length, edges.length]);

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
        for (const edge of edges) {
            const a = nodes.find(n => n.id === edge.source);
            const b = nodes.find(n => n.id === edge.target);
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
                const label = REL_LABELS[edge.type] || edge.type;
                ctx.font = '10px sans-serif';
                ctx.fillStyle = '#94a3b8';
                ctx.textAlign = 'center';
                ctx.fillText(label, mx, my - 5);
            }
        }

        // Draw nodes
        for (const node of nodes) {
            const colors = NODE_COLORS[node.type] || NODE_COLORS.Character;
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
            const typeLabels: Record<string, string> = { Character: '角色', WorldSetting: '设定', Event: '事件', Echo: '回响' };
            ctx.font = '8px sans-serif';
            ctx.fillStyle = colors.text + 'aa';
            ctx.fillText(typeLabels[node.type] || node.type, node.x, node.y + r + 12);
        }

        ctx.restore();
    }, [nodes, edges, selectedNode, hoveredNode, zoom, pan]);

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
        for (let i = nodes.length - 1; i >= 0; i--) {
            const n = nodes[i];
            const dx = mx - n.x;
            const dy = my - n.y;
            if (dx * dx + dy * dy < n.radius * n.radius) return n;
        }
        return null;
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        const pos = getMousePos(e);
        const node = findNodeAt(pos.x, pos.y);
        if (node) {
            dragNode.current = node;
            setSelectedNode(node);
        } else {
            isDragging.current = true;
            setSelectedNode(null);
        }
        lastMouse.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        const pos = getMousePos(e);

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

    const handleMouseUp = () => {
        dragNode.current = null;
        isDragging.current = false;
    };

    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        setZoom(prev => Math.max(0.3, Math.min(3, prev - e.deltaY * 0.001)));
    };

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
                        {nodes.length} 节点 · {edges.length} 关系
                    </span>
                </div>
                <div className="flex items-center gap-2">
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
                    onWheel={handleWheel}
                />
            </div>

            {/* Selected node info panel */}
            {selectedNode && (
                <div className="px-4 py-3 border-t border-slate-800 bg-slate-900/80">
                    <div className="flex items-center gap-2 mb-1">
                        <span
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: NODE_COLORS[selectedNode.type]?.bg || '#666' }}
                        />
                        <span className="font-bold text-white text-sm">{selectedNode.label}</span>
                        <span className="text-xs text-slate-500 px-1.5 py-0.5 bg-slate-800 rounded">
                            {selectedNode.type}
                        </span>
                    </div>
                    <div className="text-xs text-slate-400">
                        关系数: {edges.filter(e => e.source === selectedNode.id || e.target === selectedNode.id).length}
                        {selectedNode.properties?.role && <> · 角色: {selectedNode.properties.role}</>}
                        {selectedNode.properties?.category && <> · 分类: {selectedNode.properties.category}</>}
                    </div>
                </div>
            )}

            {/* Legend */}
            <div className="flex items-center gap-4 px-4 py-2 border-t border-slate-800 bg-slate-950/30">
                {Object.entries(NODE_COLORS).map(([type, colors]) => (
                    <div key={type} className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colors.bg }} />
                        <span className="text-[10px] text-slate-500">
                            {{ Character: '角色', WorldSetting: '设定', Event: '事件', Echo: '回响' }[type]}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};
