/**
 * World Building Templates
 *
 * Templates for world building operations: settings, lore, state changes, echoes, etc.
 */

import {
  VariableTier,
  VariableSource,
  BlockMetadata,
  PromptBlock,
} from '../../types/promptTemplate';

// Re-export interfaces
export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  category: 'generation' | 'analysis' | 'refinement' | 'utility';
  systemInstruction: string;
  userPromptBlocks: PromptBlock[];
  variables: TemplateVariable[];
  metadata?: {
    version?: string;
    author?: string;
    lastUpdated?: string;
    tags?: string[];
  };
}

export interface TemplateVariable {
  name: string;
  type: 'string' | 'string[]' | 'number' | 'boolean' | 'object';
  tier: VariableTier;
  source: VariableSource;
  required: boolean;
  description: string;
  display?: string;
  defaultValue?: unknown;
}

// ============================================================
// Batch Generate Settings Template
// ============================================================

/**
 * Batch Generate Settings Template
 *
 * Used for generating multiple world settings at once based on premise, genre, and category.
 */
const BATCH_GENERATE_SETTINGS_TEMPLATE: PromptTemplate = {
  id: 'batch_generate_settings',
  name: 'Batch Generate World Settings',
  description: 'Generate multiple world settings/lore entries at once based on story context',
  category: 'generation',
  systemInstruction: `You are a world-building expert for novels and creative writing. Your task is to create rich, immersive world settings that:

1. Establish clear rules and logic for the fictional world
2. Create atmosphere and mood that supports the story
3. Provide interesting opportunities for plot and conflict
4. Maintain internal consistency across all settings
5. Feel authentic and lived-in, not just backdrop

Build worlds that readers will want to explore and understand.`,

  userPromptBlocks: [
    // Block 1: Story Context
    {
      id: 'story_context',
      title: 'Story Context',
      order: 1,
      template: `[Story Premise]
{{premise}}

[Genre]
{{genre}}

[Category]
{{category}}

[Number of Entries to Generate]
{{count}}`,
      metadata: {
        tier: 'context',
        isStatic: false,
        dataSource: 'user_input',
        description: 'Story premise, genre and category for world-building'
      }
    },

    // Block 2: Category Guidance
    {
      id: 'category_guidance',
      title: 'Category Guidance',
      order: 2,
      template: `[Category-Specific Guidance]
{{categoryGuidance}}`,
      condition: 'categoryGuidance != null && categoryGuidance !== ""',
      metadata: {
        tier: 'constraint',
        isStatic: false,
        dataSource: 'user_input',
        description: 'Category-specific guidance for setting generation'
      }
    },

    // Block 3: General Requirements
    {
      id: 'general_requirements',
      title: 'General Requirements',
      order: 3,
      template: `[General Requirements for World Settings]
Each setting entry should include:

1. **Title**: A clear, memorable name for this setting element
2. **Category**: The type of world element (e.g., geography, culture, magic system, history)
3. **Content**: Detailed description with concrete details and examples
4. **Implications**: How this setting affects the story and characters
5. **Connections**: Links to other world elements or potential plot hooks

Requirements:
- Settings should feel organic and interconnected
- Avoid info-dump style descriptions; make them feel discoverable
- Include sensory details and concrete specifics
- Consider how settings create story opportunities
- Maintain consistency with the established genre and tone

Output {{count}} distinct setting entries in the specified category.`,
      metadata: {
        tier: 'task',
        isStatic: true,
        dataSource: 'static',
        description: 'Static task requirements and output format for world settings'
      }
    },
  ],

  variables: [
    // === CRITICAL VARIABLES ===
    {
      name: 'premise',
      type: 'string',
      tier: 'critical',
      source: 'user_input',
      required: true,
      description: 'The story premise for world-building context',
      display: 'Story Premise',
    },
    {
      name: 'genre',
      type: 'string',
      tier: 'critical',
      source: 'project_state',
      required: true,
      description: 'The novel genre for setting style guidance',
      display: 'Novel Genre',
    },
    {
      name: 'category',
      type: 'string',
      tier: 'critical',
      source: 'user_input',
      required: true,
      description: 'The category of world settings to generate',
      display: 'Setting Category',
    },
    {
      name: 'count',
      type: 'number',
      tier: 'critical',
      source: 'user_input',
      required: true,
      description: 'Number of setting entries to generate',
      display: 'Entry Count',
      defaultValue: 5,
    },
    // === OPTIONAL VARIABLES ===
    {
      name: 'categoryGuidance',
      type: 'string',
      tier: 'optional',
      source: 'user_input',
      required: false,
      description: 'Additional guidance specific to the category',
      display: 'Category Guidance',
    },
  ],

  metadata: {
    version: '1.0.0',
    author: 'Muse System',
    lastUpdated: '2026-03-27',
    tags: ['world-building', 'settings', 'generation', 'batch', 'creative-writing'],
  },
};

