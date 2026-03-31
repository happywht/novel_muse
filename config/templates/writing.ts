/**
 * Writing Templates
 *
 * Templates for novel writing operations: scene generation, expansion, rewriting, etc.
 */

import {
  VariableTier,
  VariableSource,
  BlockMetadata,
  PromptBlock,
} from '../../types/promptTemplate';

// Re-export the PromptTemplate interface for local use
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
// Scene Generation Template
// ============================================================

/**
 * Scene Generation Template
 *
 * Used for generating novel scenes with full context awareness.
 * Based on generateSceneFromIngredients in services/gemini/writing.ts
 */
const SCENE_GENERATION_TEMPLATE: PromptTemplate = {
  id: 'scene_generation',
  name: 'Scene Generation',
  description: 'Full scene generation with ingredient-based context building for novel writing',
  category: 'generation',
  systemInstruction: `You are a master novelist with deep expertise in creative writing, narrative structure, and genre conventions. Your task is to generate compelling, immersive prose that:

1. Maintains strict narrative consistency with provided context
2. Follows genre-specific conventions and avoids cliches
3. Creates vivid, sensory-rich descriptions without purple prose
4. Develops characters through action and dialogue, not exposition
5. Respects logical anchors and established facts
6. Delivers satisfying pacing appropriate to the scene's emotional beat

Write with confidence and artistry. Trust the reader's intelligence.`,

  userPromptBlocks: [
    // Block 1: Genre Information
    {
      id: 'genre_info',
      title: 'Genre Information',
      order: 1,
      template: `Novel Genre: {{genre}}

{{genreContext}}`,
      metadata: {
        tier: 'context',
        isStatic: false,
        dataSource: 'computed',
        description: 'Genre-specific rules and guidelines'
      }
    },

    // Block 2: Global Story Context
    {
      id: 'global_context',
      title: 'Global Story Arc',
      order: 2,
      template: `[Global Story Arc]
(The following is a summary of the entire novel so far. Ensure the current creation aligns with the overall direction and maintains continuity.)
{{rollingSummary}}`,
      condition: 'rollingSummary != null && rollingSummary !== ""',
      metadata: {
        tier: 'context',
        isStatic: false,
        dataSource: 'computed',
        description: 'Global story arc summary for continuity'
      }
    },

    // Block 3: Tiered Memory Context
    {
      id: 'tiered_memory',
      title: 'Tiered Memory Context',
      order: 3,
      template: `{{tieredContext}}`,
      metadata: {
        tier: 'context',
        isStatic: false,
        dataSource: 'computed',
        description: 'Layered memory context from chapters, characters, and echoes'
      }
    },

    // Block 4: Logic Anchors
    {
      id: 'logic_anchors',
      title: 'Logic Anchors: Character Status',
      order: 4,
      template: `[Logic Anchors: Current Character Status]
IMPORTANT: The following facts are enforced by the system knowledge graph. If there are conflicts, these take precedence. Instant teleportation or resurrection without explanation is strictly forbidden.
{{#each physicalStatus}}
- [{{this.name}}]: Currently at [{{this.location}}], physical/mental state: [{{this.state}}]{{#if this.isDead}} (DECEASED){{/if}}
{{/each}}`,
      condition: 'physicalStatus != null && physicalStatus.length > 0',
      metadata: {
        tier: 'context',
        isStatic: false,
        dataSource: 'computed',
        description: 'Character physical states and locations for logic anchoring'
      }
    },

    // Block 5: Chekhov's Gun
    {
      id: 'chekhov_gun',
      title: "Chekhov's Gun: Unresolved Foreshadowing",
      order: 5,
      template: `[Chekhov's Gun: Unresolved Foreshadowing]
NOTE: The following are suspense hooks or narrative threads from previous chapters. Please try to advance, reference, or resolve them in this creation.
{{#each unresolvedForeshadowing}}
- [{{this.subject}}] {{this.relation}} [{{this.object}}]
{{/each}}`,
      condition: 'unresolvedForeshadowing != null && unresolvedForeshadowing.length > 0',
      metadata: {
        tier: 'context',
        isStatic: false,
        dataSource: 'computed',
        description: 'Unresolved narrative hooks from previous chapters'
      }
    },

    // Block 6: Active World Settings
    {
      id: 'active_settings',
      title: 'Active World Settings',
      order: 6,
      template: `[Active World Settings/Scenes]
{{#each activeSettings}}
- [{{this.category}}] {{this.title}}: {{this.content}}
{{#if this.echoChanges}}
  [Environment/Setting Changes]: {{this.echoChanges}}
{{/if}}
{{/each}}`,
      condition: 'activeSettings != null && activeSettings.length > 0',
      metadata: {
        tier: 'context',
        isStatic: false,
        dataSource: 'user_input',
        description: 'World settings currently active in this scene'
      }
    },

    // Block 7: Relevant World Context
    {
      id: 'world_context',
      title: 'World Context',
      order: 7,
      template: `[World Rules and Background]
*Please refer to the following rules during writing to ensure logical consistency:*
{{#each relevantSettingsByCategory}}
[{{this.category}}]:
{{#each this.items}}
  - {{this.title}}: {{this.content}}
{{/each}}
{{/each}}`,
      condition: 'relevantSettings != null && relevantSettings.length > 0',
      metadata: {
        tier: 'context',
        isStatic: false,
        dataSource: 'computed',
        description: 'RAG-filtered world settings relevant to current context'
      }
    },

    // Block 8: Core Constraints
    {
      id: 'core_constraints',
      title: 'Core Creative Constraints',
      order: 8,
      template: `[Core Creative Constraints]
{{#if povName}}
- **POV Lock**: Must strictly narrate from [{{povName}}]'s first-person or limited third-person perspective.
  * Forbidden to describe any information outside this character's perception range (vision, hearing, touch, etc.).
  * Forbidden to use omniscient POV or switch to other characters' inner thoughts.
{{/if}}
{{pacingInstruction}}`,
      metadata: {
        tier: 'constraint',
        isStatic: false,
        dataSource: 'computed',
        description: 'POV lock and pacing control constraints'
      }
    },

    // Block 9: Twist Hook
    {
      id: 'twist_hook',
      title: 'Plot Twist Instruction',
      order: 9,
      template: `[Plot Twist Instruction (Twist Hook)]
{{twistHook}}`,
      condition: 'twistHook != null && twistHook !== ""',
      metadata: {
        tier: 'task',
        isStatic: false,
        dataSource: 'user_input',
        description: 'Optional plot twist instruction to inject'
      }
    },

    // Block 10: Plot Beat
    {
      id: 'plot_beat',
      title: 'Scene Plot Beat',
      order: 10,
      template: `[Scene Plot Beat]
{{plotBeat}}`,
      metadata: {
        tier: 'task',
        isStatic: false,
        dataSource: 'user_input',
        description: 'Core plot beat/goal for this scene'
      }
    },

    // Block 11: Quality Constraints
    {
      id: 'quality_constraints',
      title: 'Quality and Web Novel Guidelines',
      order: 11,
      template: `[Quality and Tone Guidelines (STRICTLY FORBIDDEN)]

1. **Reject Cliche Openings**: NEVER start with "weather, scenery, lighting" (e.g., "The mist over Yunmengze was thick", "Sunlight filtered through the gaps in the leaves"). Start DIRECTLY with character action, core conflict, or highly tense dialogue!

2. **Reject Hollywood-style Preachy Endings**: NEVER end the segment with grandiose summary/epic-style narration like "And this, was just the beginning", "This would be his era", "The gears of fate began to turn".

[Chapter Ending Mandatory Constraints]

3. **Must Complete Plot Beat**: The chapter ending MUST complete the core task specified in the "Plot Beat" above. Cannot deviate or skip. If the plot beat is "Lin Yuan convinces Mi Lan to form an alliance", the ending must show the alliance succeeding or clearly failing - not left ambiguous.

4. **Connect to Next Chapter**: After completing this chapter's plot beat, you MAY naturally introduce suspense for the next chapter at the end, but MUST ensure this chapter's goal is accomplished. FORBIDDEN to sacrifice chapter completeness for suspense.

[Instructions]:
Please expand genuine interaction details and actions to support the framework, ensuring real plot density justifies the word count requirement. Start directly with the prose. Do not output any titles, summaries, or explanatory text.

Target word count: approximately {{targetWordCount}} characters.`,
      metadata: {
        tier: 'constraint',
        isStatic: true,
        dataSource: 'static',
        description: 'Static quality constraints and anti-cliche rules'
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
      description: 'The novel genre (e.g., xuanhuan, xianxia, dushi, kongbu)',
      display: 'Novel Genre',
    },
    {
      name: 'plotBeat',
      type: 'string',
      tier: 'critical',
      source: 'user_input',
      required: true,
      description: 'The specific plot beat/goal for this scene',
      display: 'Plot Beat',
    },
    {
      name: 'genreContext',
      type: 'string',
      tier: 'critical',
      source: 'computed',
      required: true,
      description: 'Genre-specific rules and guidelines built from genreRules.ts',
      display: 'Genre Rules',
    },

    // === IMPORTANT VARIABLES ===
    {
      name: 'rollingSummary',
      type: 'string',
      tier: 'important',
      source: 'project_state',
      required: false,
      description: 'Global story arc summary for continuity',
      display: 'Global Story Arc',
    },
    {
      name: 'tieredContext',
      type: 'string',
      tier: 'important',
      source: 'computed',
      required: false,
      description: 'Layered memory context built from chapters, characters, and echoes',
      display: 'Tiered Memory Context',
    },
    {
      name: 'physicalStatus',
      type: 'object',
      tier: 'important',
      source: 'computed',
      required: false,
      description: 'Array of character physical states and locations for logic anchoring',
      display: 'Logic Anchors',
    },
    {
      name: 'unresolvedForeshadowing',
      type: 'object',
      tier: 'important',
      source: 'computed',
      required: false,
      description: 'Array of unresolved narrative hooks (Chekhovs Guns)',
      display: 'Unresolved Foreshadowing',
    },
    {
      name: 'activeSettings',
      type: 'object',
      tier: 'important',
      source: 'user_input',
      required: false,
      description: 'World settings currently active in this scene',
      display: 'Active Settings',
    },
    {
      name: 'relevantSettings',
      type: 'object',
      tier: 'important',
      source: 'computed',
      required: false,
      description: 'RAG-filtered world settings relevant to current context',
      display: 'Relevant World Settings',
    },
    {
      name: 'pacingInstruction',
      type: 'string',
      tier: 'important',
      source: 'computed',
      required: false,
      description: 'Pacing control instructions based on pacing mode and profile',
      display: 'Pacing Control',
      defaultValue: '[Pacing Control: Balanced Progression] Maintain narrative flow, naturally interweaving dialogue, action, and psychological activity.',
    },
    {
      name: 'povName',
      type: 'string',
      tier: 'important',
      source: 'user_input',
      required: false,
      description: 'Name of the POV character for perspective locking',
      display: 'POV Character',
    },
    {
      name: 'targetWordCount',
      type: 'number',
      tier: 'important',
      source: 'user_input',
      required: false,
      description: 'Target word count for the generated scene',
      display: 'Target Word Count',
      defaultValue: 3000,
    },

    // === OPTIONAL VARIABLES ===
    {
      name: 'twistHook',
      type: 'string',
      tier: 'optional',
      source: 'user_input',
      required: false,
      description: 'Optional plot twist instruction to inject into the scene',
      display: 'Plot Twist Instruction',
    },
    {
      name: 'activeCharacters',
      type: 'object',
      tier: 'optional',
      source: 'user_input',
      required: false,
      description: 'Array of characters active in this scene',
      display: 'Active Characters',
    },
    {
      name: 'allWorldSettings',
      type: 'object',
      tier: 'optional',
      source: 'project_state',
      required: false,
      description: 'All world settings for RAG filtering',
      display: 'All World Settings',
    },
    {
      name: 'previousStoryContext',
      type: 'string',
      tier: 'optional',
      source: 'computed',
      required: false,
      description: 'Immediate previous story context',
      display: 'Previous Context',
    },
    {
      name: 'echoes',
      type: 'object',
      tier: 'optional',
      source: 'project_state',
      required: false,
      description: 'Echoes (state changes) for context awareness',
      display: 'Echoes',
    },
    {
      name: 'activeChapterId',
      type: 'string',
      tier: 'optional',
      source: 'user_input',
      required: false,
      description: 'ID of the active chapter being written',
      display: 'Active Chapter ID',
    },
    {
      name: 'pacing',
      type: 'string',
      tier: 'optional',
      source: 'user_input',
      required: false,
      description: 'Pacing mode: SLOW_BURN, BALANCED, or CLIMAX',
      display: 'Pacing Mode',
      defaultValue: 'BALANCED',
    },
    {
      name: 'settings',
      type: 'object',
      tier: 'optional',
      source: 'project_state',
      required: false,
      description: 'Creative settings including tone, style, and profile',
      display: 'Creative Settings',
    },
    {
      name: 'graphContext',
      type: 'string',
      tier: 'optional',
      source: 'computed',
      required: false,
      description: 'Knowledge graph context for enhanced awareness',
      display: 'Graph Context',
    },
  ],

  metadata: {
    version: '1.0.0',
    author: 'Muse System',
    lastUpdated: '2026-03-27',
    tags: ['scene', 'generation', 'novel', 'creative-writing'],
  },
};

// ============================================================
// Expand Scene Template
// ============================================================

/**
 * Expand Scene Template
 *
 * Used for expanding scene from a premise and plot outline.
 */
const EXPAND_SCENE_TEMPLATE: PromptTemplate = {
  id: 'expand_scene',
  name: 'Expand Scene',
  description: 'Expand scene from a premise and plot outline with context',
  category: 'generation',
  systemInstruction: `You are a creative writing assistant specializing in scene expansion. Your task is to:

1. Transform brief plot outlines into vivid, immersive scenes
2. Incorporate character details and world settings naturally
3. Maintain narrative flow and pacing
4. Balance dialogue, action, and description
5. Create engaging prose that brings the story to life

Write compelling scenes that honor the source material while adding depth and texture.`,

  userPromptBlocks: [
    // Block 1: Story Context
    {
      id: 'story_context',
      title: 'Story Context',
      order: 1,
      template: `[Novel Genre]
{{genre}}

[Core Premise]
{{premise}}`,
      metadata: {
        tier: 'context',
        isStatic: false,
        dataSource: 'derived',
        description: '故事背景上下文，包括小说类型和核心前提',
      },
    },

    // Block 2: Character and World Context
    {
      id: 'context_info',
      title: 'Character and World Context',
      order: 2,
      template: `{{contextStr}}`,
      condition: 'contextStr != null && contextStr !== ""',
      metadata: {
        tier: 'context',
        isStatic: false,
        dataSource: 'computed',
        description: '角色和世界观上下文信息',
      },
    },

    // Block 3: Plot Outline
    {
      id: 'plot_outline',
      title: 'Plot Outline',
      order: 3,
      template: `[Current Plot Outline Context]
{{plotOutline}}`,
      metadata: {
        tier: 'context',
        isStatic: false,
        dataSource: 'user_input',
        description: '当前情节大纲上下文',
      },
    },

    // Block 4: Writing Task
    {
      id: 'writing_task',
      title: 'Writing Task',
      order: 4,
      template: `[Writing Task]
{{userPrompt}}

[Requirements]
- Expand the above task into a complete scene
- Incorporate the provided context naturally
- Start directly with the prose, no introductory remarks
- Maintain consistency with established characters and settings
- Create vivid, engaging prose`,
      metadata: {
        tier: 'task',
        isStatic: false,
        dataSource: 'user_input',
        description: '具体的写作任务和输出要求',
      },
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
      description: 'The novel genre',
      display: 'Novel Genre',
    },
    {
      name: 'premise',
      type: 'string',
      tier: 'critical',
      source: 'user_input',
      required: true,
      description: 'The core premise/logline of the story',
      display: 'Core Premise',
    },
    {
      name: 'plotOutline',
      type: 'string',
      tier: 'critical',
      source: 'user_input',
      required: true,
      description: 'The current plot outline context',
      display: 'Plot Outline',
    },
    {
      name: 'userPrompt',
      type: 'string',
      tier: 'critical',
      source: 'user_input',
      required: true,
      description: 'The specific writing task',
      display: 'Writing Task',
    },
    // === IMPORTANT VARIABLES ===
    {
      name: 'contextStr',
      type: 'string',
      tier: 'important',
      source: 'computed',
      required: false,
      description: 'Formatted context string with characters and world settings',
      display: 'Context',
    },
  ],

  metadata: {
    version: '1.0.0',
    author: 'Muse System',
    lastUpdated: '2026-03-27',
    tags: ['scene', 'expansion', 'generation', 'creative-writing'],
  },
};

// ============================================================
// Rewrite Local Template
// ============================================================

/**
 * Rewrite Local Template
 *
 * Used for localized text rewriting with context awareness.
 */
const REWRITE_LOCAL_TEMPLATE: PromptTemplate = {
  id: 'rewrite_local',
  name: 'Rewrite Local Text',
  description: 'Rewrite selected text with context awareness',
  category: 'refinement',
  systemInstruction: `You are an expert text revision assistant for novels. Your task is to:

1. Rewrite text according to user instructions precisely
2. Maintain seamless connection with surrounding context
3. Preserve the author's voice and style
4. Output ONLY the rewritten text - no explanations or formatting
5. Ensure the result can be directly inserted into the original text

You must output clean, ready-to-insert text with no markdown formatting or meta-commentary.`,

  userPromptBlocks: [
    // Block 1: Genre Context
    {
      id: 'genre_context',
      title: 'Genre Context',
      order: 1,
      template: `You are a professional novel editing assistant (Genre: {{genre}}).`,
      metadata: {
        tier: 'context',
        isStatic: false,
        dataSource: 'computed',
        description: '小说类型上下文'
      }
    },

    // Block 2: User Instructions
    {
      id: 'user_instructions',
      title: 'User Instructions',
      order: 2,
      template: `[User Instructions]
{{instruction}}`,
      metadata: {
        tier: 'task',
        isStatic: false,
        dataSource: 'user_input',
        description: '用户重写指令'
      }
    },

    // Block 3: Context
    {
      id: 'surrounding_context',
      title: 'Surrounding Context',
      order: 3,
      template: `[Surrounding Context]
To ensure your rewrite maintains coherence, here is the context before and after the selected text (for reference only - DO NOT repeat this in your output):
[Before]: "...{{contextBefore}}"
[After]: "{{contextAfter}}..."`,
      metadata: {
        tier: 'context',
        isStatic: false,
        dataSource: 'user_input',
        description: '前后文上下文用于保持连贯性'
      }
    },

    // Block 4: Text to Rewrite
    {
      id: 'text_to_rewrite',
      title: 'Text to Rewrite',
      order: 4,
      template: `[Original Text to Rewrite]
"{{selectedText}}"

[Requirements]
1. Follow the user's instructions EXACTLY - rewrite/polish/expand/condense ONLY the "Original Text to Rewrite"
2. The result must seamlessly connect with [Before] and [After] context
3. CRITICAL: Output ONLY the rewritten plain text! No markdown formatting (no \`\`\` or **), no introductory remarks like "Here is the rewritten text:" or "Below is...". Your output will be directly inserted into the original text.`,
      metadata: {
        tier: 'constraint',
        isStatic: true,
        dataSource: 'static',
        description: '待重写文本和输出格式约束'
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
      description: 'The novel genre',
      display: 'Novel Genre',
    },
    {
      name: 'selectedText',
      type: 'string',
      tier: 'critical',
      source: 'user_input',
      required: true,
      description: 'The text to rewrite',
      display: 'Selected Text',
    },
    {
      name: 'instruction',
      type: 'string',
      tier: 'critical',
      source: 'user_input',
      required: true,
      description: 'The rewrite instructions',
      display: 'Rewrite Instructions',
    },
    // === IMPORTANT VARIABLES ===
    {
      name: 'contextBefore',
      type: 'string',
      tier: 'important',
      source: 'user_input',
      required: false,
      description: 'Text context before the selection',
      display: 'Context Before',
    },
    {
      name: 'contextAfter',
      type: 'string',
      tier: 'important',
      source: 'user_input',
      required: false,
      description: 'Text context after the selection',
      display: 'Context After',
    },
  ],

  metadata: {
    version: '1.0.0',
    author: 'Muse System',
    lastUpdated: '2026-03-27',
    tags: ['rewrite', 'local', 'refinement', 'editing', 'creative-writing'],
  },
};

// ============================================================
// Summarize Chapter Template
// ============================================================

/**
 * Summarize Chapter Template
 *
 * Used for generating concise chapter summaries.
 */
const SUMMARIZE_CHAPTER_TEMPLATE: PromptTemplate = {
  id: 'summarize_chapter',
  name: 'Summarize Chapter',
  description: 'Generate a concise summary of a chapter',
  category: 'utility',
  systemInstruction: `You are a professional literary editor. Your task is to create extremely concise chapter summaries (100-200 characters) that:

1. Extract all key plot turning points
2. Record important emotional/relationship state changes between characters
3. Note any new foreshadowing or core items introduced
4. Use objective, efficient language
5. Serve as "medium-term memory" reference for future writing

Create summaries that capture the essence without unnecessary detail.`,

  userPromptBlocks: [
    // Block 1: Chapter Info
    {
      id: 'chapter_info',
      title: 'Chapter Information',
      order: 1,
      template: `[Chapter Title]
{{title}}

[Chapter Content]
{{content}}`,
      metadata: {
        tier: 'context',
        isStatic: false,
        dataSource: 'user_input',
        description: '章节标题和内容'
      }
    },

    // Block 2: Summary Requirements
    {
      id: 'summary_requirements',
      title: 'Summary Requirements',
      order: 2,
      template: `[Summary Requirements]
1. Extract all key plot turning points (Plot Points)
2. Record important emotional/relationship state changes between characters
3. Note any new foreshadowing or core items
4. Use objective, efficient language as "medium-term memory" reference for future writing

Output a concise summary (100-200 characters).`,
      metadata: {
        tier: 'constraint',
        isStatic: true,
        dataSource: 'static',
        description: '摘要生成的约束条件和输出格式要求'
      }
    },
  ],

  variables: [
    // === CRITICAL VARIABLES ===
    {
      name: 'title',
      type: 'string',
      tier: 'critical',
      source: 'user_input',
      required: true,
      description: 'The chapter title',
      display: 'Chapter Title',
    },
    {
      name: 'content',
      type: 'string',
      tier: 'critical',
      source: 'user_input',
      required: true,
      description: 'The chapter content to summarize',
      display: 'Chapter Content',
    },
  ],

  metadata: {
    version: '1.0.0',
    author: 'Muse System',
    lastUpdated: '2026-03-27',
    tags: ['summary', 'chapter', 'utility', 'editing'],
  },
};

// ============================================================
// Balance Suggestions Template
// ============================================================

/**
 * Balance Suggestions Template
 *
 * Used for generating AI-powered chapter balance analysis and suggestions.
 */
const BALANCE_SUGGESTIONS_TEMPLATE: PromptTemplate = {
  id: 'balance_suggestions',
  name: 'AI Balance Suggestions',
  description: 'Analyze chapter structure and provide optimization suggestions',
  category: 'utility',
  systemInstruction: `You are a senior novel editor and structure consultant specializing in chapter structure balance analysis. Your task is to:

1. Analyze chapter structure from multiple dimensions
2. Identify potential issues and imbalances
3. Provide actionable, prioritized optimization suggestions
4. Consider narrative pacing, character distribution, and structural coherence
5. Give concrete, practical advice rather than vague generalities

Provide professional analysis that helps authors improve their work.`,

  userPromptBlocks: [
    // Block 1: Chapter Data
    {
      id: 'chapter_data',
      title: 'Chapter Data',
      order: 1,
      template: `[Chapter Data]
{{chapterInfo}}`,
      metadata: {
        tier: 'context',
        isStatic: false,
        dataSource: 'computed',
        description: '章节信息数据，包含章节标题、字数等元数据',
      },
    },

    // Block 2: Character and Plot Context
    {
      id: 'context_info',
      title: 'Context Information',
      order: 2,
      template: `[Character List]
{{characterNames}}

[Plot Node Count]
{{plotBeatCount}}`,
      metadata: {
        tier: 'context',
        isStatic: false,
        dataSource: 'computed',
        description: '角色列表和情节点数量等上下文信息',
      },
    },

    // Block 3: Analysis Requirements
    {
      id: 'analysis_requirements',
      title: 'Analysis Requirements',
      order: 3,
      template: `[Analysis Requirements]
Please provide professional suggestions from the following dimensions:

1. **Word Count Balance**: Which chapters are too long or too short? How should they be adjusted?

2. **Pacing Control**: Is the narrative pacing reasonable? Are there places that need more conflict or relief?

3. **Character Appearance**: Is the appearance frequency of main characters balanced? Which characters appear too much or too little?

4. **POV Perspective**: Is the POV character distribution reasonable? Does the POV rotation pattern need adjustment?

5. **Structural Optimization**: Based on plot nodes, suggestions for chapter splitting or merging.

[Output Format]
Please output analysis in a clear structure, including:
- Overall rating (0-100 points)
- Main issues (if any)
- Specific optimization suggestions (sorted by priority)
- Expected improvement effects

Output the analysis results directly, without any additional explanations or notes.`,
      metadata: {
        tier: 'task',
        isStatic: true,
        dataSource: 'static',
        description: '分析任务要求，包含5个维度的评估标准和输出格式规范',
      },
    },
  ],

  variables: [
    // === CRITICAL VARIABLES ===
    {
      name: 'chapterInfo',
      type: 'string',
      tier: 'critical',
      source: 'computed',
      required: true,
      description: 'JSON stringified chapter information',
      display: 'Chapter Info',
    },
    {
      name: 'characterNames',
      type: 'string',
      tier: 'critical',
      source: 'computed',
      required: true,
      description: 'Comma-separated list of character names',
      display: 'Characters',
    },
    {
      name: 'plotBeatCount',
      type: 'number',
      tier: 'critical',
      source: 'computed',
      required: true,
      description: 'Number of plot nodes',
      display: 'Plot Beat Count',
    },
  ],

  metadata: {
    version: '1.0.0',
    author: 'Muse System',
    lastUpdated: '2026-03-27',
    tags: ['balance', 'analysis', 'suggestions', 'structure', 'utility'],
  },
};

// ============================================================
// Writing Base Template
// ============================================================

/**
 * Writing Base Template
 *
 * Generic template for basic text generation tasks.
 */
const WRITING_BASE_TEMPLATE: PromptTemplate = {
  id: 'writing_base',
  name: 'Writing Base',
  description: 'Generic template for basic text generation',
  category: 'generation',
  systemInstruction: `You are a creative writing assistant. Generate high-quality content based on the user's prompt. Be creative, engaging, and maintain consistency with any provided context.`,

  userPromptBlocks: [
    {
      id: 'user_prompt',
      title: 'User Prompt',
      order: 1,
      template: `{{prompt}}`,
      metadata: {
        tier: 'task',
        isStatic: false,
        dataSource: 'user_input',
        description: '用户输入的写作提示内容',
      },
    },
  ],

  variables: [
    {
      name: 'prompt',
      type: 'string',
      tier: 'critical',
      source: 'user_input',
      required: true,
      description: 'The user prompt for text generation',
      display: 'Prompt',
    },
  ],

  metadata: {
    version: '1.0.0',
    author: 'Muse System',
    lastUpdated: '2026-03-27',
    tags: ['writing', 'base', 'generation', 'generic'],
  },
};

// ============================================================
// Polish Draft Template
// ============================================================

/**
 * Polish Draft Template
 *
 * Used for polishing and refining draft content.
 */
const POLISH_DRAFT_TEMPLATE: PromptTemplate = {
  id: 'polish_draft',
  name: 'Polish Draft',
  description: 'Polish and refine draft content for improved quality',
  category: 'refinement',
  systemInstruction: `You are an expert prose editor and stylist. Your task is to polish draft content by:

1. Improving sentence flow and rhythm
2. Enhancing word choice and imagery
3. Strengthening voice and tone consistency
4. Eliminating redundancy and awkward phrasing
5. Maintaining the author's original intent and style

Polish while preserving the unique voice and vision of the original work.`,

  userPromptBlocks: [
    // Block 1: Polish Instructions
    {
      id: 'polish_instructions',
      title: 'Polish Instructions',
      order: 1,
      template: `[Polish Instructions]
{{modeInstruction}}

Apply the above instructions to improve the following draft content.`,
      metadata: {
        tier: 'task',
        isStatic: false,
        dataSource: 'user_input',
        description: '润色模式和具体指令要求',
      },
    },

    // Block 2: Content to Polish
    {
      id: 'content_to_polish',
      title: 'Content to Polish',
      order: 2,
      template: `[Draft Content]
{{content}}

Please polish the above content according to the instructions. Focus on:
- Sentence-level improvements
- Word choice and imagery enhancement
- Pacing and rhythm
- Voice and tone consistency
- Clarity and impact

Output the polished version while preserving the core meaning and style of the original.`,
      metadata: {
        tier: 'task',
        isStatic: false,
        dataSource: 'user_input',
        description: '待润色的草稿内容',
      },
    },
  ],

  variables: [
    // === CRITICAL VARIABLES ===
    {
      name: 'content',
      type: 'string',
      tier: 'critical',
      source: 'user_input',
      required: true,
      description: 'The draft content to polish',
      display: 'Draft Content',
    },
    {
      name: 'modeInstruction',
      type: 'string',
      tier: 'critical',
      source: 'user_input',
      required: true,
      description: 'Specific polishing mode instructions',
      display: 'Polish Mode',
    },
  ],

  metadata: {
    version: '1.0.0',
    author: 'Muse System',
    lastUpdated: '2026-03-27',
    tags: ['polish', 'refinement', 'editing', 'prose', 'creative-writing'],
  },
};

// ============================================================
// Chat With Persona Template
// ============================================================

/**
 * Chat With Persona Template
 *
 * Used for role-playing conversations with characters.
 */
const CHAT_WITH_PERSONA_TEMPLATE: PromptTemplate = {
  id: 'chat_with_persona',
  name: 'Chat With Persona',
  description: 'Role-play conversations with story characters in character',
  category: 'utility',
  systemInstruction: `You are an immersive role-playing AI that embodies story characters with complete authenticity. Your task is to:

1. Stay completely in character throughout the conversation
2. Reflect the character's unique voice, speech patterns, and personality
3. Respond based on the character's knowledge, experiences, and worldview
4. Maintain emotional consistency with the character's current state
5. React authentically to the user's messages as the character would

Become the character completely. Never break character or acknowledge being an AI.`,

  userPromptBlocks: [
    // Block 1: Character Profile
    {
      id: 'character_profile',
      title: 'Character Profile',
      order: 1,
      template: `[Character Profile]
Name: {{characterName}}
Role: {{characterRole}}

[Character Description]
{{characterDescription}}

[Character Relationships]
{{characterRelationships}}`,
      metadata: {
        tier: 'context',
        isStatic: false,
        dataSource: 'derived',
        description: '角色档案信息，包括名称、角色、描述和人物关系',
      },
    },

    // Block 2: Conversation History
    {
      id: 'conversation_history',
      title: 'Conversation History',
      order: 2,
      template: `[Previous Conversation]
{{historyText}}`,
      condition: 'historyText != null && historyText !== ""',
      metadata: {
        tier: 'context',
        isStatic: false,
        dataSource: 'computed',
        description: '对话历史记录，用于保持对话连续性',
      },
    },

    // Block 3: Current Message
    {
      id: 'current_message',
      title: 'Current Message',
      order: 3,
      template: `[User's Message]
{{message}}

Respond as {{characterName}} would. Stay true to their personality, knowledge, and emotional state. Express their unique voice and perspective in your response.`,
      metadata: {
        tier: 'task',
        isStatic: false,
        dataSource: 'user_input',
        description: '用户当前发送的消息，角色需要对此做出回应',
      },
    },
  ],

  variables: [
    // === CRITICAL VARIABLES ===
    {
      name: 'characterName',
      type: 'string',
      tier: 'critical',
      source: 'user_input',
      required: true,
      description: 'Name of the character to role-play',
      display: 'Character Name',
    },
    {
      name: 'message',
      type: 'string',
      tier: 'critical',
      source: 'user_input',
      required: true,
      description: 'The user message to respond to',
      display: 'User Message',
    },
    // === IMPORTANT VARIABLES ===
    {
      name: 'characterRole',
      type: 'string',
      tier: 'important',
      source: 'project_state',
      required: false,
      description: 'Role of the character in the story',
      display: 'Character Role',
    },
    {
      name: 'characterDescription',
      type: 'string',
      tier: 'important',
      source: 'project_state',
      required: false,
      description: 'Detailed character description and personality',
      display: 'Character Description',
    },
    {
      name: 'characterRelationships',
      type: 'string',
      tier: 'important',
      source: 'computed',
      required: false,
      description: 'Character relationships with others',
      display: 'Character Relationships',
    },
    // === OPTIONAL VARIABLES ===
    {
      name: 'historyText',
      type: 'string',
      tier: 'optional',
      source: 'computed',
      required: false,
      description: 'Previous conversation history',
      display: 'Conversation History',
    },
  ],

  metadata: {
    version: '1.0.0',
    author: 'Muse System',
    lastUpdated: '2026-03-27',
    tags: ['chat', 'role-play', 'persona', 'character', 'interactive'],
  },
};

// Export all writing templates
export const WRITING_TEMPLATES = {
  scene_generation: SCENE_GENERATION_TEMPLATE,
  expand_scene: EXPAND_SCENE_TEMPLATE,
  rewrite_local: REWRITE_LOCAL_TEMPLATE,
  summarize_chapter: SUMMARIZE_CHAPTER_TEMPLATE,
  balance_suggestions: BALANCE_SUGGESTIONS_TEMPLATE,
  writing_base: WRITING_BASE_TEMPLATE,
  polish_draft: POLISH_DRAFT_TEMPLATE,
  chat_with_persona: CHAT_WITH_PERSONA_TEMPLATE,
};

// Export individual templates
export {
  SCENE_GENERATION_TEMPLATE,
  EXPAND_SCENE_TEMPLATE,
  REWRITE_LOCAL_TEMPLATE,
  SUMMARIZE_CHAPTER_TEMPLATE,
  BALANCE_SUGGESTIONS_TEMPLATE,
  WRITING_BASE_TEMPLATE,
  POLISH_DRAFT_TEMPLATE,
  CHAT_WITH_PERSONA_TEMPLATE,
};
