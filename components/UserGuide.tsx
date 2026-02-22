import React from 'react';
import { X, Feather, Globe, Users, BookOpen } from 'lucide-react';

interface UserGuideProps {
  onClose: () => void;
}

export const UserGuide: React.FC<UserGuideProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <h2 className="text-2xl font-serif font-bold text-white">使用说明书</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>
        
        <div className="overflow-y-auto p-6 space-y-8 custom-scrollbar">
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
                   <li>输入关键词（如“浮空城”），AI 将基于你的小说类型生成详细的设定文档。</li>
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
          
          <div className="bg-muse-900/20 p-4 rounded-lg border border-muse-500/20 text-center">
             <p className="text-muse-200 text-sm">
                提示：所有生成的内容均基于您的 API Key 调用 Google Gemini 模型。请确保您的网络环境可以正常访问服务。
             </p>
          </div>
        </div>
      </div>
    </div>
  );
};