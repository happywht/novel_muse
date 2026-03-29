import { Character, WorldSetting, Echo, Chapter } from '../../types';
import { getDisplayRelationships } from '../../utils/characterRelations';

// TypeScript类型声明（避免使用any）
interface Segment {
  isWordLike: boolean;
  segment: string;
}

interface Segmenter {
  segment(input: string): IterableIterator<Segment>;
}

interface IntlWithSegmenter {
  Segmenter?: new (locale: string, options?: any) => Segmenter;
}

/**
 * NEW: Client-side RAG-lite Relevance Filter
 * Filters a large list of settings down to the most relevant ones based on current context
 */
export const filterRelevantSettings = (
  allSettings: WorldSetting[],
  queryContext: string,
  limit: number = 20
): WorldSetting[] => {
  // If the dataset is small, just return everything to ensure serendipity
  if (allSettings.length <= limit) return allSettings;

  const safeQuery = queryContext.toLowerCase();

  // Tokenize query for better matching (if browser supports Intl.Segmenter)
  let queryTokens: string[] = [];
  const intlWithSegmenter = Intl as unknown as IntlWithSegmenter;
  if (typeof Intl !== 'undefined' && intlWithSegmenter.Segmenter) {
    const segmenter = new intlWithSegmenter.Segmenter('zh', { granularity: 'word' });
    queryTokens = [...segmenter.segment(safeQuery)]
      .filter((w) => w.isWordLike && w.segment.length > 1) // Filter out single chars/punctuation
      .map((w) => w.segment);
  } else {
    // Fallback: simple split by space/punctuation or just use the full string check
    queryTokens = safeQuery.split(/[\s,，.。！!?？]+/);
  }

  // Remove duplicates
  queryTokens = [...new Set(queryTokens)];

  const scored = allSettings.map((s) => {
    let score = 0;
    const sTitle = s.title.toLowerCase();
    const sContent = s.content.toLowerCase();

    // 1. Title Match (Strongest signal)
    // If the setting title appears in the query (e.g. "Ice Kingdom" in plot beat)
    if (safeQuery.includes(sTitle)) score += 50;

    // 2. Reverse Title Match
    // If query keywords appear in the title
    queryTokens.forEach((token) => {
      if (sTitle.includes(token)) score += 5;
    });

    // 3. Content Match (Weaker signal)
    // If query keywords appear in the setting content
    queryTokens.forEach((token) => {
      if (sContent.includes(token)) score += 1;
    });

    return { setting: s, score };
  });

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // Return top N
  return scored.slice(0, limit).map((item) => item.setting);
};

/**
 * Helper to format context with Dynamic Echoes
 */
export const formatContext = (
  characters: Character[],
  worldSettings: WorldSetting[],
  echoes: Echo[] = []
) => {
  let context = '';

  // Filter only accepted echoes
  const activeEchoes = echoes.filter((e) => e.status === 'ACCEPTED');

  if (characters.length > 0) {
    context += '【活跃角色档案 (静态设定 + 动态状态)】\n';
    characters.forEach((c) => {
      // Find echoes for this character
      const charEchoes = activeEchoes
        .filter((e) => e.targetId === c.id)
        .sort((a, b) => a.timestamp - b.timestamp);

      context += `- ${c.name} (${c.role}): ${c.description.slice(0, 150)}...\n`;
      // 使用结构化关系生成展示字符串（替代直接访问 c.relationships）
      const displayRelations = getDisplayRelationships(c.structuredRelations);
      if (displayRelations) {
        context += `  关系/羁绊: ${displayRelations}\n`;
      } else if (c.relationships) {
        // 向后兼容：如果没有结构化关系，回退到旧格式
        context += `  关系/羁绊: ${c.relationships}\n`;
      }

      // Inject Dynamic State
      if (charEchoes.length > 0) {
        context += `  ⚡ [当前状态变更/重要经历]:\n`;
        charEchoes.forEach((e) => {
          context += `    * ${e.description} (原因: ${e.reason})\n`;
        });
      }
    });
    context += '\n';
  }

  if (worldSettings.length > 0) {
    context += '【世界观设定 (静态规则 + 历史变迁)】\n';
    worldSettings.forEach((w) => {
      const worldEchoes = activeEchoes
        .filter((e) => e.targetId === w.id)
        .sort((a, b) => a.timestamp - b.timestamp);

      context += `- [${w.category}] ${w.title}: ${w.content.slice(0, 150)}...\n`;

      // Inject Dynamic State
      if (worldEchoes.length > 0) {
        context += `  ⚡ [环境/规则变更]:\n`;
        worldEchoes.forEach((e) => {
          context += `    * ${e.description} (原因: ${e.reason})\n`;
        });
      }
    });
    context += '\n';
  }

  return context;
};

