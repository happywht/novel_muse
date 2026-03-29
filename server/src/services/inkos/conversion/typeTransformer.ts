/**
 * Type Transformer - 类型转换
 * Muse <-> inkos 类型转换逻辑
 */

import {
  Character,
  CharacterRelation,
  CharacterRelationType,
  WorldSetting,
  PlotNode,
  Chapter,
  TimelineEvent,
  CreativeSettings,
  ArcType,
  ArcPhase,
} from '../../../../../types';
import {
  mapGenreToInkos,
  mapGenreToMuse,
  mapRelationTypeToInkos,
  mapRelationTypeToMuse,
  mapArcTypeToInkos,
  mapArcTypeToMuse,
  mapWorldCategoryToInkos,
  mapWorldCategoryToMuse,
  ARC_TYPE_MAP,
  ARC_PHASE_MAP,
  ARC_TYPE_TO_TRAJECTORY,
  CHARACTER_ROLE_MAP_REVERSE,
} from './fieldMapper';

// ============================================
// 类型定义
// ============================================

/**
 * inkos Character 格式 (用于 story_bible.md)
 */
export interface InkosCharacter {
  name: string;
  role: string;
  archetype?: string;
  description?: string;
  alignment?: string;
  tags?: string[];
  desire?: string;
  fear?: string;
  signature?: string;
  contrast?: string;
  weakness?: string;
  arcType?: string;
  arcTypeLabel?: string;
  currentPhase?: string;
  currentPhaseLabel?: string;
  phaseProgress?: number;
  arcNotes?: string;
  relations?: Array<{
    type: string;
    typeLabel: string;
    targetName: string;
    description?: string;
    weight?: number;
    trajectory?: 'rising' | 'falling' | 'stable';
  }>;
  originLocation?: string;
  residence?: string;
  physicalStatus?: string;
  foreshadowingHooks?: string[];
}

/**
 * inkos WorldSetting 格式
 */
export interface InkosWorldSetting {
  category: string;
  categoryLabel: string;
  title: string;
  content: string;
  parentId?: string;
  importance?: number;
  tags?: string[];
}

/**
 * inkos PlotNode 格式
 */
export interface InkosPlotNode {
  order: number;
  title: string;
  content: string;
  beatTag?: string;
  beatTagLabel?: string;
  relatedCharacters?: string[];
  relatedLocations?: string[];
}

/**
 * inkos TimelineEvent 格式
 */
export interface InkosTimelineEvent {
  worldDate: string;
  title: string;
  description: string;
  type: string;
  involvedEntities?: string[];
}

/**
 * inkos Book Config 格式
 */
