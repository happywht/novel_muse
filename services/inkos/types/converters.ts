/**
 * Muse <-> inkos 双向转换函数
 *
 * 实现双向数据转换：
 * - Muse ProjectState -> inkos Truth Files
 * - inkos Truth Files -> Muse ProjectState
 */

import type {
  ProjectState,
  WorldSetting,
  Character,
  PlotNode,
  Chapter,
  Echo,
  CharacterRelation,
  CharacterArc,
  ArcType,
  ArcPhase,
  KnowledgeTriple,
} from '../../../types';
import type {
  InkosTruthFiles,
  InkosCurrentState,
  InkosPendingHook,
  InkosChapterSummary,
  InkosSubplot,
  InkosEmotionalArc,
  InkosCharacterMatrix,
  InkosCharacterProfile,
  InkosEncounter,
  InkosInformationBoundary,
  InkosStoryBible,
  InkosVolumeOutline,
  InkosVolume,
  InkosBookConfig,
  InkosChapterFile,
  MuseToInkosMapping,
  InkosToMuseMapping,
  InkosLedgerEntry,
} from './mapping';
import {
  RELATION_TYPE_TO_INKOS,
  INKOS_TO_RELATION_TYPE,
  DEFAULT_INKOS_STATE,
  DEFAULT_CHAPTER_SUMMARY,
} from './mapping';

// ============================================================
// Muse -> inkos 转换函数
// ============================================================

/**
 * 转换 ProjectState 到 inkos 映射
 */
export function convertMuseToInkos(project: ProjectState): MuseToInkosMapping {
  return {
    projectMeta: convertProjectMeta(project),
    worldSettings: {
      currentState: convertToCurrentState(project),
      storyBible: convertToStoryBible(project),
    },
    characters: convertToCharacterMatrix(project.characters),
    plotOutline: {
      volumeOutline: convertToVolumeOutline(project.plotOutline, project.plotNodes),
      subplotBoard: convertToSubplotBoard(project.plotNodes),
    },
    plotNodes: convertPlotNodesToHooks(project.plotNodes, project.characters),
    chapters: convertToChapters(project.chapters),
    echoes: convertEchoesToHooks(project.echoes),
    timeline: convertToEmotionalArcs(project.characters, project.chapters),
  };
}

/**
 * 转换项目元信息到 inkos book.json
 */
function convertProjectMeta(project: ProjectState): InkosBookConfig {
  return {
    id: project.id,
    title: project.title,
    genre: mapMuseGenreToInkos(project.genre),
    platform: '起点', // 默认平台，可从 creativeSettings 扩展
    targetChapters: 100, // 默认目标章数
    chapterWordCount: 3000, // 默认每章字数
    language: 'zh',
    status: 'active',
  };
}

/**
 * 映射 Muse 题材到 inkos 题材
 */
function mapMuseGenreToInkos(museGenre: string): string {
  const genreMap: Record<string, string> = {
    '玄幻': 'xuanhuan',
    '仙侠': 'xianxia',
    '都市': 'urban',
    '科幻': 'sci-fi',
    '奇幻': 'fantasy',
    '历史': 'historical',
    '悬疑': 'mystery',
    '恐怖': 'horror',
    '言情': 'romance',
  };
  return genreMap[museGenre] || 'other';
}

/**
 * 转换到 inkos current_state.md
 */
