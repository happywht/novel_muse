/**
 * About Tab
 * App version, links, and information
 */

import React, { useState } from 'react';
import { Info, Github, ExternalLink, Heart, BookOpen } from 'lucide-react';

export const AboutTab: React.FC = () => {
    const version = 'v1.0.0-beta';
    const [showUserGuide, setShowUserGuide] = useState(false);

    return (
        <div className="p-6 space-y-8 overflow-y-auto custom-scrollbar">
            {/* Logo & Version */}
            <div className="text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-muse-500 to-muse-600 rounded-2xl mb-4 shadow-lg shadow-muse-500/20">
                    <Info size={40} className="text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white font-serif mb-2">Muse 小说架构师</h3>
                <p className="text-slate-400">AI驱动的创意写作助手</p>
                <div className="mt-2 inline-block px-3 py-1 bg-slate-800 rounded-full text-xs font-medium text-muse-400">
                    {version}
                </div>
            </div>

            {/* Description */}
            <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-4">
                <h4 className="text-sm font-bold text-white mb-2">关于项目</h4>
                <p className="text-sm text-slate-400 leading-relaxed">
                    Muse 是一个基于 AI 的小说创作辅助工具，帮助作者构建世界观、管理角色、
                    规划情节、分析章节平衡，并通过知识图谱可视化作品结构。
                    支持传统文学和精品网文两种写作风格，提供专业的创作指导。
                </p>
            </div>

            {/* Features */}
            <div>
                <h4 className="text-sm font-bold text-white mb-3">核心功能</h4>
                <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 bg-muse-400 rounded-full mt-2 flex-shrink-0" />
                        <span className="text-sm text-slate-400">世界观生成</span>
                    </div>
                    <div className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 bg-muse-400 rounded-full mt-2 flex-shrink-0" />
                        <span className="text-sm text-slate-400">角色管理</span>
                    </div>
                    <div className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 bg-muse-400 rounded-full mt-2 flex-shrink-0" />
                        <span className="text-sm text-slate-400">情节规划</span>
                    </div>
                    <div className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 bg-muse-400 rounded-full mt-2 flex-shrink-0" />
                        <span className="text-sm text-slate-400">章节分析</span>
                    </div>
                    <div className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 bg-muse-400 rounded-full mt-2 flex-shrink-0" />
                        <span className="text-sm text-slate-400">知识图谱</span>
                    </div>
                    <div className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 bg-muse-400 rounded-full mt-2 flex-shrink-0" />
                        <span className="text-sm text-slate-400">Echo 系统</span>
                    </div>
                    <div className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 bg-muse-400 rounded-full mt-2 flex-shrink-0" />
                        <span className="text-sm text-slate-400">冲突可视化</span>
                    </div>
                    <div className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 bg-muse-400 rounded-full mt-2 flex-shrink-0" />
                        <span className="text-sm text-slate-400">云端同步</span>
                    </div>
                </div>
            </div>

            {/* Links */}
            <div>
                <h4 className="text-sm font-bold text-white mb-3">相关链接</h4>
                <div className="space-y-2">
                    <a
                        href="#"
                        className="flex items-center gap-3 p-3 bg-slate-800/30 border border-slate-700 rounded-lg hover:bg-slate-800/50 transition-colors group"
                    >
                        <Github size={18} className="text-slate-400 group-hover:text-white" />
                        <span className="text-sm text-slate-300 group-hover:text-white">项目主页</span>
                        <ExternalLink size={14} className="ml-auto text-slate-500" />
                    </a>
                    <a
                        href="#"
                        className="flex items-center gap-3 p-3 bg-slate-800/30 border border-slate-700 rounded-lg hover:bg-slate-800/50 transition-colors group"
                    >
                        <ExternalLink size={18} className="text-slate-400 group-hover:text-white" />
                        <span className="text-sm text-slate-300 group-hover:text-white">使用文档</span>
                        <ExternalLink size={14} className="ml-auto text-slate-500" />
                    </a>
                    <a
                        href="#"
                        className="flex items-center gap-3 p-3 bg-slate-800/30 border border-slate-700 rounded-lg hover:bg-slate-800/50 transition-colors group"
                    >
                        <ExternalLink size={18} className="text-slate-400 group-hover:text-white" />
                        <span className="text-sm text-slate-300 group-hover:text-white">报告问题</span>
                        <ExternalLink size={14} className="ml-auto text-slate-500" />
                    </a>
                </div>
            </div>

            {/* User Guide Button */}
            <div>
                <button
                    onClick={() => setShowUserGuide(true)}
                    className="w-full flex items-center justify-center gap-3 p-4 bg-muse-600/20 border border-muse-500/30 rounded-xl hover:bg-muse-600/30 transition-colors group"
                >
                    <BookOpen size={20} className="text-muse-400 group-hover:text-muse-300" />
                    <span className="text-sm font-medium text-muse-400 group-hover:text-muse-300">查看完整使用说明书</span>
                    <ExternalLink size={14} className="text-muse-400" />
                </button>
            </div>

            {/* User Guide Modal */}
            {showUserGuide && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-slate-700">
                            <h2 className="text-2xl font-serif font-bold text-white">使用说明书</h2>
                            <button onClick={() => setShowUserGuide(false)} className="text-slate-400 hover:text-white transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M18 6L6 18M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                            <UserGuideContent />
                        </div>
                    </div>
                </div>
            )}

            {/* AI Providers */}
            <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-4">
                <h4 className="text-sm font-bold text-white mb-2">AI 能力支持</h4>
                <div className="flex items-center justify-center gap-6 text-sm text-slate-400">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-400 rounded-full" />
                        <span>Google Gemini</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-400 rounded-full" />
                        <span>GLM</span>
                    </div>
                </div>
            </div>

            {/* License & Credits */}
            <div className="text-center text-xs text-slate-500 pt-4 border-t border-slate-700">
                <p className="mb-2">MIT License · 开源免费</p>
                <p className="flex items-center justify-center gap-1">
                    Made with <Heart size={12} className="text-red-400" /> by CodeBuddy
                </p>
            </div>
        </div>
    );
};