// ============================================================
// Expand World Lore Template
// ============================================================

/**
 * Expand World Lore Template
 *
 * Used for expanding existing world settings with more detail.
 */
const EXPAND_WORLD_LORE_TEMPLATE: PromptTemplate = {
  id: 'expand_world_lore',
  name: 'Expand World Lore',
  description: 'Expand and deepen existing world setting entries with more detail',
  category: 'refinement',
  systemInstruction: `You are a world-building specialist focused on deepening and enriching existing world lore. Your task is to expand world settings with:

1. Greater detail and specificity
2. New connections and implications
3. Deeper historical or cultural context
4. More vivid sensory descriptions
5. Additional plot-relevant elements

Expand while maintaining consistency with the existing content.`,

  userPromptBlocks: [
    // Block 1: Genre Context
    {
      id: 'genre_context',
      title: 'Genre Context',
      order: 1,
      template: `[Genre]
{{genre}}

[Setting Title]
{{title}}`,
      metadata: {
        tier: 'context',
        isStatic: false,
        dataSource: 'user_input',
        description: 'Genre and setting title for context'
      }
    },

    // Block 2: Current Setting Content
    {
      id: 'current_content',
      title: 'Current Setting Content',
      order: 2,
      template: `[Current Setting Content]
{{currentContent}}`,
      metadata: {
        tier: 'context',
        isStatic: false,
        dataSource: 'user_input',
        description: 'Current world setting content to expand'
      }
    },

    // Block 3: Task Requirements
    {
      id: 'task_requirements',
      title: 'Task Requirements',
      order: 3,
      template: `[Expansion Requirements]
Please expand and deepen the above world setting by:

1. **Adding Detail**: Elaborate on existing points with concrete examples, names, dates, or sensory details
2. **Deepening Context**: Add historical background, cultural significance, or cause-and-effect relationships
3. **Creating Connections**: Link to other potential world elements or story opportunities
4. **Enhancing Atmosphere**: Include more vivid descriptions that create mood and setting
5. **Practical Implications**: Explain how this affects daily life, characters, or plot possibilities

Requirements:
- Maintain consistency with the original content
- Do not contradict established facts
- Add depth without unnecessary length
- Make the world feel more lived-in and real
- Keep the genre and tone in mind

Output the expanded setting in a clear, organized format.`,
      metadata: {
        tier: 'task',
        isStatic: true,
        dataSource: 'static',
        description: 'Static expansion requirements and guidelines'
      }
    },
  ],

  variables: [
    // === CRITICAL VARIABLES ===
    {
      name: 'genre',
      type: 'string',
      tier: 'critical',
      source: 'project_state',
      required: true,
      description: 'The novel genre for tone and style guidance',
      display: 'Novel Genre',
    },
    {
      name: 'title',
      type: 'string',
      tier: 'critical',
      source: 'user_input',
      required: true,
      description: 'Title of the setting to expand',
      display: 'Setting Title',
    },
    {
      name: 'currentContent',
      type: 'string',
      tier: 'critical',
      source: 'user_input',
      required: true,
      description: 'Current content of the setting to expand',
      display: 'Current Content',
    },
  ],

  metadata: {
    version: '1.0.0',
    author: 'Muse System',
    lastUpdated: '2026-03-27',
    tags: ['world-building', 'expansion', 'refinement', 'lore', 'creative-writing'],
  },
};

// ============================================================
// Analyze State Changes Template
// ============================================================

/**
 * Analyze State Changes Template
 *
 * Used for extracting state change recommendations from scene content.
 * Based on analyzeStateChanges in services/gemini/world.ts
 */
