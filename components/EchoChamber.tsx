import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { ProjectState, Character, WorldSetting, Echo } from '../types';
import { Sidebar, X, Activity, Clock, User, Globe, Sparkles, Filter, Zap, PlayCircle, Brain } from 'lucide-react';
import { deduceWorldConsequences, consolidateMemory } from '../services/geminiService';
import { Loader } from './Loader';

interface EchoChamberProps {
  project: ProjectState;
  updateProject: (data: Partial<ProjectState>) => void;
}

interface Node extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  type: 'CHARACTER' | 'WORLD';
  group: number;
  radius: number;
  echoCount: number;
  originalData: Character | WorldSetting;
}

interface Link extends d3.SimulationLinkDatum<Node> {
  source: string | Node;
  target: string | Node;
  value: number;
}

export const EchoChamber: React.FC<EchoChamberProps> = ({ project, updateProject }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [isSvgMounted, setIsSvgMounted] = useState(false);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [filterType, setFilterType] = useState<'ALL' | 'CHARACTER' | 'WORLD'>('ALL');
  const [isDeducing, setIsDeducing] = useState(false);
  const [isConsolidating, setIsConsolidating] = useState(false); // NEW: State for consolidation
  
  // Prepare data for D3
  const nodes: Node[] = [
    ...project.characters.map(c => ({
      id: c.id,
      name: c.name,
      type: 'CHARACTER' as const,
      group: 1,
      // Count only active echoes for visual weight
      radius: 20 + (project.echoes.filter(e => e.targetId === c.id && e.status === 'ACCEPTED').length * 5), 
      echoCount: project.echoes.filter(e => e.targetId === c.id && e.status === 'ACCEPTED').length,
      originalData: c
    })),
    ...project.worldSettings.map(w => ({
      id: w.id,
      name: w.title,
      type: 'WORLD' as const,
      group: 2,
      radius: 15 + (project.echoes.filter(e => e.targetId === w.id && e.status === 'ACCEPTED').length * 4),
      echoCount: project.echoes.filter(e => e.targetId === w.id && e.status === 'ACCEPTED').length,
      originalData: w
    }))
  ];

  // Create links based on shared echoes or mentions
  // This is a simple heuristic: if an echo mentions another entity name, link them
  const links: Link[] = [];
  
  // 1. Explicit Relationships (from character.relationships text - simple parsing)
  project.characters.forEach(source => {
      project.characters.forEach(target => {
          if (source.id !== target.id && source.relationships?.includes(target.name)) {
              links.push({ source: source.id, target: target.id, value: 1 });
          }
      });
  });

  // 2. Implicit Echo Links (if an echo for Entity A mentions Entity B)
  project.echoes.forEach(echo => {
      const sourceId = echo.targetId;
      // Check if description mentions any other entity
      nodes.forEach(targetNode => {
          if (sourceId !== targetNode.id && echo.description.includes(targetNode.name)) {
              links.push({ source: sourceId, target: targetNode.id, value: 2 });
          }
      });
  });

  useEffect(() => {
    if (!svgRef.current) return;

    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    // Clear previous
    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current)
      .attr("viewBox", [0, 0, width, height])
      .style("font", "12px sans-serif");

    // Filter nodes based on selection
    const activeNodes = filterType === 'ALL' ? nodes : nodes.filter(n => n.type === filterType);
    const activeLinks = links.filter(l => 
        activeNodes.find(n => n.id === (typeof l.source === 'object' ? l.source.id : l.source)) && 
        activeNodes.find(n => n.id === (typeof l.target === 'object' ? l.target.id : l.target))
    );

    const simulation = d3.forceSimulation(activeNodes)
      .force("link", d3.forceLink(activeLinks).id((d: any) => d.id).distance(150))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide().radius((d: any) => d.radius + 10).iterations(2));

    // Draw Links
    const link = svg.append("g")
      .attr("stroke", "#334155")
      .attr("stroke-opacity", 0.6)
      .selectAll("line")
      .data(activeLinks)
      .join("line")
      .attr("stroke-width", d => Math.sqrt(d.value));

    // Draw Nodes
    const node = svg.append("g")
      .selectAll("g")
      .data(activeNodes)
      .join("g")
      .call(d3.drag<any, any>()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended));

    // Node Circles (Outer Glow for high echo count)
    node.append("circle")
      .attr("r", d => d.radius + (d.echoCount > 0 ? 4 : 0))
      .attr("fill", "none")
      .attr("stroke", d => d.type === 'CHARACTER' ? "#818cf8" : "#34d399")
      .attr("stroke-width", d => d.echoCount > 0 ? 2 : 0)
      .attr("opacity", 0.5)
      .attr("class", d => d.echoCount > 0 ? "animate-pulse" : "");

    // Node Circles (Main Body)
    node.append("circle")
      .attr("r", d => d.radius)
      .attr("fill", d => d.type === 'CHARACTER' ? "#4f46e5" : "#059669")
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)
      .style("cursor", "pointer")
      .on("click", (event, d) => {
          event.stopPropagation();
          setSelectedNode(d);
      });

    // Icons inside nodes
    node.append("text")
        .attr("text-anchor", "middle")
        .attr("dy", ".35em")
        .attr("fill", "white")
        .style("font-size", d => Math.min(d.radius, 16) + "px")
        .style("pointer-events", "none")
        .text(d => d.type === 'CHARACTER' ? "👤" : "🌍");

    // Labels
    node.append("text")
      .attr("x", 0)
      .attr("y", d => d.radius + 15)
      .attr("text-anchor", "middle")
      .text(d => d.name)
      .clone(true).lower()
      .attr("fill", "none")
      .attr("stroke", "#0f172a")
      .attr("stroke-width", 3);

    node.append("text")
      .attr("x", 0)
      .attr("y", d => d.radius + 15)
      .attr("text-anchor", "middle")
      .attr("fill", "#e2e8f0")
      .text(d => d.name);

    simulation.on("tick", () => {
      link
        .attr("x1", d => (d.source as any).x)
        .attr("y1", d => (d.source as any).y)
        .attr("x2", d => (d.target as any).x)
        .attr("y2", d => (d.target as any).y);

      node
        .attr("transform", d => `translate(${d.x},${d.y})`);
    });

    function dragstarted(event: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    function dragged(event: any) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    function dragended(event: any) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }

    return () => {
      simulation.stop();
    };
  }, [project, filterType, isSvgMounted]);

  // Get echoes for selected node (Active + Archived for display)
  const nodeEchoes = selectedNode 
    ? project.echoes.filter(e => e.targetId === selectedNode.id).sort((a, b) => b.timestamp - a.timestamp)
    : [];
  
  // Filter for consolidation candidates (only ACCEPTED ones)
  const consolidationCandidates = nodeEchoes.filter(e => e.status === 'ACCEPTED');

  const handleConsolidateMemory = async () => {
      if (!selectedNode || consolidationCandidates.length === 0) return;
      setIsConsolidating(true);
      try {
          const currentDesc = selectedNode.type === 'CHARACTER' 
              ? (selectedNode.originalData as Character).description 
              : (selectedNode.originalData as WorldSetting).content;

          const newDesc = await consolidateMemory(
              selectedNode.name,
              selectedNode.type,
              currentDesc,
              consolidationCandidates
          );

          // 1. Update the entity description
          let updatedCharacters = [...project.characters];
          let updatedWorldSettings = [...project.worldSettings];

          if (selectedNode.type === 'CHARACTER') {
              updatedCharacters = updatedCharacters.map(c => 
                  c.id === selectedNode.id ? { ...c, description: newDesc } : c
              );
          } else {
              updatedWorldSettings = updatedWorldSettings.map(w => 
                  w.id === selectedNode.id ? { ...w, content: newDesc } : w
              );
          }

          // 2. Archive the consolidated echoes
          const updatedEchoes = project.echoes.map(e => 
              consolidationCandidates.find(c => c.id === e.id) 
                  ? { ...e, status: 'ARCHIVED' as const } 
                  : e
          );

          updateProject({
              characters: updatedCharacters,
              worldSettings: updatedWorldSettings,
              echoes: updatedEchoes
          });

          // Update local selected node data to reflect change immediately
          if (selectedNode.type === 'CHARACTER') {
             setSelectedNode({ ...selectedNode, originalData: { ...(selectedNode.originalData as Character), description: newDesc } });
          } else {
             setSelectedNode({ ...selectedNode, originalData: { ...(selectedNode.originalData as WorldSetting), content: newDesc } });
          }

          alert("记忆固化完成！短期记忆已转化为长期档案。");

      } catch (e) {
          console.error(e);
          alert("记忆固化失败");
      } finally {
          setIsConsolidating(false);
      }
  };

  // ... (handleDeduceFuture remains same)

  return (
    <div className="flex h-[calc(100vh-140px)] gap-6 relative animate-fade-in">
      {/* Left: Main Visualization Area */}
      <div className="flex-1 bg-slate-900 rounded-xl border border-slate-800 flex flex-col overflow-hidden relative">
        {/* Top Control Bar */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/50 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-serif font-bold text-white flex items-center gap-2">
              <Activity size={20} className="text-muse-400" />
              命运星图
            </h2>
            <div className="flex items-center gap-2 bg-slate-800/50 p-1 rounded-lg border border-slate-700/50">
              <button
                onClick={() => setFilterType('ALL')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  filterType === 'ALL' ? 'bg-muse-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                全部
              </button>
              <button
                onClick={() => setFilterType('CHARACTER')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  filterType === 'CHARACTER' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <User size={12} className="inline mr-1" />
                角色
              </button>
              <button
                onClick={() => setFilterType('WORLD')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  filterType === 'WORLD' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <Globe size={12} className="inline mr-1" />
                世界
              </button>
            </div>
          </div>
          <div className="text-xs text-slate-500 flex items-center gap-4">
            <span>{nodes.length} 节点</span>
            <span>{links.length} 连接</span>
          </div>
        </div>

        {/* SVG Visualization Area */}
        <div className="flex-1 relative bg-gradient-to-br from-slate-900 to-slate-950">
          {nodes.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-600 p-6 text-center">
              <Globe size={64} className="opacity-10 mb-4" />
              <h3 className="text-lg font-serif font-bold text-slate-500 mb-2">虚空宇宙</h3>
              <p className="text-sm text-slate-600">
                尚无实体存在于这个世界。<br/>
                请先前往<span className="text-muse-400">灵魂熔炉</span>创建角色，<br/>
                或前往<span className="text-muse-400">万象织机</span>构建世界设定。
              </p>
            </div>
          ) : (
            <svg
              ref={(node) => {
                svgRef.current = node;
                if (node && !isSvgMounted) {
                  setIsSvgMounted(true);
                }
              }}
              className="w-full h-full"
              style={{ cursor: 'grab' }}
            />
          )}
        </div>

        {/* Legend */}
        {nodes.length > 0 && (
          <div className="absolute bottom-4 left-4 bg-slate-900/90 backdrop-blur-sm p-3 rounded-lg border border-slate-700/50 text-xs space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-indigo-500"></div>
              <span className="text-slate-400">角色节点</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
              <span className="text-slate-400">世界节点</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-px bg-slate-600"></div>
              <span className="text-slate-400">关系连接</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-muse-400 shadow-[0_0_8px_rgba(168,85,247,0.8)]"></div>
              <span className="text-slate-400">活跃回响</span>
            </div>
          </div>
        )}
      </div>

      {/* Right Sidebar: Echo Chronicle */}
      <div className={`w-1/3 bg-slate-900 rounded-xl border border-slate-800 flex flex-col overflow-hidden transition-all duration-500 ${selectedNode ? 'translate-x-0 opacity-100' : 'translate-x-10 opacity-50 pointer-events-none'}`}>
          {selectedNode ? (
              <>
                <div className="p-6 border-b border-slate-800 bg-slate-950/50">
                    {/* ... (Header remains same) */}
                    <div className="flex justify-between items-start mb-2">
                        <div className={`text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wider ${selectedNode.type === 'CHARACTER' ? 'bg-indigo-900/50 text-indigo-300' : 'bg-emerald-900/50 text-emerald-300'}`}>
                            {selectedNode.type === 'CHARACTER' ? 'Character Soul' : 'World Anchor'}
                        </div>
                        <button onClick={() => setSelectedNode(null)} className="text-slate-500 hover:text-white transition-colors">
                            <X size={18} />
                        </button>
                    </div>
                    <h2 className="text-2xl font-serif font-bold text-white mb-1">{selectedNode.name}</h2>
                    <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-4 text-xs text-slate-500">
                            <span className="flex items-center gap-1"><Activity size={12}/> 活跃记忆: {consolidationCandidates.length}</span>
                        </div>
                        
                        {/* Consolidation Button */}
                        {consolidationCandidates.length >= 3 && (
                            <button 
                                onClick={handleConsolidateMemory}
                                disabled={isConsolidating}
                                className="text-xs bg-amber-600 hover:bg-amber-500 text-white px-3 py-1.5 rounded-full flex items-center gap-1 shadow-lg shadow-amber-500/20 transition-all animate-pulse"
                            >
                                {isConsolidating ? <Loader size="sm" /> : <><Brain size={12} /> 记忆固化 (Consolidate)</>}
                            </button>
                        )}
                    </div>
                </div>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 relative">
                    {/* Timeline Line */}
                    <div className="absolute left-9 top-6 bottom-6 w-px bg-slate-800"></div>

                    <div className="space-y-8 relative">
                        {/* Initial State (Long Term Memory) */}
                        <div className="relative pl-8 group">
                            <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center z-10 group-hover:border-white transition-colors">
                                <Sparkles size={12} className="text-slate-400 group-hover:text-white" />
                            </div>
                            <div className="bg-slate-800/30 p-4 rounded-lg border border-slate-700/50 group-hover:bg-slate-800/50 transition-colors">
                                <h4 className="text-sm font-bold text-slate-300 mb-2">长期记忆 (Long-Term Memory)</h4>
                                <p className="text-xs text-slate-400 leading-relaxed whitespace-pre-wrap">
                                    {selectedNode.type === 'CHARACTER' 
                                        ? (selectedNode.originalData as Character).description 
                                        : (selectedNode.originalData as WorldSetting).content}
                                </p>
                            </div>
                        </div>

                        {/* Echoes (Short Term Memory) */}
                        {nodeEchoes.length === 0 && (
                            <div className="pl-8 text-xs text-slate-600 italic">
                                暂无命运回响。该实体尚未在正文中经历重大变迁。
                            </div>
                        )}
                        
                        {nodeEchoes.map((echo, idx) => (
                            <div key={echo.id} className={`relative pl-8 group animate-fade-in ${echo.status === 'ARCHIVED' ? 'opacity-50 grayscale' : ''}`} style={{animationDelay: `${idx * 100}ms`}}>
                                <div className={`absolute left-0 top-1 w-6 h-6 rounded-full border flex items-center justify-center z-10 transition-colors shadow-lg shadow-muse-500/20 ${
                                    echo.status === 'ACCEPTED' ? 'bg-muse-900 border-muse-500' : 
                                    echo.status === 'PREDICTION' ? 'bg-purple-900 border-purple-500' :
                                    echo.status === 'ARCHIVED' ? 'bg-slate-900 border-slate-700' :
                                    'bg-slate-800 border-slate-600'
                                }`}>
                                    <Zap size={12} className={
                                        echo.status === 'ACCEPTED' ? 'text-muse-400' : 
                                        echo.status === 'PREDICTION' ? 'text-purple-400' :
                                        echo.status === 'ARCHIVED' ? 'text-slate-600' :
                                        'text-slate-500'
                                    } />
                                </div>
                                <div className={`p-4 rounded-lg border transition-all ${
                                    echo.status === 'ACCEPTED' ? 'bg-muse-900/10 border-muse-500/30 hover:border-muse-500/50' : 
                                    echo.status === 'PREDICTION' ? 'bg-purple-900/10 border-purple-500/30 hover:border-purple-500/50' :
                                    echo.status === 'ARCHIVED' ? 'bg-slate-900/30 border-slate-800/50' :
                                    'bg-slate-800/30 border-slate-700/50'
                                }`}>
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-xs font-mono text-slate-500">{new Date(echo.timestamp).toLocaleDateString()}</span>
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
                                            echo.status === 'ACCEPTED' ? 'bg-emerald-900/30 text-emerald-400' : 
                                            echo.status === 'PREDICTION' ? 'bg-purple-900/30 text-purple-400' :
                                            echo.status === 'ARCHIVED' ? 'bg-slate-800 text-slate-500' :
                                            'bg-amber-900/30 text-amber-400'
                                        }`}>
                                            {echo.status === 'PREDICTION' ? '未来预测' : echo.status === 'ARCHIVED' ? '已归档' : echo.status}
                                        </span>
                                    </div>
                                    <h4 className="text-sm font-bold text-white mb-1">{echo.description}</h4>
                                    <p className="text-xs text-slate-400 italic border-l-2 border-slate-700 pl-2 my-2">
                                        "{echo.reason}"
                                    </p>
                                    {/* ... (Prediction buttons remain same) */}
                                    {echo.status === 'PREDICTION' && (
                                        <div className="mt-2 flex gap-2">
                                            <button 
                                                onClick={() => {
                                                    const updatedEchoes = project.echoes.map(e => e.id === echo.id ? {...e, status: 'ACCEPTED' as const} : e);
                                                    updateProject({ echoes: updatedEchoes });
                                                }}
                                                className="text-[10px] bg-purple-600 hover:bg-purple-500 text-white px-2 py-1 rounded"
                                            >
                                                采纳预测
                                            </button>
                                            <button 
                                                 onClick={() => {
                                                    const updatedEchoes = project.echoes.filter(e => e.id !== echo.id);
                                                    updateProject({ echoes: updatedEchoes });
                                                }}
                                                className="text-[10px] bg-slate-700 hover:bg-slate-600 text-slate-300 px-2 py-1 rounded"
                                            >
                                                忽略
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
              </>
          ) : (
              // ... (Empty state remains same)
              <div className="h-full flex flex-col items-center justify-center text-slate-600 p-6 text-center">
                  <Activity size={48} className="opacity-20 mb-4" />
                  <h3 className="text-lg font-serif font-bold text-slate-500 mb-2">命运观测站</h3>
                  <p className="text-sm">
                      在左侧星图中选择一个节点，<br/>
                      查看它在时间长河中的<br/>
                      <span className="text-muse-400">起源</span>与<span className="text-muse-400">变迁</span>。
                  </p>
              </div>
          )}
      </div>
    </div>
  );
};