// 从UserGuide.tsx复制过来的内容
const UserGuideContent: React.FC = () => {
    return (
        <div className="space-y-6">
            <div className="space-y-4">
                <p className="text-slate-300 leading-relaxed">
                    欢迎使用 <strong className="text-muse-400">Muse 小说架构师</strong>。这是一个旨在帮助小说作者突破创作瓶颈、完善世界观设定的 AI 辅助工具。以下是各模块的详细功能介绍：
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Module 1 */}
                <div className="bg-slate-800/50 p-5 rounded-xl border border-slate-700/50">
                    <div className="flex items-center gap-3 mb-3 text-muse-400">
                        <Feather size={24} />
                        <h3 className="text-lg font-bold">1. 创世纪 (Genesis)</h3>
                    </div>
                    <p className="text-sm text-slate-400 mb-2">项目的基础概览与灵感启动。</p>
                    <ul className="list-disc list-inside text-sm text-slate-300 space-y-1">
                        <li>填写小说的标题、类型和核心梗概。</li>
                        <li><strong className="text-white">AI 灵感火花</strong>：输入一个模糊的想法，AI 会为你生成完整的书名建议、核心冲突和电梯游说词。</li>
                    </ul>
                </div>

                {/* Module 2 */}
                <div className="bg-slate-800/50 p-5 rounded-xl border border-slate-700/50">
                    <div className="flex items-center gap-3 mb-3 text-muse-400">
                        <Globe size={24} />
                        <h3 className="text-lg font-bold">2. 万象织机 (World Loom)</h3>
                    </div>
                    <p className="text-sm text-slate-400 mb-2">构建宏大而详实的世界观。</p>
                    <ul className="list-disc list-inside text-sm text-slate-300 space-y-1">
                        <li>选择设定类别（地理、魔法、社会等）。</li>
                        <li>输入关键词（如"浮空城"），AI 将基于你的小说类型生成详细的设定文档。</li>
                        <li>生成的设定会自动归档，随时查阅。</li>
                    </ul>
                </div>

                {/* Module 3 */}
                <div className="bg-slate-800/50 p-5 rounded-xl border border-slate-700/50">
                    <div className="flex items-center gap-3 mb-3 text-muse-400">
                        <Users size={24} />
                        <h3 className="text-lg font-bold">3. 灵魂熔炉 (Soul Forge)</h3>
                    </div>
                    <p className="text-sm text-slate-400 mb-2">塑造有血有肉的角色。</p>
                    <ul className="list-disc list-inside text-sm text-slate-300 space-y-1">
                        <li>输入角色姓名和定位（主角/反派等）。</li>
                        <li>AI 自动生成外貌、性格、动机和秘密。</li>
                        <li><strong className="text-white">立绘生成</strong>：点击相机图标，AI 将根据角色描述绘制高清人物概念图。</li>
                    </ul>
                </div>

                {/* Module 4 */}
                <div className="bg-slate-800/50 p-5 rounded-xl border border-slate-700/50">
                    <div className="flex items-center gap-3 mb-3 text-muse-400">
                        <BookOpen size={24} />
                        <h3 className="text-lg font-bold">4. 情节罗盘 (Plot Weaver)</h3>
                    </div>
                    <p className="text-sm text-slate-400 mb-2">梳理故事脉络与节奏。</p>
                    <ul className="list-disc list-inside text-sm text-slate-300 space-y-1">
                        <li>输入你的粗略大纲或分场梗概。</li>
                        <li>点击分析，AI 将扮演资深编辑，指出剧情漏洞、节奏拖沓之处并提出改进建议。</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};