function convertToCurrentState(project: ProjectState): InkosCurrentState {
  // 从 worldSettings 中提取当前位置
  const locationSetting = project.worldSettings.find(w => w.category === 'Geography');

  // 从角色中获取主角状态
  const protagonist = project.characters.find(c =>
    c.role === 'Protagonist' || c.role === '主角'
  );

  return {
    currentChapter: project.chapters.length,
    currentLocation: locationSetting?.title || DEFAULT_INKOS_STATE.currentLocation,
    protagonistStatus: protagonist?.physicalStatus || DEFAULT_INKOS_STATE.protagonistStatus,
    currentGoal: protagonist?.arc?.notes || DEFAULT_INKOS_STATE.currentGoal,
    currentConstraints: extractConstraints(project.worldSettings),
    allyEnemyStatus: summarizeRelationships(protagonist?.structuredRelations || []),
    currentConflict: extractCurrentConflict(project.plotNodes),
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * 提取约束条件
 */
function extractConstraints(settings: WorldSetting[]): string {
  const constraints: string[] = [];
  settings.forEach(s => {
    if (s.category === 'Magic/Tech' || s.category === 'Society') {
      constraints.push(s.content.slice(0, 50));
    }
  });
  return constraints.join('；') || '无';
}

/**
 * 汇总关系状态
 */
function summarizeRelationships(relations: CharacterRelation[]): string {
  if (relations.length === 0) return '未明确';

  const allies = relations.filter(r =>
    r.type === 'ALLY_OF' || r.type === 'FRIEND_OF' || r.type === 'MENTORS'
  );
  const enemies = relations.filter(r => r.type === 'ENEMY_OF' || r.type === 'RIVAL_OF');

  const parts: string[] = [];
  if (allies.length > 0) {
    parts.push(`盟友：${allies.map(r => r.targetName || r.targetCharacterName).join('、')}`);
  }
  if (enemies.length > 0) {
    parts.push(`敌人：${enemies.map(r => r.targetName || r.targetCharacterName).join('、')}`);
  }

  return parts.join('；') || '未明确';
}

/**
 * 提取当前冲突
 */
function extractCurrentConflict(nodes: PlotNode[]): string {
  // 找到最新的未解决冲突节点
  const conflictNode = nodes.find(n =>
    n.conflictScenario && n.order === Math.max(...nodes.map(n => n.order))
  );

  if (conflictNode?.conflictScenario) {
    return conflictNode.conflictScenario.stakes;
  }

  // 回退到最新情节节点
  const latestNode = nodes.reduce((max, n) => n.order > max.order ? n : max, nodes[0]);
  return latestNode?.content.slice(0, 100) || '未设定';
}

/**
 * 转换到 inkos story_bible.md
 */
function convertToStoryBible(project: ProjectState): Partial<InkosStoryBible> {
  const worldBuilding = project.worldSettings
    .filter(w => w.category === 'Geography' || w.category === 'History')
    .map(w => `### ${w.title}\n${w.content}`)
    .join('\n\n');

  const magicTech = project.worldSettings
    .filter(w => w.category === 'Magic/Tech')
    .map(w => `### ${w.title}\n${w.content}`)
    .join('\n\n');

  const society = project.worldSettings
    .filter(w => w.category === 'Society')
    .map(w => `### ${w.title}\n${w.content}`)
    .join('\n\n');

  const protagonist = project.characters.find(c =>
    c.role === 'Protagonist' || c.role === '主角'
  );

  const otherCharacters = project.characters
    .filter(c => c.role !== 'Protagonist' && c.role !== '主角')
    .map(c => formatCharacterForBible(c))
    .join('\n\n');

  return {
    worldBuilding: `## 01_世界观\n\n${worldBuilding}\n\n### 力量体系\n${magicTech}\n\n### 社会结构\n${society}`,
    protagonist: protagonist
      ? `## 02_主角\n\n${formatCharacterForBible(protagonist)}`
      : '',
    factionsAndCharacters: `## 03_势力与人物\n\n${otherCharacters}`,
    geographyAndEnvironment: `## 04_地理与环境\n\n${worldBuilding}`,
    titleAndSynopsis: `## 05_书名与简介\n\n**书名**：${project.title}\n\n**简介**：${project.premise}`,
  };
}

/**
 * 格式化角色信息用于 story_bible
 */
function formatCharacterForBible(char: Character): string {
  const lines: string[] = [`### ${char.name}`];
  lines.push(`- **身份**：${char.role}`);
  lines.push(`- **原型**：${char.archetype}`);
  lines.push(`- **描述**：${char.description}`);

  if (char.desire) lines.push(`- **核心欲望**：${char.desire}`);
  if (char.fear) lines.push(`- **核心恐惧**：${char.fear}`);
  if (char.weakness) lines.push(`- **弱点**：${char.weakness}`);
  if (char.signature) lines.push(`- **标志特征**：${char.signature}`);

  return lines.join('\n');
}

/**
 * 转换角色到 character_matrix.md
 */
function convertToCharacterMatrix(characters: Character[]): InkosCharacterMatrix {
  const profiles: InkosCharacterProfile[] = characters.map(convertToCharacterProfile);
  const encounters: InkosEncounter[] = extractEncounters(characters);
  const boundaries: InkosInformationBoundary[] = extractInformationBoundaries(characters);

  return { profiles, encounters, boundaries };
}

/**
 * 转换单个角色到 inkos profile
 */
function convertToCharacterProfile(char: Character): InkosCharacterProfile {
  return {
    name: char.name,
    coreTags: char.tags || [char.archetype, char.role],
    contrastDetails: char.contrast,
    speakingStyle: extractSpeakingStyle(char),
    personalityBase: char.alignment || char.archetype,
    relationshipToProtagonist: char.role,
    coreMotivation: char.desire || '未设定',
    currentGoal: char.arc?.notes || '未设定',
  };
}

/**
 * 提取说话风格（从描述中推断）
 */
function extractSpeakingStyle(char: Character): string {
  // 简单推断，实际可从对话数据中提取
  const styleKeywords: string[] = [];
  if (char.description.includes('冷')) styleKeywords.push('冷淡');
  if (char.description.includes('傲')) styleKeywords.push('傲慢');
  if (char.description.includes('温和')) styleKeywords.push('温和');
  return styleKeywords.join('、') || '正常';
}

/**
 * 提取相遇记录
 */
function extractEncounters(characters: Character[]): InkosEncounter[] {
  const encounters: InkosEncounter[] = [];

  characters.forEach(char => {
    if (!char.structuredRelations) return;

    char.structuredRelations.forEach(rel => {
      const targetName = rel.targetName || rel.targetCharacterName;
      if (!targetName) return;

      // 避免重复
      const exists = encounters.some(e =>
        (e.characterA === char.name && e.characterB === targetName) ||
        (e.characterB === char.name && e.characterA === targetName)
      );

      if (!exists) {
        encounters.push({
          characterA: char.name,
          characterB: targetName,
          firstEncounterChapter: 1, // 默认第一章
          lastInteractionChapter: 1,
          relationshipNature: RELATION_TYPE_TO_INKOS[rel.type || 'RELATED_TO'],
          relationshipChange: rel.trajectory,
        });
      }
    });
  });

  return encounters;
}

/**
 * 提取信息边界
 */
function extractInformationBoundaries(characters: Character[]): InkosInformationBoundary[] {
  return characters.map(char => ({
    character: char.name,
    knownInfo: char.foreshadowingHooks || [],
    unknownInfo: [], // 需要从情节中推断
    sourceChapters: [1],
  }));
}

/**
 * 转换 plotOutline 到 volume_outline.md
 */
function convertToVolumeOutline(outline: string | undefined, nodes: PlotNode[]): InkosVolumeOutline {
  // 如果有 plotOutline 字符串，尝试解析
  // 否则从 plotNodes 生成

  const maxOrder = Math.max(...nodes.map(n => n.order), 1);
  const chaptersPerVolume = 30; // 默认每卷章数

  const volumes: InkosVolume[] = [];
  let volumeIndex = 1;

  for (let start = 1; start <= maxOrder; start += chaptersPerVolume) {
    const end = Math.min(start + chaptersPerVolume - 1, maxOrder);
    const volumeNodes = nodes.filter(n => n.order >= start && n.order <= end);

    volumes.push({
      name: `第${volumeIndex}卷`,
      startChapter: start,
      endChapter: end,
      coreConflict: volumeNodes[0]?.content.slice(0, 50) || '未设定',
      keyTurningPoints: volumeNodes
        .filter(n => n.beatTag && n.beatTag !== 'OTHER')
        .map(n => n.title),
    });

    volumeIndex++;
  }

  return { volumes };
}

/**
 * 转换 plotNodes 到 subplot_board.md
 */
function convertToSubplotBoard(nodes: PlotNode[]): InkosSubplot[] {
  // 按相关角色分组作为支线
  const subplotMap = new Map<string, PlotNode[]>();

  nodes.forEach(node => {
    node.relatedCharacters?.forEach(charId => {
      const existing = subplotMap.get(charId) || [];
      existing.push(node);
      subplotMap.set(charId, existing);
    });
  });

  const subplots: InkosSubplot[] = [];

  subplotMap.forEach((nodeList, charId) => {
    if (nodeList.length < 2) return; // 至少2个节点才算支线

    const minOrder = Math.min(...nodeList.map(n => n.order));
    const maxOrder = Math.max(...nodeList.map(n => n.order));

    subplots.push({
      subplotId: `subplot_${charId}`,
      name: `${charId}支线`,
      relatedCharacters: [charId],
      startChapter: minOrder,
      lastActiveChapter: maxOrder,
      chaptersSinceActive: 0,
      status: 'ACTIVE',
      progressSummary: nodeList.map(n => n.title).join(' -> '),
    });
  });

  return subplots;
}

/**
 * 转换 PlotNode 到 pending_hooks.md
 */
function convertPlotNodesToHooks(nodes: PlotNode[], characters: Character[]): InkosPendingHook[] {
  return nodes
    .filter(node => node.beatTag && node.beatTag !== 'RESOLUTION')
    .map((node, index) => ({
      hookId: `H${String(index + 1).padStart(3, '0')}`,
      startChapter: node.order,
      type: mapBeatTagToHookType(node.beatTag),
      status: node.beatTag === 'RESOLUTION' ? 'RESOLVED' : 'OPEN',
      lastAdvancedChapter: node.order,
      expectedResolution: `第${node.order + 10}章`,
      notes: node.content,
      relatedCharacters: node.relatedCharacters?.map(id =>
        characters.find(c => c.id === id)?.name
      ).filter(Boolean) as string[],
    }));
}

/**
 * 映射 BeatTag 到 Hook 类型
 */
function mapBeatTagToHookType(tag: string | null | undefined): InkosPendingHook['type'] {
  const typeMap: Record<string, InkosPendingHook['type']> = {
    'INCITING_INCIDENT': 'plot',
    'PLOT_POINT_1': 'plot',
    'MIDPOINT': 'plot',
    'PLOT_POINT_2': 'plot',
    'CLIMAX': 'plot',
    'RESOLUTION': 'plot',
    'OTHER': 'other',
  };
  return typeMap[tag || 'OTHER'] || 'other';
}

/**
 * 转换章节
 */
function convertToChapters(chapters: Chapter[]): {
  summaries: InkosChapterSummary[];
  files: InkosChapterFile[];
} {
  const summaries: InkosChapterSummary[] = chapters.map(ch => ({
    chapter: ch.order,
    title: ch.title,
    characters: extractCharactersFromContent(ch.content),
    events: ch.summary || ch.content.slice(0, 100),
    stateChanges: '',
    hookActivity: '',
    mood: 'neutral',
    chapterType: 'standard',
  }));

  const files: InkosChapterFile[] = chapters.map(ch => {
    const paddedNum = String(ch.order).padStart(4, '0');
    return {
      chapter: ch.order,
      title: ch.title,
      content: ch.content,
      filename: `${paddedNum}_${sanitizeFilename(ch.title)}.md`,
    };
  });

  return { summaries, files };
}

/**
 * 从内容中提取角色名
 */
function extractCharactersFromContent(content: string): string[] {
  // 简单实现：提取2-4个汉字的人名模式
  const namePattern = /[\u4e00-\u9fff]{2,4}/g;
  const matches = content.match(namePattern) || [];
  // 去重并返回前5个
  return [...new Set(matches)].slice(0, 5);
}

/**
 * 清理文件名
 */
function sanitizeFilename(name: string): string {
  return name
    .replace(/[/\\?%*:|"<>]/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 50);
}

/**
 * 转换 Echo 到 pending_hooks.md
 */
function convertEchoesToHooks(echoes: Echo[]): InkosPendingHook[] {
  return echoes
    .filter(e => e.status === 'PENDING' || e.status === 'ACCEPTED')
    .map((echo, index) => ({
      hookId: `ECHO_${String(index + 1).padStart(3, '0')}`,
      startChapter: Math.floor(echo.timestamp / 1000000000000), // 粗略转换
      type: echo.type === 'CHARACTER' ? 'character' : 'world',
      status: echo.status === 'ACCEPTED' ? 'RESOLVED' : 'OPEN',
      lastAdvancedChapter: undefined,
      expectedResolution: '待定',
      notes: `${echo.description}\n原因：${echo.reason}`,
      relatedCharacters: [echo.targetName],
    }));
}

/**
 * 转换到 emotional_arcs.md
 */
function convertToEmotionalArcs(characters: Character[], chapters: Chapter[]): InkosEmotionalArc[] {
  const arcs: InkosEmotionalArc[] = [];

  characters.forEach(char => {
    if (!char.arc) return;

    // 为每个章节生成情感弧线记录
    chapters.forEach((ch, index) => {
      if (!char.relatedChapters?.includes(ch.id)) return;

      arcs.push({
        character: char.name,
        chapter: ch.order,
        emotionalState: inferEmotionalState(char.arc!, index, chapters.length),
        triggerEvent: ch.title,
        intensity: Math.round((index + 1) / chapters.length * 10),
        trajectory: char.arc.trajectory || 'stable',
      });
    });
  });

  return arcs;
}

/**
 * 推断情感状态
 */
function inferEmotionalState(arc: CharacterArc, chapterIndex: number, totalChapters: number): string {
  const progress = chapterIndex / totalChapters;

  if (arc.arcType === 'redemption') {
    if (progress < 0.3) return '挣扎';
    if (progress < 0.6) return '反思';
    if (progress < 0.9) return '觉醒';
    return '救赎';
  }

  if (arc.arcType === 'corruption') {
    if (progress < 0.3) return '诱惑';
    if (progress < 0.6) return '动摇';
    if (progress < 0.9) return '堕落';
    return '毁灭';
  }

  return '稳定';
}

// ============================================================
// inkos -> Muse 转换函数
// ============================================================

/**
 * 转换 inkos Truth Files 到 Muse 映射
 */
export function convertInkosToMuse(
  truthFiles: InkosTruthFiles,
  config: InkosBookConfig,
  additionalFiles?: {
    storyBible?: InkosStoryBible;
    volumeOutline?: InkosVolumeOutline;
  }
): InkosToMuseMapping {
  return {
    bookConfig: {
      id: config.id,
      title: config.title,
      genre: mapInkosGenreToMuse(config.genre),
      premise: additionalFiles?.storyBible?.titleAndSynopsis || '',
      lastModified: Date.now(),
      creativeSettings: {
        tone: '标准',
        style: '标准',
        creativity: 0.7,
        targetAudience: '大众',
      },
      worldGenConfig: {
        detailLevel: 'Standard',
        focus: 'Balanced',
      },
      characters: [],
      worldSettings: [],
      plotNodes: [],
      plotHistory: [],
      drafts: [],
      chapters: [],
      echoes: [],
      customPrompts: {},
      timeline: [],
      currentWorldDate: '',
    },
    worldState: convertToWorldSettings(
      truthFiles.currentState,
      additionalFiles?.storyBible
    ),
    characters: convertToCharacters(truthFiles.characterMatrix),
    plotOutline: additionalFiles?.volumeOutline
      ? formatVolumeOutline(additionalFiles.volumeOutline)
      : '',
    plotNodes: convertToPlotNodes(truthFiles.pendingHooks, truthFiles.subplotBoard),
    chapters: convertToChaptersMuse(truthFiles.chapterSummaries),
    echoes: convertToEchoes(truthFiles.pendingHooks),
    characterArcs: convertToCharacterArcs(truthFiles.emotionalArcs),
  };
}

/**
 * 映射 inkos 题材到 Muse
 */
function mapInkosGenreToMuse(inkosGenre: string): string {
  const genreMap: Record<string, string> = {
    'xuanhuan': '玄幻',
    'xianxia': '仙侠',
    'urban': '都市',
    'sci-fi': '科幻',
    'fantasy': '奇幻',
    'historical': '历史',
    'mystery': '悬疑',
    'horror': '恐怖',
    'romance': '言情',
    'litrpg': '玄幻',
    'cultivation': '仙侠',
    'progression': '玄幻',
  };
  return genreMap[inkosGenre] || '玄幻';
}

/**
 * 转换到 WorldSetting[]
 */
function convertToWorldSettings(
  state: InkosCurrentState,
  bible?: InkosStoryBible
): WorldSetting[] {
  const settings: WorldSetting[] = [];

  // 从 current_state 创建位置设定
  settings.push({
    id: `ws_location_${Date.now()}`,
    category: 'Geography',
    title: state.currentLocation,
    content: `当前主要场景：${state.currentLocation}`,
    importance: 10,
  });

  // 从 story_bible 提取设定
  if (bible) {
    if (bible.worldBuilding) {
      settings.push({
        id: `ws_world_${Date.now()}`,
        category: 'Other',
        title: '世界观',
        content: bible.worldBuilding,
        importance: 9,
      });
    }

    if (bible.geographyAndEnvironment) {
      settings.push({
        id: `ws_geo_${Date.now()}`,
        category: 'Geography',
        title: '地理环境',
        content: bible.geographyAndEnvironment,
        importance: 8,
      });
    }
  }

  return settings;
}

/**
 * 转换到 Character[]
 */
function convertToCharacters(matrix: InkosCharacterMatrix): Character[] {
  return matrix.profiles.map(profile => {
    const char: Character = {
      id: `char_${profile.name}_${Date.now()}`,
      name: profile.name,
      role: mapInkosRoleToMuse(profile.relationshipToProtagonist),
      archetype: profile.coreTags[0] || '未知',
      description: `性格底色：${profile.personalityBase}`,
      desire: profile.coreMotivation,
      signature: profile.speakingStyle,
    };

    // 从相遇记录提取关系
    const relations = matrix.encounters
      .filter(e => e.characterA === profile.name || e.characterB === profile.name)
      .map(e => {
        const targetName = e.characterA === profile.name ? e.characterB : e.characterA;
        return {
          targetName,
          type: INKOS_TO_RELATION_TYPE[e.relationshipNature] || 'RELATED_TO',
          description: e.relationshipChange || '',
        };
      });

    if (relations.length > 0) {
      char.structuredRelations = relations;
    }

    return char;
  });
}

/**
 * 映射 inkos 角色关系到 Muse role
 */
function mapInkosRoleToMuse(relationship: string): string {
  const roleMap: Record<string, string> = {
    '主角': 'Protagonist',
    'Protagonist': 'Protagonist',
    '反派': 'Antagonist',
    'Antagonist': 'Antagonist',
    '导师': 'Mentor',
    'Mentor': 'Mentor',
    '守护者': 'Guardian',
    'Guardian': 'Guardian',
    '变形者': 'Shapeshifter',
    'Shapeshifter': 'Shapeshifter',
    '捣蛋鬼': 'Trickster',
    'Trickster': 'Trickster',
    '信使': 'Herald',
    'Herald': 'Herald',
  };
  return roleMap[relationship] || '配角';
}

/**
 * 格式化卷纲为字符串
 */
function formatVolumeOutline(outline: InkosVolumeOutline): string {
  return outline.volumes.map(vol => {
    const points = vol.keyTurningPoints.map(p => `  - ${p}`).join('\n');
    return `## ${vol.name}（第${vol.startChapter}-${vol.endChapter}章）\n\n核心冲突：${vol.coreConflict}\n\n关键转折：\n${points}`;
  }).join('\n\n');
}

/**
 * 转换到 PlotNode[]
 */
function convertToPlotNodes(
  hooks: InkosPendingHook[],
  subplots: InkosSubplot[]
): PlotNode[] {
  const nodes: PlotNode[] = [];

  // 从 hooks 创建节点
  hooks.forEach((hook, index) => {
    nodes.push({
      id: `pn_${hook.hookId}`,
      title: hook.notes.slice(0, 30),
      content: hook.notes,
      order: hook.startChapter,
      beatTag: mapHookTypeToBeatTag(hook.type),
      relatedCharacters: hook.relatedCharacters,
    });
  });

  return nodes;
}

/**
 * 映射 Hook 类型到 BeatTag
 */
function mapHookTypeToBeatTag(type: string): PlotNode['beatTag'] {
  const tagMap: Record<string, PlotNode['beatTag']> = {
    'plot': 'OTHER',
    'character': 'OTHER',
    'world': 'OTHER',
    'mystery': 'OTHER',
    'item': 'OTHER',
  };
  return tagMap[type] || 'OTHER';
}

/**
 * 转换到 Chapter[]
 */
function convertToChaptersMuse(summaries: InkosChapterSummary[]): Chapter[] {
  return summaries.map(summary => ({
    id: `ch_${summary.chapter}`,
    title: summary.title,
    content: '', // 内容需要从章节文件单独读取
    summary: summary.events,
    order: summary.chapter,
    lastModified: Date.now(),
    metadata: [{ key: 'mood', value: summary.mood }],
  }));
}

/**
 * 转换到 Echo[]
 */
function convertToEchoes(hooks: InkosPendingHook[]): Echo[] {
  return hooks
    .filter(h => h.status === 'OPEN')
    .map(hook => ({
      id: `echo_${hook.hookId}`,
      type: hook.type === 'character' ? 'CHARACTER' : 'WORLD',
      targetId: hook.relatedCharacters?.[0] || '',
      targetName: hook.relatedCharacters?.[0] || '',
      description: hook.notes,
      reason: `来自 inkos 伏笔：${hook.hookId}`,
      status: 'PENDING',
      timestamp: Date.now(),
    }));
}

/**
 * 转换到 CharacterArc Map
 */
function convertToCharacterArcs(arcs: InkosEmotionalArc[]): Map<string, CharacterArc> {
  const arcMap = new Map<string, CharacterArc>();

  arcs.forEach(arc => {
    if (!arcMap.has(arc.character)) {
      arcMap.set(arc.character, {
        arcType: inferArcType(arc.trajectory),
        currentPhase: inferArcPhase(arc.intensity),
        phaseProgress: arc.intensity * 10,
        notes: arc.emotionalState,
      });
    }
  });

  return arcMap;
}

/**
 * 推断弧线类型
 */
function inferArcType(trajectory: string): ArcType {
  const typeMap: Record<string, ArcType> = {
    'rising': 'awakening',
    'falling': 'corruption',
    'stable': 'steadfast',
  };
  return typeMap[trajectory] || 'steadfast';
}

/**
 * 推断弧线阶段
 */
function inferArcPhase(intensity: number): ArcPhase {
  if (intensity < 3) return 'setup';
  if (intensity < 5) return 'rising-action';
  if (intensity < 7) return 'crisis';
  if (intensity < 9) return 'climax';
  return 'resolution';
}

// ============================================================
// 导出工具函数
// ============================================================

/**
 * 生成 inkos current_state.md Markdown 内容
 */
export function generateCurrentStateMarkdown(state: InkosCurrentState): string {
  return `# 当前状态卡

| 字段 | 值 |
|------|-----|
| 当前章节 | ${state.currentChapter} |
| 当前位置 | ${state.currentLocation} |
| 主角状态 | ${state.protagonistStatus} |
| 当前目标 | ${state.currentGoal} |
| 当前限制 | ${state.currentConstraints} |
| 当前敌我 | ${state.allyEnemyStatus} |
| 当前冲突 | ${state.currentConflict} |
`;
}

/**
 * 生成 inkos pending_hooks.md Markdown 内容
 */
export function generatePendingHooksMarkdown(hooks: InkosPendingHook[]): string {
  const header = `# 伏笔池\n\n| hook_id | 起始章节 | 类型 | 状态 | 最近推进 | 预期回收 | 备注 |\n|---------|----------|------|------|----------|----------|------|\n`;
  const rows = hooks.map(h =>
    `| ${h.hookId} | ${h.startChapter} | ${h.type} | ${h.status} | ${h.lastAdvancedChapter || '-'} | ${h.expectedResolution || '-'} | ${h.notes.slice(0, 30)} |`
  ).join('\n');
  return header + rows;
}

/**
 * 生成 inkos chapter_summaries.md Markdown 内容
 */
export function generateChapterSummariesMarkdown(summaries: InkosChapterSummary[]): string {
  const header = `# 章节摘要\n\n| 章节 | 标题 | 出场人物 | 关键事件 | 状态变化 | 伏笔动态 | 情绪基调 | 章节类型 |\n|------|------|----------|----------|----------|----------|----------|----------|\n`;
  const rows = summaries.map(s =>
    `| ${s.chapter} | ${s.title} | ${s.characters.join('、')} | ${s.events} | ${s.stateChanges} | ${s.hookActivity} | ${s.mood} | ${s.chapterType} |`
  ).join('\n');
  return header + rows;
}

/**
 * 生成 inkos character_matrix.md Markdown 内容
 */
export function generateCharacterMatrixMarkdown(matrix: InkosCharacterMatrix): string {
  const profileHeader = `### 角色档案\n\n| 角色 | 核心标签 | 反差细节 | 说话风格 | 性格底色 | 与主角关系 | 核心动机 | 当前目标 |\n|------|----------|----------|----------|----------|------------|----------|----------|\n`;
  const profileRows = matrix.profiles.map(p =>
    `| ${p.name} | ${p.coreTags.join('、')} | ${p.contrastDetails || '-'} | ${p.speakingStyle || '-'} | ${p.personalityBase} | ${p.relationshipToProtagonist} | ${p.coreMotivation} | ${p.currentGoal} |`
  ).join('\n');

  const encounterHeader = `\n\n### 相遇记录\n\n| 角色A | 角色B | 首次相遇章 | 最近交互章 | 关系性质 | 关系变化 |\n|-------|-------|------------|------------|----------|----------|\n`;
  const encounterRows = matrix.encounters.map(e =>
    `| ${e.characterA} | ${e.characterB} | ${e.firstEncounterChapter} | ${e.lastInteractionChapter} | ${e.relationshipNature} | ${e.relationshipChange || '-'} |`
  ).join('\n');

  const boundaryHeader = `\n\n### 信息边界\n\n| 角色 | 已知信息 | 未知信息 | 信息来源章 |\n|------|----------|----------|------------|\n`;
  const boundaryRows = matrix.informationBoundaries.map(b =>
    `| ${b.character} | ${b.knownInfo.join('；')} | ${b.unknownInfo.join('；')} | ${b.sourceChapters.join(',')} |`
  ).join('\n');

  return `# 角色交互矩阵\n\n${profileHeader}${profileRows}${encounterHeader}${encounterRows}${boundaryHeader}${boundaryRows}`;
}

/**
 * 解析 inkos current_state.md 到类型对象
 */
export function parseCurrentStateMarkdown(markdown: string): InkosCurrentState {
  const state: Partial<InkosCurrentState> = {};

  const fieldMap: Record<string, keyof InkosCurrentState> = {
    '当前章节': 'currentChapter',
    '当前位置': 'currentLocation',
    '主角状态': 'protagonistStatus',
    '当前目标': 'currentGoal',
    '当前限制': 'currentConstraints',
    '当前敌我': 'allyEnemyStatus',
    '当前冲突': 'currentConflict',
  };

  const lines = markdown.split('\n');
  lines.forEach(line => {
    const match = line.match(/\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|/);
    if (match) {
      const [, field, value] = match;
      const key = fieldMap[field.trim()];
      if (key) {
        if (key === 'currentChapter') {
          state[key] = parseInt(value.trim(), 10) || 0;
        } else {
          state[key] = value.trim();
        }
      }
    }
  });

  return { ...DEFAULT_INKOS_STATE, ...state };
}

/**
 * 解析 inkos pending_hooks.md 到类型数组
 */
export function parsePendingHooksMarkdown(markdown: string): InkosPendingHook[] {
  const hooks: InkosPendingHook[] = [];
  const lines = markdown.split('\n');

  lines.forEach(line => {
    if (!line.startsWith('|') || line.includes('hook_id')) return;

    const parts = line.split('|').map(p => p.trim()).filter(Boolean);
    if (parts.length >= 7) {
      hooks.push({
        hookId: parts[0] || '',
        startChapter: parseInt(parts[1], 10) || 0,
        type: parts[2] as InkosPendingHook['type'] || 'other',
        status: parts[3] as InkosPendingHook['status'] || 'OPEN',
        lastAdvancedChapter: parts[4] ? parseInt(parts[4], 10) : undefined,
        expectedResolution: parts[5] || undefined,
        notes: parts[6] || '',
      });
    }
  });

  return hooks;
}
