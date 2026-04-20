import React, { useMemo } from 'react';
import { User, Plus, Trash2, Sparkles, Search } from 'lucide-react';
import { VirtualList } from '@/components/ui/VirtualList';
import { useCharacterCreator } from './CharacterCreatorContext';
import { useDebouncedValue } from '@/hooks/useDebouncedConfig';
import { UI_CONFIG } from '@/config/constants';

/**
 * 角色列表组件
 * 展示角色列表、搜索过滤、角色选择功能
 */
export function CharacterList() {
  const {
    project,
    activeCharId,
    setActiveCharId,
    setDraftCharacter,
    searchQuery,
    setSearchQuery,
    nameInput,
    setNameInput,
    roleInput,
    setRoleInput,
    isGeneratingInfo,
    handleGenerateChar,
    handleManualAdd,
    deleteChar,
  } = useCharacterCreator();

  const debouncedSearchQuery = useDebouncedValue(searchQuery, 'search');

  // 过滤后的角色列表
  const filteredCharacters = useMemo(() => {
    return project.characters.filter(
      (c) => c.name.includes(debouncedSearchQuery) || c.role.includes(debouncedSearchQuery)
    );
  }, [project.characters, debouncedSearchQuery]);

  // 检查角色是否有待处理的 Echo
  const hasPendingEcho = (charId: string) => {
    return (project.echoes || []).some((e) => e.targetId === charId && e.status === 'PENDING');
  };

  // 渲染单个角色项
  const renderCharacterItem = (char: typeof project.characters[0]) => {
    const hasEcho = hasPendingEcho(char.id);

    return (
      <div
        key={char.id}
        onClick={() => {
          setActiveCharId(char.id);
          setDraftCharacter(null);
        }}
        className={`p-3 rounded-lg cursor-pointer flex items-center gap-3 group transition-all relative overflow-hidden ${
          activeCharId === char.id
            ? 'bg-muse-900/50 border border-muse-500/50'
            : 'bg-slate-800 border border-transparent hover:bg-slate-750'
        } ${hasEcho && activeCharId !== char.id ? 'shadow-[0_0_15px_rgba(34,211,238,0.15)] border-cyan-900/50' : ''}`}
      >
        {/* Echo 指示器 */}
        {hasEcho && (
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)] animate-pulse"></div>
        )}

        {/* 头像 */}
        <div
          className={`w-10 h-10 rounded-full bg-slate-700 overflow-hidden flex-shrink-0 border ${
            hasEcho ? 'border-cyan-500/50' : 'border-slate-600'
          }`}
        >
          {char.imageUrl ? (
            <img src={char.imageUrl} alt={char.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-500">
              <User size={20} />
            </div>
          )}
        </div>

        {/* 角色信息 */}
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm text-slate-200 truncate">
            {char.name}
            {hasEcho && (
              <span className="ml-2 text-[10px] bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded-full">
                待处理
              </span>
            )}
          </div>
          <div className="text-xs text-slate-500 truncate">{char.role}</div>
        </div>

        {/* 删除按钮 */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            deleteChar(char.id);
          }}
          className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-opacity p-1"
        >
          <Trash2 size={16} />
        </button>
      </div>
    );
  };

  return (
    <div className="w-1/3 flex flex-col bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
      <div className="p-4 border-b border-slate-700 bg-slate-900/50">
        <h2 className="font-serif font-bold text-lg text-white mb-4">角色名录</h2>

        {/* 搜索 */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索角色..."
            className="w-full bg-slate-900 border border-slate-700 rounded-md pl-9 pr-3 py-2 text-xs text-white focus:border-muse-500 outline-none"
          />
        </div>

        {/* 新建角色表单 */}
        <div className="space-y-2">
          <input
            type="text"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            placeholder="角色姓名 (可选)"
            className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm text-white focus:border-muse-500 outline-none"
          />
          <select
            value={roleInput}
            onChange={(e) => setRoleInput(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-300 focus:border-muse-500 outline-none"
          >
            <option value="主角">主角 (Protagonist)</option>
            <option value="反派">反派 (Antagonist)</option>
            <option value="伙伴">伙伴 (Ally/Sidekick)</option>
            <option value="导师">导师 (Mentor)</option>
            <option value="守护者">守护者 (Guardian) - 阻碍与测试</option>
            <option value="变形者">变形者 (Shapeshifter) - 亦正亦邪</option>
            <option value="捣蛋鬼">捣蛋鬼 (Trickster) - 喜剧/变数</option>
            <option value="信使">信使 (Herald) - 开启剧情</option>
          </select>
          <div className="flex gap-2">
            <button
              onClick={handleManualAdd}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-md font-medium transition-colors flex items-center justify-center space-x-2"
            >
              <Plus size={16} /> <span>手动创建</span>
            </button>
            <button
              onClick={handleGenerateChar}
              disabled={isGeneratingInfo}
              className="flex-[1.5] bg-muse-600 hover:bg-muse-500 text-white py-2 rounded-md font-medium transition-colors flex items-center justify-center space-x-2"
            >
              {isGeneratingInfo ? (
                <span>正在召唤...</span>
              ) : (
                <>
                  <Sparkles size={16} /> <span>AI 生成档案</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 角色列表 */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {/* 空状态 */}
        {filteredCharacters.length === 0 && (
          <p className="text-slate-500 text-xs p-4 text-center">暂无匹配角色</p>
        )}

        {/* 虚拟滚动优化 */}
        {filteredCharacters.length > 0 && (
          <VirtualList
            items={filteredCharacters}
            itemHeight={80}
                       height={typeof window !== 'undefined' ? window.innerHeight - UI_CONFIG.VIRTUAL_LIST_BOTTOM_OFFSET : UI_CONFIG.DEFAULT_LIST_HEIGHT}
            className="space-y-2"
            renderItem={renderCharacterItem}
          />
        )}
      </div>
    </div>
  );
}

export default CharacterList;