/**
 * NEW: Formats a lookup table of entities (Characters and WorldSettings)
 * for the AI to precisely resolve IDs instead of relying on fuzzy name matching.
 */
export const formatEntityLookupTable = (characters: Character[], worldSettings: WorldSetting[]) => {
  let output = '=== ENTITY LOOKUP TABLE (ID MAPPING) ===\n';
  output += 'ID | Name/Title | Type\n';
  output += '---|---|---\n';

  characters.forEach((c) => {
    output += `${c.id} | ${c.name} | CHARACTER\n`;
  });

  worldSettings.forEach((w) => {
    output += `${w.id} | ${w.title} | WORLD\n`;
  });

  output += '========================================\n';
  return output;
};

/**
 * NEW: Tiered Memory System (L1/L2/L3)
 * L1: Recent full text (Last 1-2 chapters)
 * L2: Medium-term summaries (Last 10 chapters)
 * L3: Long-term anchors (Plot Outline, World Bible, Character Archetypes)
 */
export const buildTieredMemory = (
  allChapters: Chapter[],
  currentChapterOrder: number,
  plotOutline?: string,
  characters: Character[] = [],
  worldSettings: WorldSetting[] = [],
  echoes: Echo[] = [],
  graphContext?: string // NEW: Optional specific Knowledge Graph subgraph
): string => {
  let context = '';

  // Sort chapters by order to be safe
  const sortedChapters = [...allChapters].sort((a, b) => a.order - b.order);
  const previousChapters = sortedChapters.filter((c) => c.order < currentChapterOrder);

  // --- L3: Long-term anchors ---
  if (graphContext) {
    context += '【🧠 L3+: 核心知识图谱片段 (Knowledge Graph Subgraph)】\n';
    context += graphContext + '\n\n';
  }

  context += '【📌 L3: 长期战略锚点 (Long-term Anchors)】\n';
  if (plotOutline) {
    context += `1. [核心剧情大纲]: ${plotOutline}\n`;
  }

  // Character archetypes
  if (characters.length > 0) {
    context += `2. [核心角色人设]: ${characters.map((c) => `${c.name}(${c.role}/${c.archetype})`).join(', ')}\n`;
  }

  // Relevant world settings (lite filter)
  const topSettings = filterRelevantSettings(worldSettings, plotOutline || '', 5);
  if (topSettings.length > 0) {
    context += `3. [关键世界观设定]: ${topSettings.map((s) => `[${s.title}]`).join(', ')}\n`;
  }
  context += '\n';

  // --- L2: Medium-term summaries (Last 10 chapters) ---
  const l2Chapters = previousChapters.slice(-10);
  if (l2Chapters.length > 0) {
    context += '【📜 L2: 中期故事脉络 (Medium-term Arc - Last 10 Chapters)】\n';
    l2Chapters.forEach((c) => {
      const summary = c.summary || '(尚未生成摘要，请根据剧情自行衔接)';
      context += `第${c.order}章《${c.title}》摘要: ${summary}\n`;
    });
    context += '\n';
  }

  // --- L1: Recent full text (Last 1 chapter) ---
  const lastChapter = previousChapters[previousChapters.length - 1];
  if (lastChapter && lastChapter.content) {
    context += '【📖 L1: 近期即时细节 (Recent Details - Last Chapter Text)】\n';
    // Take the last 2000 characters to prevent token overflow while keeping enough context
    const recentText = lastChapter.content.slice(-2000);
    context += `(接续第${lastChapter.order}章末尾): ...${recentText}\n\n`;
  }

  return context;
};