export interface InkosBookConfig {
  id: string;
  title: string;
  platform: string;
  genre: string;
  status: 'outlining' | 'writing' | 'revision' | 'completed';
  targetChapters: number;
  chapterWordCount: number;
  language: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * inkos Book Rules 格式
 */
export interface InkosBookRules {
  genreLock: {
    primary: string;
    forbidden: string[];
  };
  prohibitions: string[];
  eraConstraints: {
    enabled: boolean;
  };
  styleGuide: {
    tone: string;
    style: string;
    targetAudience: string;
    styleTags?: string[];
    promptProfile?: string;
  };
  referenceText?: string;
}

/**
 * inkos Current State 格式
 */
export interface InkosCurrentState {
  chapter: number;
  location: string;
  protagonistState: {
    status: string;
    currentGoal: string;
    constraints: string;
  };
  enemyForces: string[];
  knownTruths: string[];
  currentConflict: string;
  anchors: string[];
}

/**
 * inkos Story Bible 格式
 */
export interface InkosStoryBible {
  premise: string;
  characters: InkosCharacter[];
  worldSettings: InkosWorldSetting[];
  timeline: InkosTimelineEvent[];
}

/**
 * inkos Volume Outline 格式
 */
export interface InkosVolumeOutline {
  synopsis?: string;
  plotNodes: InkosPlotNode[];
}

// ============================================
// Muse -> inkos 转换
// ============================================

/**
 * 转换 Muse Character 为 inkos 格式
 */
export function transformCharacterToInkos(char: Character): InkosCharacter {
  const result: InkosCharacter = {
    name: char.name,
    role: char.role,
    archetype: char.archetype,
    description: char.description,
    alignment: char.alignment,
    tags: char.tags,
    desire: char.desire,
    fear: char.fear,
    signature: char.signature,
    contrast: char.contrast,
    weakness: char.weakness,
    originLocation: char.originLocation,
    residence: char.residence,
    physicalStatus: char.physicalStatus,
    foreshadowingHooks: char.foreshadowingHooks,
  };

  // 转换角色弧线
  if (char.arc) {
    result.arcType = char.arc.arcType;
    result.arcTypeLabel = ARC_TYPE_MAP[char.arc.arcType];
    result.currentPhase = char.arc.currentPhase;
    result.currentPhaseLabel = ARC_PHASE_MAP[char.arc.currentPhase];
    result.phaseProgress = char.arc.phaseProgress;
    result.arcNotes = char.arc?.notes;
  }

  // 转换关系网络
  if (char.structuredRelations && char.structuredRelations.length > 0) {
    result.relations = char.structuredRelations.map((rel) => ({
      type: rel.type || 'RELATED_TO',
      typeLabel: mapRelationTypeToInkos(rel.type || 'RELATED_TO'),
      targetName: rel.targetName || rel.targetCharacterName || '未知',
      description: rel.description,
      weight: rel.weight,
      trajectory: rel.trajectory,
    }));
  }

  return result;
}

/**
 * 转换 Muse WorldSetting 为 inkos 格式
 */
export function transformWorldSettingToInkos(setting: WorldSetting): InkosWorldSetting {
  return {
    category: setting.category,
    categoryLabel: mapWorldCategoryToInkos(setting.category),
    title: setting.title,
    content: setting.content,
    parentId: setting.parentId,
    importance: setting.importance,
    tags: setting.tags,
  };
}

/**
 * 转换 Muse PlotNode 为 inkos 格式
 */
export function transformPlotNodeToInkos(node: PlotNode): InkosPlotNode {
  return {
    order: node.order,
    title: node.title,
    content: node.content,
    beatTag: node.beatTag || undefined,
    relatedCharacters: node.relatedCharacters,
    relatedLocations: node.relatedLocations,
  };
}

/**
 * 转换 Muse Chapter 为 inkos 格式
 */
export function transformChapterToInkos(chapter: Chapter): {
  number: number;
  title: string;
  content?: string;
  synopsis?: string;
} {
  return {
    number: chapter.order,
    title: chapter.title,
    content: chapter.content,
    synopsis: chapter.summary,
  };
}

/**
 * 转换 Muse TimelineEvent 为 inkos 格式
 */
export function transformTimelineEventToInkos(event: TimelineEvent): InkosTimelineEvent {
  return {
    worldDate: event.worldDate,
    title: event.title,
    description: event.description,
    type: event.type,
    involvedEntities: event.involvedEntities,
  };
}

/**
 * 转换 Muse CreativeSettings 为 inkos Book Rules
 */
export function transformCreativeSettingsToBookRules(
  settings: CreativeSettings,
  genre: string
): InkosBookRules {
  const profileMap: Record<string, string> = {
    LITERARY: '文学风格',
    WEB_NOVEL: '网文风格',
  };

  return {
    genreLock: {
      primary: mapGenreToInkos(genre),
      forbidden: [],
    },
    prohibitions: ['过度使用形容词堆砌', '人物行为不符合设定', '破坏第四面墙'],
    eraConstraints: {
      enabled: false,
    },
    styleGuide: {
      tone: settings.tone,
      style: settings.style,
      targetAudience: settings.targetAudience,
      styleTags: settings.styleTags,
      promptProfile: settings.promptProfile ? profileMap[settings.promptProfile] : undefined,
    },
    referenceText: settings.referenceText,
  };
}

// ============================================
// inkos -> Muse 转换
// ============================================

/**
 * 转换 inkos Character 为 Muse 格式
 */
export function transformCharacterToMuse(
  inkosChar: InkosCharacter,
  id: string
): Character {
  const result: Character = {
    id,
    name: inkosChar.name,
    role: inkosChar.role,
    archetype: inkosChar.archetype || '',
    description: inkosChar.description || '',
    alignment: inkosChar.alignment,
    tags: inkosChar.tags,
    desire: inkosChar.desire,
    fear: inkosChar.fear,
    signature: inkosChar.signature,
    contrast: inkosChar.contrast,
    weakness: inkosChar.weakness,
    originLocation: inkosChar.originLocation,
    residence: inkosChar.residence,
    physicalStatus: inkosChar.physicalStatus,
    foreshadowingHooks: inkosChar.foreshadowingHooks,
  };

  // 转换角色弧线
  if (inkosChar.arcType) {
    const arcType = mapArcTypeToMuse(inkosChar.arcType) as ArcType;
    const currentPhase = (inkosChar.currentPhase || 'setup') as ArcPhase;

    result.arc = {
      arcType,
      currentPhase,
      phaseProgress: inkosChar.phaseProgress || 0,
      notes: inkosChar.arcNotes,
    };
  }

  // 转换关系网络
  if (inkosChar.relations && inkosChar.relations.length > 0) {
    result.structuredRelations = inkosChar.relations.map((rel, index) => ({
      id: `rel-${id}-${index}`,
      targetName: rel.targetName,
      type: mapRelationTypeToMuse(rel.type) as CharacterRelationType,
      description: rel.description,
      weight: rel.weight,
      trajectory: rel.trajectory,
    }));
  }

  return result;
}

/**
 * 转换 inkos WorldSetting 为 Muse 格式
 */
export function transformWorldSettingToMuse(
  inkosSetting: InkosWorldSetting,
  id: string
): WorldSetting {
  return {
    id,
    category: mapWorldCategoryToMuse(inkosSetting.category) as WorldSetting['category'],
    title: inkosSetting.title,
    content: inkosSetting.content,
    parentId: inkosSetting.parentId,
    importance: inkosSetting.importance,
    tags: inkosSetting.tags,
  };
}

/**
 * 转换 inkos PlotNode 为 Muse 格式
 */
export function transformPlotNodeToMuse(inkosNode: InkosPlotNode, id: string): PlotNode {
  return {
    id,
    title: inkosNode.title,
    content: inkosNode.content,
    order: inkosNode.order,
    beatTag: inkosNode.beatTag as PlotNode['beatTag'],
    relatedCharacters: inkosNode.relatedCharacters,
    relatedLocations: inkosNode.relatedLocations,
  };
}

/**
 * 转换 inkos Book Config 为 Muse 项目元数据
 */
export function transformBookConfigToMuse(inkosConfig: InkosBookConfig): {
  title: string;
  genre: string;
  wordCountGoal: number;
} {
  return {
    title: inkosConfig.title,
    genre: mapGenreToMuse(inkosConfig.genre),
    wordCountGoal: inkosConfig.targetChapters * inkosConfig.chapterWordCount,
  };
}

// ============================================
// 批量转换函数
// ============================================

/**
 * 批量转换 Characters
 */
export function transformCharactersToInkos(chars: Character[]): InkosCharacter[] {
  return chars.map(transformCharacterToInkos);
}

export function transformCharactersToMuse(
  inkosChars: InkosCharacter[]
): Character[] {
  return inkosChars.map((char, index) =>
    transformCharacterToMuse(char, `char-${index + 1}`)
  );
}

/**
 * 批量转换 WorldSettings
 */
export function transformWorldSettingsToInkos(
  settings: WorldSetting[]
): InkosWorldSetting[] {
  return settings.map(transformWorldSettingToInkos);
}

export function transformWorldSettingsToMuse(
  inkosSettings: InkosWorldSetting[]
): WorldSetting[] {
  return inkosSettings.map((setting, index) =>
    transformWorldSettingToMuse(setting, `world-${index + 1}`)
  );
}

/**
 * 批量转换 PlotNodes
 */
export function transformPlotNodesToInkos(nodes: PlotNode[]): InkosPlotNode[] {
  return nodes.map(transformPlotNodeToInkos);
}

export function transformPlotNodesToMuse(inkosNodes: InkosPlotNode[]): PlotNode[] {
  return inkosNodes.map((node, index) =>
    transformPlotNodeToMuse(node, `plot-${index + 1}`)
  );
}

/**
 * 批量转换 TimelineEvents
 */
export function transformTimelineEventsToInkos(
  events: TimelineEvent[]
): InkosTimelineEvent[] {
  return events.map(transformTimelineEventToInkos);
}
