import React, { useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import { Sparkles, Wand2, Feather, RefreshCw, X } from 'lucide-react';

interface DraftEditorProps {
    content: string;
    onChange: (content: string) => void;
    onRewriteSelection: (targetText: string, instruction: string, contextBefore: string, contextAfter: string, resetSelection: (newText: string) => void) => void;
    isProcessing: boolean;
}

export const DraftEditor: React.FC<DraftEditorProps> = ({ content, onChange, onRewriteSelection, isProcessing }) => {
    // We use a local state to track if the editor is currently focused
    // to prevent cursor jumping when external updates happen
    const [isFocused, setIsFocused] = useState(false);
    const [customInstruction, setCustomInstruction] = useState('');

    const editor = useEditor({
        extensions: [
            StarterKit,
            Placeholder.configure({
                placeholder: '正文将生成在这里... 您也可以直接点击打字。',
                emptyEditorClass: 'cursor-text before:content-[attr(data-placeholder)] before:text-slate-600 before:font-serif before:italic before:absolute',
            }),
            CharacterCount.configure({
                limit: null,
            }),
        ],
        content: content,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML()); // Bubble up changes as HTML
        },
        onFocus: () => setIsFocused(true),
        onBlur: () => setIsFocused(false),
        editorProps: {
            attributes: {
                class: 'prose prose-invert prose-lg w-full max-w-none font-serif leading-loose text-slate-300 min-h-[500px] outline-none',
            },
        },
    });

    // Sync external content changes into the editor ONLY if we aren't currently editing it.
    // This handles the initial load and full-body re-generations from the parent.
    useEffect(() => {
        if (editor && content !== editor.getHTML() && !isFocused) {
            editor.commands.setContent(content);
        }
    }, [content, editor, isFocused]);

    const handleActionClick = (instruction: string) => {
        if (!editor || isProcessing) return;

        const { from, to } = editor.state.selection;
        const selectedText = editor.state.doc.textBetween(from, to, ' ');
        if (!selectedText.trim()) return;

        // Extract context before and after for the AI
        const contextBefore = editor.state.doc.textBetween(Math.max(0, from - 500), from, ' ');
        const contextAfter = editor.state.doc.textBetween(to, Math.min(editor.state.doc.content.size, to + 500), ' ');

        const resetSelection = (newText: string) => {
            // Replace the selected range with the new AI-generated text
            editor.chain().focus().insertContentAt({ from, to }, newText).run();
        };

        onRewriteSelection(selectedText, instruction, contextBefore, contextAfter, resetSelection);
    };

    if (!editor) {
        return null;
    }

    return (
        <div className="relative h-full flex flex-col">
            {editor && (
                <BubbleMenu
                    editor={editor}
                    options={{ placement: 'top' }}
                    className="flex flex-col bg-slate-800 shadow-2xl border border-slate-600 rounded-lg overflow-hidden animate-fade-in"
                >
                    <div className="flex divide-x divide-slate-700/50 border-b border-slate-700/50">
                        <button
                            onClick={() => handleActionClick('让这段描写更加生动、有画面感，增加感官细节')}
                            disabled={isProcessing}
                            className="px-3 py-2 text-xs font-bold text-emerald-400 hover:bg-slate-700 flex items-center gap-1 transition-colors disabled:opacity-50"
                        >
                            <Wand2 size={12} /> 细节润色
                        </button>
                        <button
                            onClick={() => handleActionClick('将这段内容扩写，增加更多心理活动或环境渲染')}
                            disabled={isProcessing}
                            className="px-3 py-2 text-xs font-bold text-sky-400 hover:bg-slate-700 flex items-center gap-1 transition-colors disabled:opacity-50"
                        >
                            <Sparkles size={12} /> 扩写
                        </button>
                        <button
                            onClick={() => handleActionClick('用简洁有力的语言精简这段文字，加快节奏')}
                            disabled={isProcessing}
                            className="px-3 py-2 text-xs font-bold text-amber-500 hover:bg-slate-700 flex items-center gap-1 transition-colors disabled:opacity-50"
                        >
                            <Feather size={12} /> 精简
                        </button>
                        {isProcessing && (
                            <div className="px-3 py-2 flex items-center justify-center bg-slate-900/50">
                                <RefreshCw size={14} className="animate-spin text-muse-400" />
                            </div>
                        )}
                    </div>
                    <div className="flex items-center px-2 py-1.5 bg-slate-900/50">
                        <input
                            type="text"
                            value={customInstruction}
                            onChange={(e) => setCustomInstruction(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && customInstruction.trim() !== '') {
                                    handleActionClick(customInstruction.trim());
                                    setCustomInstruction('');
                                }
                            }}
                            disabled={isProcessing}
                            placeholder="或输入自定义指令 (回车执行)..."
                            className="w-full bg-transparent text-xs text-slate-300 outline-none placeholder:text-slate-500"
                        />
                    </div>
                </BubbleMenu>
            )}

            <div className="flex-1 overflow-y-auto custom-scrollbar p-8 relative">
                <EditorContent editor={editor} className="h-full" />

                {/* Visual indicator when locked for processing */}
                {isProcessing && (
                    <div className="absolute inset-0 bg-slate-900/40 cursor-not-allowed z-10 flex items-center justify-center">
                    </div>
                )}
            </div>

            <div className="bg-slate-950/50 border-t border-slate-800 px-4 py-2 flex justify-end text-[10px] text-slate-500 font-mono">
                {editor.storage.characterCount.characters()} 字符 · {editor.storage.characterCount.words()} 词
            </div>
        </div>
    );
};
