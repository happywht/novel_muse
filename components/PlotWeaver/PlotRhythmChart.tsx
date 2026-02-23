import React from 'react';
import { Activity, TrendingUp, RefreshCw } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Loader } from '../Loader';
import { PlotRhythmPoint } from '../../services/geminiService';

interface PlotRhythmChartProps {
    rhythmData: PlotRhythmPoint[];
    isAnalyzingRhythm: boolean;
    hasPlotOutline: boolean;
    onAnalyzeRhythm: () => void;
}

export const PlotRhythmChart: React.FC<PlotRhythmChartProps> = ({
    rhythmData,
    isAnalyzingRhythm,
    hasPlotOutline,
    onAnalyzeRhythm,
}) => {
    if (rhythmData.length > 0) {
        return (
            <div className="flex-1 flex flex-col animate-fade-in">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Activity className="text-muse-400" size={16} /> 剧情心电图
                    </h3>
                    <button
                        onClick={onAnalyzeRhythm}
                        className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded flex items-center gap-1"
                    >
                        <RefreshCw size={12} /> 重新分析
                    </button>
                </div>
                <div className="flex-1 w-full min-h-[200px] bg-slate-950/50 rounded-lg p-4 border border-slate-800/50 relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={rhythmData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorTension" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#818cf8" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                            <XAxis
                                dataKey="beat"
                                stroke="#64748b"
                                tick={{ fontSize: 10 }}
                                interval="preserveStartEnd"
                            />
                            <YAxis
                                stroke="#64748b"
                                tick={{ fontSize: 10 }}
                                domain={[0, 100]}
                            />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f1f5f9' }}
                                itemStyle={{ color: '#818cf8' }}
                                labelStyle={{ color: '#94a3b8', marginBottom: '0.5rem' }}
                            />
                            <ReferenceLine y={50} stroke="#334155" strokeDasharray="3 3" />
                            <Area
                                type="monotone"
                                dataKey="tension"
                                stroke="#818cf8"
                                fillOpacity={1}
                                fill="url(#colorTension)"
                                strokeWidth={2}
                                animationDuration={1500}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
                <div className="mt-4 space-y-2 overflow-y-auto max-h-[200px] custom-scrollbar pr-2">
                    {rhythmData.map((point, idx) => (
                        <div key={idx} className="flex gap-3 text-xs p-2 hover:bg-slate-800/50 rounded transition-colors border-l-2 border-transparent hover:border-muse-500">
                            <div className="w-8 font-mono text-slate-500 text-right">{point.tension}</div>
                            <div className="flex-1">
                                <span className="font-bold text-slate-300 mr-2">{point.beat}</span>
                                <span className="text-slate-400">{point.description}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center h-full text-slate-600 animate-fade-in">
            <TrendingUp size={48} className="opacity-20 mb-4" />
            <p className="text-center max-w-xs text-sm mb-6">
                可视化剧情的起伏节奏。<br />
                AI 将分析每个情节点的张力值，绘制出您的故事心电图。
            </p>
            <button
                onClick={onAnalyzeRhythm}
                disabled={isAnalyzingRhythm || !hasPlotOutline}
                className="bg-muse-600 hover:bg-muse-500 text-white px-6 py-2 rounded-full text-sm font-medium flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-muse-500/20 transition-all hover:scale-105"
            >
                {isAnalyzingRhythm ? <Loader text="正在分析..." /> : <><Activity size={16} /> 生成节奏图谱</>}
            </button>
        </div>
    );
};
