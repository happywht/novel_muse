import React from 'react';
import { User, X, Send } from 'lucide-react';
import { useCharacterCreator } from './CharacterCreatorContext';

/**
 * 角色聊天组件
 * 提供沉浸式角色扮演对话功能
 */
export function CharacterChat() {
  const {
    showChat,
    setShowChat,
    activeChar,
    chatInput,
    setChatInput,
    chatHistory,
    isChatting,
    handleSendMessage,
  } = useCharacterCreator();

  if (!showChat || !activeChar) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl h-[600px] flex flex-col shadow-2xl relative overflow-hidden">
        {/* Chat Header */}
        <div className="p-4 border-b border-slate-700 bg-slate-800 flex justify-between items-center z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-700 overflow-hidden border border-slate-500">
              {activeChar.imageUrl ? (
                <img src={activeChar.imageUrl} alt={activeChar.name} className="w-full h-full object-cover" />
              ) : (
                <div className="flex items-center justify-center w-full h-full">
                  <User size={20} />
                </div>
              )}
            </div>
            <div>
              <h3 className="font-bold text-white">{activeChar.name}</h3>
              <p className="text-xs text-muse-300">沉浸式角色扮演中</p>
            </div>
          </div>
          <button onClick={() => setShowChat(false)} className="text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-900/50">
          {chatHistory.length === 0 && (
            <div className="text-center text-slate-500 mt-10 text-sm">
              <p>试着问问 {activeChar.name} 关于它的过去、动机或对其他人的看法。</p>
            </div>
          )}
          {chatHistory.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] px-4 py-2 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-muse-600 text-white rounded-tr-none'
                    : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-tl-none'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
          {isChatting && (
            <div className="flex justify-start">
              <div className="bg-slate-800 px-4 py-3 rounded-2xl rounded-tl-none border border-slate-700">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce delay-100"></div>
                  <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce delay-200"></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 bg-slate-800 border-t border-slate-700 flex gap-2">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder={`与 ${activeChar.name} 对话...`}
            className="flex-1 bg-slate-900 border border-slate-600 rounded-full px-4 py-2 text-white focus:border-muse-500 outline-none"
            autoFocus
          />
          <button
            onClick={handleSendMessage}
            disabled={isChatting || !chatInput.trim()}
            className="bg-muse-600 hover:bg-muse-500 text-white p-2.5 rounded-full disabled:opacity-50 transition-transform active:scale-95"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default CharacterChat;