const ANALYZE_STATE_CHANGES_TEMPLATE: PromptTemplate = {
  id: 'analyze_state_changes',
  name: 'Analyze State Changes',
  description: 'Extract state change recommendations for characters and world settings from scene content',
  category: 'analysis',
  systemInstruction: `You are a professional novel setting analyst. Your task is to analyze text fragments and identify **permanent or significant events** that affect [character states] or [world environment].

Focus on:
1. Permanent character state changes (death, disability, gaining/losing abilities)
2. Acquiring plot-significant items
3. Qualitative changes in relationships
4. World rule changes or violations
5. Secrets being revealed

Do NOT extract ordinary conversations, temporary states, or common items.`,

  userPromptBlocks: [
    // Block 1: Context
    {
      id: 'context',
      title: 'Context Information',
      order: 1,
      template: `{{contextSection}}
{{foreshadowingSection}}`,
      condition: 'contextSection != null || foreshadowingSection != null',
      metadata: {
        tier: 'context',
        isStatic: false,
        dataSource: 'computed',
        description: '前文背景和待回收伏笔等上下文信息',
      },
    },

    // Block 2: Entity Lookup Table
    {
      id: 'lookup_table',
      title: 'Entity Lookup Table',
      order: 2,
      template: `[Available Entities for Matching]:
{{lookupTable}}`,
      metadata: {
        tier: 'context',
        isStatic: false,
        dataSource: 'computed',
        description: '实体映射表，用于ID匹配和实体名称验证',
      },
    },

    // Block 3: Scene Content
    {
      id: 'scene_content',
      title: 'Text to Analyze',
      order: 3,
      template: `[Text to Analyze]:
{{sceneContent}}`,
      metadata: {
        tier: 'task',
        isStatic: false,
        dataSource: 'user_input',
        description: '待分析的场景文本内容',
      },
    },

    // Block 4: Task Requirements
    {
      id: 'task_requirements',
      title: 'Extraction Requirements',
      order: 4,
      template: `[Major Event Definition] (Must meet at least one):
1. Permanent character state change: death, disability, gaining/losing important abilities
2. Acquiring plot-significant items: non-ordinary items that affect future plot
3. Qualitative relationship changes: ally to enemy, new relationships, relationship breakdown
4. World rules broken or changed: important location destruction, power structure changes
5. Secrets revealed: important information affecting future plot

[Non-Major Events] (Do NOT extract):
- Ordinary conversations (even with emotional exchange)
- Location movement (unless triggering major events above)
- Temporary states (minor injuries that heal quickly)
- Acquiring ordinary items (food, money, daily necessities)

[Output Requirements]:
1. targetId: Must match ID exactly from entity lookup table, leave empty if no match
2. targetName: Entity name, must exactly match name in lookup table
3. confidence: Confidence score
   - 0.9-1.0: Very certain, explicit description in text
   - 0.7-0.9: Fairly certain, reasonable inference
   - 0.5-0.7: Generally certain, multiple possible interpretations
   - <0.5: Uncertain, recommend not extracting
4. extractionEvidence: Specific sentences from text supporting this extraction, must quote original text

Output in JSON format. If no major events, return empty array [].`,
      metadata: {
        tier: 'constraint',
        isStatic: true,
        dataSource: 'static',
        description: '提取规则定义，包含重大事件判定标准和输出格式要求',
      },
    },
  ],

  variables: [
    // === CRITICAL VARIABLES ===
    {
      name: 'sceneContent',
      type: 'string',
      tier: 'critical',
      source: 'user_input',
      required: true,
      description: 'The scene content text to analyze for state changes',
      display: '场景内容',
    },
    {
      name: 'lookupTable',
      type: 'string',
      tier: 'critical',
      source: 'computed',
      required: true,
      description: 'Formatted entity lookup table for ID matching',
      display: '实体映射表',
    },
    // === OPTIONAL VARIABLES ===
    {
      name: 'contextSection',
      type: 'string',
      tier: 'optional',
      source: 'computed',
      required: false,
      description: 'Recent chapter summary context',
      display: '前文背景',
    },
    {
      name: 'foreshadowingSection',
      type: 'string',
      tier: 'optional',
      source: 'computed',
      required: false,
      description: 'Unresolved foreshadowing clues',
      display: '待回收伏笔',
    },
  ],

  metadata: {
    version: '1.0.0',
    author: 'Muse System',
    lastUpdated: '2026-03-28',
    tags: ['analysis', 'state-changes', 'echo', 'extraction'],
  },
};

// ============================================================
// Extract Echoes Template
// ============================================================

/**
 * Extract Echoes Template
 *
 * Used for automatic Echo capture from generated text.
 * Based on extractEchoesFromText in services/gemini/world.ts
 */
const EXTRACT_ECHOES_TEMPLATE: PromptTemplate = {
  id: 'extract_echoes',
  name: 'Extract Echoes',
  description: 'Automatically extract Echo events (state changes) from novel text with knowledge graph integration',
  category: 'analysis',
  systemInstruction: `You are an expert narrative analyst specializing in tracking story continuity and state changes. Your task is to:

1. Identify significant events that change character or world states
2. Extract structured triples for knowledge graph integration
3. Provide confidence scores for extraction quality
4. Quote evidence from original text

Focus on events that have lasting impact on the story world.`,

  userPromptBlocks: [
    // Block 1: Entity Lookup
    {
      id: 'entity_lookup',
      title: 'Entity Reference',
      order: 1,
      template: `[Available Entities for Matching]:
{{lookupTable}}`,
      metadata: {
        tier: 'context',
        isStatic: false,
        dataSource: 'computed',
        description: '实体映射表，用于ID匹配和实体名称验证',
      },
    },

    // Block 2: Text to Analyze
    {
      id: 'text_content',
      title: 'Novel Text Fragment',
      order: 2,
      template: `[Novel Text Fragment]:
{{text}}`,
      metadata: {
        tier: 'task',
        isStatic: false,
        dataSource: 'user_input',
        description: '待提取Echo的小说文本片段',
      },
    },

    // Block 3: Recent Changes Context
    {
      id: 'recent_changes',
      title: 'Recent Confirmed Changes',
      order: 3,
      template: `[Recent Confirmed State Changes]:
{{recentChangesSummary}}`,
      condition: 'recentChangesSummary != null && recentChangesSummary !== ""',
      metadata: {
        tier: 'context',
        isStatic: false,
        dataSource: 'computed',
        description: '最近已确认的状态变化摘要，用于避免重复提取',
      },
    },

    // Block 4: Extraction Requirements
    {
      id: 'extraction_requirements',
      title: 'Extraction Requirements',
      order: 4,
      template: `[Extraction Guidelines]:
1. targetId: Match ID from entity table if possible
2. targetName: Entity name (must match table)
3. description: What happened? (Concise, e.g., "Lost left arm", "Obtained Magic Sword")
4. reason: Why is this significant?
5. confidence: 0-1 score (0.9+ = very certain, 0.7-0.9 = likely, <0.7 = uncertain)
6. extractionEvidence: Exact sentence from text supporting extraction
7. triples: Array of knowledge graph triples (subject, relation, object)

Output in JSON format. If no significant events, return empty array [].`,
      metadata: {
        tier: 'constraint',
        isStatic: true,
        dataSource: 'static',
        description: '提取指南，包含字段定义、置信度评分标准和知识图谱三元组格式',
      },
    },
  ],

  variables: [
    // === CRITICAL VARIABLES ===
    {
      name: 'text',
      type: 'string',
      tier: 'critical',
      source: 'user_input',
      required: true,
      description: 'Novel text to extract echoes from',
      display: '小说正文',
    },
    {
      name: 'lookupTable',
      type: 'string',
      tier: 'critical',
      source: 'computed',
      required: true,
      description: 'Formatted entity lookup table',
      display: '实体映射表',
    },
    // === OPTIONAL VARIABLES ===
    {
      name: 'recentChangesSummary',
      type: 'string',
      tier: 'optional',
      source: 'computed',
      required: false,
      description: 'Summary of recent confirmed state changes',
      display: '最近状态变化',
    },
  ],

  metadata: {
    version: '1.0.0',
    author: 'Muse System',
    lastUpdated: '2026-03-28',
    tags: ['analysis', 'echo', 'extraction', 'knowledge-graph'],
  },
};

// ============================================================
// Consolidate Memory Template
// ============================================================

/**
 * Consolidate Memory Template
 *
 * Used for consolidating recent Echo events into static descriptions.
 * Based on consolidateMemory in services/gemini/world.ts
 */
const CONSOLIDATE_MEMORY_TEMPLATE: PromptTemplate = {
  id: 'consolidate_memory',
  name: 'Consolidate Memory',
  description: 'Integrate recent events (Echoes) into entity descriptions for long-term memory',
  category: 'refinement',
  systemInstruction: `You are an archivist responsible for maintaining novel world consistency. Your task is to permanently integrate [recent events] (short-term memory) into [entity descriptions] (long-term memory).

Consolidation rules:
1. Update state: If new memory changes entity state (injury, lost items, gained abilities), reflect in description
2. Enrich background: Write occurred events as "past history"
3. Maintain coherence: Don't simply append text, rewrite description to be smooth and natural
4. Simplify: Remove no-longer-important details, keep core traits and key changes`,

  userPromptBlocks: [
    // Block 1: Entity Information
    {
      id: 'entity_info',
      title: 'Entity Information',
      order: 1,
      template: `[Entity Name]: {{targetName}} ({{targetType}})`,
      metadata: {
        tier: 'context',
        isStatic: false,
        dataSource: 'user_input',
        description: '目标实体名称和类型'
      }
    },

    // Block 2: Current Description
    {
      id: 'current_description',
      title: 'Current Archive Description',
      order: 2,
      template: `[Current Archive Description]:
{{currentDescription}}`,
      metadata: {
        tier: 'context',
        isStatic: false,
        dataSource: 'user_input',
        description: '实体当前的归档描述'
      }
    },

    // Block 3: New Memories
    {
      id: 'new_memories',
      title: 'New Memories to Consolidate',
      order: 3,
      template: `[New Memories to Consolidate (Recent Events)]:
{{echoText}}`,
      metadata: {
        tier: 'context',
        isStatic: false,
        dataSource: 'computed',
        description: '待整合的新记忆事件'
      }
    },

    // Block 4: Task Requirements
    {
      id: 'task_requirements',
      title: 'Consolidation Requirements',
      order: 4,
      template: `[Consolidation Rules]:
1. **Update State**: If new memory changes entity state (injury, lost items, gained abilities), reflect in description
2. **Enrich Background**: Write occurred events as "past history"
3. **Maintain Coherence**: Don't simply append text, rewrite description to be smooth and natural
4. **Simplify**: Remove no-longer-important details, keep core traits and key changes

Output the consolidated [New Archive Description] directly (plain text, no Markdown format).`,
      metadata: {
        tier: 'constraint',
        isStatic: true,
        dataSource: 'static',
        description: '记忆整合规则和输出格式要求'
      }
    },
  ],

  variables: [
    // === CRITICAL VARIABLES ===
    {
      name: 'targetName',
      type: 'string',
      tier: 'critical',
      source: 'user_input',
      required: true,
      description: 'Name of the entity (character or world setting)',
      display: '实体名称',
    },
    {
      name: 'targetType',
      type: 'string',
      tier: 'critical',
      source: 'user_input',
      required: true,
      description: 'Type of entity: CHARACTER or WORLD',
      display: '实体类型',
    },
    {
      name: 'currentDescription',
      type: 'string',
      tier: 'critical',
      source: 'user_input',
      required: true,
      description: 'Current description of the entity',
      display: '当前描述',
    },
    {
      name: 'echoText',
      type: 'string',
      tier: 'critical',
      source: 'computed',
      required: true,
      description: 'Formatted list of recent events to consolidate',
      display: '待整合记忆',
    },
  ],

  metadata: {
    version: '1.0.0',
    author: 'Muse System',
    lastUpdated: '2026-03-28',
    tags: ['memory', 'consolidation', 'refinement', 'archive'],
  },
};

// ============================================================
// Deduce World Consequences Template
// ============================================================

/**
 * Deduce World Consequences Template
 *
 * Used for deducing world consequences based on recent echoes (Butterfly Effect).
 * Based on deduceWorldConsequences in services/gemini/world.ts
 */
const DEDUCE_WORLD_CONSEQUENCES_TEMPLATE: PromptTemplate = {
  id: 'deduce_world_consequences',
  name: 'Deduce World Consequences',
  description: 'Predict chain reactions and consequences based on recent events using butterfly effect logic',
  category: 'analysis',
  systemInstruction: `You are an omniscient world simulator (World Engine). Your task is to deduce **chain reactions** (Consequences) based on [recent events] (Triggers) and [dynamic knowledge graph] (Knowledge Graph) for the [world] and [characters].

Deduction rules:
1. Butterfly Effect: Small events can trigger big changes
2. Entity Matching: Select affected entities from lookup table, return correct targetId
3. Graph Integration: Use character relationships (hatred, kinship, subordination) or geographic attribution from knowledge graph to find chain reaction triggers
4. Logical Consistency: Deductions must fit world settings
5. Create Conflict: Predicted results should add tension and conflict to the story`,

  userPromptBlocks: [
    // Block 1: Genre Context
    {
      id: 'genre_context',
      title: 'Genre Context',
      order: 1,
      template: `[Novel Genre]: {{genre}}`,
      metadata: {
        tier: 'context',
        isStatic: false,
        dataSource: 'computed',
        description: '小说类型用于推理上下文'
      }
    },

    // Block 2: Trigger Events
    {
      id: 'trigger_events',
      title: 'Recent Trigger Events',
      order: 2,
      template: `[Recent Events (Triggers)]:
{{triggers}}`,
      metadata: {
        tier: 'context',
        isStatic: false,
        dataSource: 'computed',
        description: '触发链式反应的最近事件列表'
      }
    },

    // Block 3: Entity Lookup
    {
      id: 'entity_lookup',
      title: 'Available Entities',
      order: 3,
      template: `[Available Entities to Find Affected Targets]:
{{lookupTable}}`,
      metadata: {
        tier: 'context',
        isStatic: false,
        dataSource: 'computed',
        description: '实体映射表用于查找受影响目标'
      }
    },

    // Block 4: Graph Context
    {
      id: 'graph_context',
      title: 'Knowledge Graph Context',
      order: 4,
      template: `[Dynamic Knowledge Graph]:
{{graphContext}}`,
      condition: 'graphContext != null && graphContext !== ""',
      metadata: {
        tier: 'context',
        isStatic: false,
        dataSource: 'computed',
        description: '知识图谱上下文用于关系推理'
      }
    },

    // Block 5: Deduction Requirements
    {
      id: 'deduction_requirements',
      title: 'Deduction Requirements',
      order: 5,
      template: `[Deduction Rules]:
1. **Butterfly Effect**: Small event can trigger big change (e.g., king assassinated -> succession war -> civil war)
2. **Entity Matching**: Must select affected entities from provided lookup table, return correct targetId
3. **Graph Integration (Important)**: Must use character relationships (hatred, kinship, subordination) or geographic attribution from knowledge graph above to find chain reaction triggers
4. **Logical Consistency**: Deductions must fit world settings
5. **Create Conflict**: Predicted results should add tension and conflict to story
6. **Mandatory Chinese Output**: All content in JSON result must use proper Chinese

Output [Future Predictions] strictly in JSON format.`,
      metadata: {
        tier: 'constraint',
        isStatic: true,
        dataSource: 'static',
        description: '推理规则和输出格式要求'
      }
    },
  ],

  variables: [
    // === CRITICAL VARIABLES ===
    {
      name: 'genre',
      type: 'string',
      tier: 'critical',
      source: 'project_state',
      required: true,
      description: 'Novel genre for context',
      display: '小说类型',
    },
    {
      name: 'triggers',
      type: 'string',
      tier: 'critical',
      source: 'computed',
      required: true,
      description: 'Formatted list of recent trigger events',
      display: '触发事件',
    },
    {
      name: 'lookupTable',
      type: 'string',
      tier: 'critical',
      source: 'computed',
      required: true,
      description: 'Entity lookup table for finding affected targets',
      display: '实体映射表',
    },
    // === OPTIONAL VARIABLES ===
    {
      name: 'graphContext',
      type: 'string',
      tier: 'optional',
      source: 'computed',
      required: false,
      description: 'Knowledge graph context for relationship inference',
      display: '知识图谱上下文',
    },
  ],

  metadata: {
    version: '1.0.0',
    author: 'Muse System',
    lastUpdated: '2026-03-28',
    tags: ['analysis', 'consequences', 'butterfly-effect', 'prediction'],
  },
};

// ============================================================
// World Templates Export
// ============================================================

export const WORLD_TEMPLATES = {
  batch_generate_settings: BATCH_GENERATE_SETTINGS_TEMPLATE,
  expand_world_lore: EXPAND_WORLD_LORE_TEMPLATE,
  analyze_state_changes: ANALYZE_STATE_CHANGES_TEMPLATE,
  extract_echoes: EXTRACT_ECHOES_TEMPLATE,
  consolidate_memory: CONSOLIDATE_MEMORY_TEMPLATE,
  deduce_world_consequences: DEDUCE_WORLD_CONSEQUENCES_TEMPLATE,
};

// Individual exports for direct access
export {
  BATCH_GENERATE_SETTINGS_TEMPLATE,
  EXPAND_WORLD_LORE_TEMPLATE,
  ANALYZE_STATE_CHANGES_TEMPLATE,
  EXTRACT_ECHOES_TEMPLATE,
  CONSOLIDATE_MEMORY_TEMPLATE,
  DEDUCE_WORLD_CONSEQUENCES_TEMPLATE,
};
