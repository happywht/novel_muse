/**
 * Plot Templates
 *
 * Templates for plot generation, analysis, and manipulation operations.
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
// Generate Plot Template
// ============================================================

/**
 * Generate Plot Template
 *
 * Used for generating structured plot outlines based on story context and elements.
 */
const GENERATE_PLOT_TEMPLATE: PromptTemplate = {
  id: 'generate_plot',
  name: 'Generate Plot Outline',
  description: 'Generate structured plot outlines based on story context and elements',
  category: 'generation',
  systemInstruction: `You are a master storyteller and narrative architect. Your task is to create compelling plot outlines that:

1. Follow sound narrative structure and pacing principles
2. Create meaningful conflict and tension
3. Develop character arcs alongside plot progression
4. Utilize world-building elements organically
5. Balance predictability with surprise
6. Serve the story's themes and emotional journey

Create plots that are both structurally sound and emotionally resonant.`,

  userPromptBlocks: [
    // Block 1: Core Premise
    {
      id: 'core_premise',
      title: 'Core Premise',
      order: 1,
      template: `[Story Premise]
{{premise}}

[Genre]
{{genre}}`,
      metadata: {
        tier: 'context',
        isStatic: false,
        dataSource: 'user_input',
        description: 'Story premise and genre for plot context'
      }
    },

    // Block 2: Character Information
    {
      id: 'character_info',
      title: 'Character Information',
      order: 2,
      template: `[Character Context]
{{contextStr}}`,
      condition: 'contextStr != null && contextStr !== ""',
      metadata: {
        tier: 'context',
        isStatic: false,
        dataSource: 'computed',
        description: 'Character context and relationships for plot coherence'
      }
    },

    // Block 3: World Settings
    {
      id: 'world_settings',
      title: 'World Settings',
      order: 3,
      template: `[Relevant World Settings]
{{relevantSettings}}`,
      condition: 'relevantSettings != null && relevantSettings !== ""',
      metadata: {
        tier: 'context',
        isStatic: false,
        dataSource: 'computed',
        description: 'Relevant world settings for plot generation'
      }
    },

    // Block 4: Graph Context
    {
      id: 'graph_context',
      title: 'Knowledge Graph Context',
      order: 4,
      template: `[Knowledge Graph Context]
{{graphContext}}`,
      condition: 'graphContext != null && graphContext !== ""',
      metadata: {
        tier: 'context',
        isStatic: false,
        dataSource: 'computed',
        description: 'Knowledge graph context for plot coherence'
      }
    },

    // Block 5: Lookup Table
    {
      id: 'lookup_table',
      title: 'Reference Information',
      order: 5,
      template: `[Reference Information]
{{lookupTable}}`,
      condition: 'lookupTable != null && lookupTable !== ""',
      metadata: {
        tier: 'context',
        isStatic: false,
        dataSource: 'computed',
        description: 'Reference lookup table for consistency checking'
      }
    },

    // Block 6: Task Requirements
    {
      id: 'task_requirements',
      title: 'Task Requirements',
      order: 6,
      template: `[Plot Generation Requirements]
Using the template structure below, generate a comprehensive plot outline:

{{template}}

Requirements:
- Each plot point should be specific and actionable
- Include emotional beats and character development moments
- Ensure cause-and-effect logic between plot points
- Balance setup, conflict, and resolution
- Consider pacing and reader engagement
- Utilize the world settings and character relationships provided

Output the plot outline in a clear, structured format.`,
      metadata: {
        tier: 'task',
        isStatic: true,
        dataSource: 'static',
        description: 'Static plot generation requirements and format specification'
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
      description: 'The story premise/logline',
      display: 'Story Premise',
    },
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
      name: 'template',
      type: 'string',
      tier: 'critical',
      source: 'user_input',
      required: true,
      description: 'Plot structure template to follow',
      display: 'Plot Template',
    },
    // === IMPORTANT VARIABLES ===
    {
      name: 'contextStr',
      type: 'string',
      tier: 'important',
      source: 'computed',
      required: false,
      description: 'Character context and relationships',
      display: 'Character Context',
    },
    {
      name: 'relevantSettings',
      type: 'string',
      tier: 'important',
      source: 'computed',
      required: false,
      description: 'Relevant world settings for the plot',
      display: 'World Settings',
    },
    // === OPTIONAL VARIABLES ===
    {
      name: 'graphContext',
      type: 'string',
      tier: 'optional',
      source: 'computed',
      required: false,
      description: 'Knowledge graph context for plot coherence',
      display: 'Graph Context',
    },
    {
      name: 'lookupTable',
      type: 'string',
      tier: 'optional',
      source: 'computed',
      required: false,
      description: 'Reference lookup table for consistency',
      display: 'Lookup Table',
    },
  ],

  metadata: {
    version: '1.0.0',
    author: 'Muse System',
    lastUpdated: '2026-03-27',
    tags: ['plot', 'generation', 'outline', 'storytelling', 'creative-writing'],
  },
};

// ============================================================
// Rewrite Plot Template
// ============================================================

/**
 * Rewrite Plot Template
 *
 * Used for rewriting existing plot outlines based on modification directives.
 */
const REWRITE_PLOT_TEMPLATE: PromptTemplate = {
  id: 'rewrite_plot',
  name: 'Rewrite Plot',
  description: 'Rewrite existing plot outlines based on modification directives',
  category: 'refinement',
  systemInstruction: `You are a narrative revision specialist. Your task is to rewrite plot outlines while:

1. Preserving the core elements that work well
2. Implementing requested changes thoughtfully
3. Maintaining narrative consistency and logic
4. Improving pacing and emotional impact
5. Ensuring character arcs remain coherent

Rewrite plots to better serve the story's goals while respecting established elements.`,

  userPromptBlocks: [
    // Block 1: Genre Context
    {
      id: 'genre_context',
      title: 'Genre Context',
      order: 1,
      template: `[Genre]
{{genre}}`,
      metadata: {
        tier: 'context',
        isStatic: false,
        dataSource: 'computed',
        description: 'Novel genre for tone and style guidance'
      }
    },

    // Block 2: Character Context
    {
      id: 'character_context',
      title: 'Character Context',
      order: 2,
      template: `[Character Context]
{{contextStr}}`,
      condition: 'contextStr != null && contextStr !== ""',
      metadata: {
        tier: 'context',
        isStatic: false,
        dataSource: 'computed',
        description: 'Character context for plot consistency'
      }
    },

    // Block 3: Reference Information
    {
      id: 'lookup_table',
      title: 'Reference Information',
      order: 3,
      template: `[Reference Information]
{{lookupTable}}`,
      condition: 'lookupTable != null && lookupTable !== ""',
      metadata: {
        tier: 'context',
        isStatic: false,
        dataSource: 'computed',
        description: 'Reference lookup table for consistency checking'
      }
    },

    // Block 4: Current Plot
    {
      id: 'current_plot',
      title: 'Current Plot',
      order: 4,
      template: `[Current Plot Outline]
{{currentPlot}}`,
      metadata: {
        tier: 'context',
        isStatic: false,
        dataSource: 'user_input',
        description: 'Current plot outline to be rewritten'
      }
    },

    // Block 5: Modification Directive
    {
      id: 'modification_directive',
      title: 'Modification Directive',
      order: 5,
      template: `[Modification Directive]
{{directive}}

Please rewrite the plot outline according to the above directive while:
- Maintaining consistency with character information and world settings
- Preserving plot points that are not directly affected by the modification
- Ensuring logical cause-and-effect relationships
- Improving overall narrative flow where possible

Output the revised plot outline in a clear, structured format.`,
      metadata: {
        tier: 'task',
        isStatic: false,
        dataSource: 'user_input',
        description: 'User modification directive and rewrite instructions'
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
      name: 'currentPlot',
      type: 'string',
      tier: 'critical',
      source: 'user_input',
      required: true,
      description: 'Current plot outline to rewrite',
      display: 'Current Plot',
    },
    {
      name: 'directive',
      type: 'string',
      tier: 'critical',
      source: 'user_input',
      required: true,
      description: 'Modification directive for the rewrite',
      display: 'Modification Directive',
    },
    // === IMPORTANT VARIABLES ===
    {
      name: 'contextStr',
      type: 'string',
      tier: 'important',
      source: 'computed',
      required: false,
      description: 'Character context for consistency',
      display: 'Character Context',
    },
    // === OPTIONAL VARIABLES ===
    {
      name: 'lookupTable',
      type: 'string',
      tier: 'optional',
      source: 'computed',
      required: false,
      description: 'Reference lookup table',
      display: 'Lookup Table',
    },
  ],

  metadata: {
    version: '1.0.0',
    author: 'Muse System',
    lastUpdated: '2026-03-27',
    tags: ['plot', 'rewrite', 'revision', 'refinement', 'creative-writing'],
  },
};

// ============================================================
// Analyze Plot Rhythm Template
// ============================================================

/**
 * Analyze Plot Rhythm Template
 *
 * Used for analyzing plot outline rhythm and tension curve.
 */
const ANALYZE_PLOT_RHYTHM_TEMPLATE: PromptTemplate = {
  id: 'analyze_plot_rhythm',
  name: 'Analyze Plot Rhythm',
  description: 'Analyze plot outline rhythm and tension curve',
  category: 'analysis',
  systemInstruction: `You are an expert story analyst specializing in narrative pacing and tension dynamics. Your task is to:

1. Break down the plot outline into key beats
2. Evaluate tension level for each beat (0-100)
3. Identify pacing patterns and rhythm
4. Provide actionable insights

Output structured JSON analysis.`,

  userPromptBlocks: [
    {
      id: 'task_description',
      title: 'Analysis Task',
      order: 1,
      template: `Please analyze the plot outline's rhythm and tension dynamics.
Break down into key beats and evaluate tension level for each.

[Tension Rating Scale]:
0-20: Calm, setup, daily life
21-40: Small waves, foreshadowing, dialogue
41-60: Conflict escalation, obstacles appear
61-80: Major twists, crisis, battles
81-100: Ultimate climax, life-or-death, core reveals`,
      metadata: {
        tier: 'task',
        isStatic: true,
        dataSource: 'static',
        description: 'Analysis task description with tension rating scale'
      }
    },
    {
      id: 'plot_content',
      title: 'Plot Outline',
      order: 2,
      template: `[Plot Outline]:
{{plotOutline}}`,
      metadata: {
        tier: 'context',
        isStatic: false,
        dataSource: 'computed',
        description: 'The complete plot outline to analyze'
      }
    },
    {
      id: 'output_format',
      title: 'Output Format',
      order: 3,
      template: `Output JSON array with at least 5-10 key points:
[
  {
    "beat": "Chapter name or key plot point",
    "tension": 0-100,
    "description": "Brief description of this beat"
  }
]`,
      metadata: {
        tier: 'format',
        isStatic: true,
        dataSource: 'static',
        description: 'JSON output format specification for rhythm analysis'
      }
    },
  ],

  variables: [
    {
      name: 'plotOutline',
      type: 'string',
      tier: 'critical',
      source: 'project_state',
      required: true,
      description: 'The complete plot outline to analyze',
      display: '剧情大纲',
    },
  ],

  metadata: {
    version: '1.0.0',
    author: 'Muse System',
    lastUpdated: '2026-03-28',
    tags: ['analysis', 'plot', 'rhythm', 'tension', 'pacing'],
  },
};

// ============================================================
// Split Plot Node Into Chapters Template
// ============================================================

/**
 * Split Plot Node Into Chapters Template
 *
 * Used for splitting a plot node into detailed chapter outlines.
 * Based on splitPlotNodeIntoChapters in services/gemini/plot.ts
 */
const SPLIT_PLOT_NODE_INTO_CHAPTERS_TEMPLATE: PromptTemplate = {
  id: 'split_plot_node_into_chapters',
  name: 'Split Plot Node Into Chapters',
  description: 'Split a plot beat into detailed chapter outlines with scene beats',
  category: 'generation',
  systemInstruction: `You are a master story architect specializing in chapter structure and scene beats. Your task is to:

1. Split plot beats into 2-3 detailed chapter outlines
2. Create clear chapter titles and summaries
3. Define POV characters for each chapter
4. Include 3-5 scene beats per chapter (CONTENT/ACTION/DIALOGUE/TWIST)

Ensure logical flow and dramatic tension across chapters.`,

  userPromptBlocks: [
    {
      id: 'genre_info',
      title: 'Genre Information',
      order: 1,
      template: `Novel Genre: {{genre}}`,
      metadata: {
        tier: 'context',
        isStatic: false,
        dataSource: 'computed',
        description: 'Novel genre information'
      }
    },
    {
      id: 'global_context',
      title: 'Global Story Context',
      order: 2,
      template: `[Global Plot Overview]:
{{fullPlotSummary}}`,
      metadata: {
        tier: 'context',
        isStatic: false,
        dataSource: 'computed',
        description: 'Global plot summary for story continuity'
      }
    },
    {
      id: 'character_context',
      title: 'Character & World Context',
      order: 3,
      template: `{{contextStr}}`,
      metadata: {
        tier: 'context',
        isStatic: false,
        dataSource: 'computed',
        description: 'Formatted character and world context'
      }
    },
    {
      id: 'target_node',
      title: 'Target Plot Beat',
      order: 4,
      template: `[Current Plot Beat to Split]:
Title: {{targetNode.title}}
Content: {{targetNode.content}}`,
      metadata: {
        tier: 'task',
        isStatic: false,
        dataSource: 'user_input',
        description: 'The plot node to be split into chapters'
      }
    },
    {
      id: 'task_requirements',
      title: 'Task Requirements',
      order: 5,
      template: `Task: Split this plot beat into {{countInstruction}} detailed chapter outlines.

Requirements:
1. Each chapter must have a clear [Title]
2. Provide detailed [Summary] describing core reversals, key dialogues or actions
3. Specify appropriate [Expected POV] character
4. Include 3-5 scene beats per chapter

[Beat Types]:
- CONTENT: Setup/description
- ACTION: Action/events
- DIALOGUE: Key conversations
- TWIST: Turns/suspense

Output JSON array format. No preamble.`,
      metadata: {
        tier: 'constraint',
        isStatic: true,
        dataSource: 'static',
        description: 'Task requirements with beat types and output format'
      }
    },
  ],

  variables: [
    {
      name: 'genre',
      type: 'string',
      tier: 'critical',
      source: 'project_state',
      required: true,
      description: 'Novel genre',
      display: '小说类型',
    },
    {
      name: 'fullPlotSummary',
      type: 'string',
      tier: 'critical',
      source: 'project_state',
      required: true,
      description: 'Global plot summary',
      display: '全局剧情概览',
    },
    {
      name: 'targetNode',
      type: 'object',
      tier: 'critical',
      source: 'user_input',
      required: true,
      description: 'The plot node to split',
      display: '目标情节节点',
    },
    {
      name: 'contextStr',
      type: 'string',
      tier: 'important',
      source: 'computed',
      required: false,
      description: 'Formatted character and world context',
      display: '上下文',
    },
    {
      name: 'fissionCount',
      type: 'number',
      tier: 'optional',
      source: 'user_input',
      required: false,
      description: 'Number of chapters to split into',
      display: '拆分数量',
    },
    {
      name: 'countInstruction',
      type: 'string',
      tier: 'important',
      source: 'computed',
      required: false,
      description: 'Formatted count instruction',
      display: '数量指令',
    },
  ],

  metadata: {
    version: '1.0.0',
    author: 'Muse System',
    lastUpdated: '2026-03-28',
    tags: ['generation', 'chapter', 'outline', 'fission', 'plot'],
  },
};

// ============================================================
// Regenerate Chapter Outline Template
// ============================================================

/**
 * Regenerate Chapter Outline Template
 *
 * Used for regenerating a single chapter outline.
 * Based on regenerateChapterOutline in services/gemini/plot.ts
 */
const REGENERATE_CHAPTER_OUTLINE_TEMPLATE: PromptTemplate = {
  id: 'regenerate_chapter_outline',
  name: 'Regenerate Chapter Outline',
  description: 'Regenerate a single chapter outline based on context',
  category: 'refinement',
  systemInstruction: `You are a skilled story editor specializing in chapter revision. Your task is to:

1. Rewrite the chapter outline to fix issues
2. Maintain continuity with previous and next chapters
3. Align with the parent plot beat
4. Preserve or optimize title and POV

Output only the revised chapter in JSON array format.`,

  userPromptBlocks: [
    {
      id: 'genre_info',
      title: 'Genre Information',
      order: 1,
      template: `Novel Genre: {{genre}}`,
      metadata: {
        tier: 'context',
        isStatic: false,
        dataSource: 'computed',
        description: 'Novel genre information'
      }
    },
    {
      id: 'global_context',
      title: 'Global Story Context',
      order: 2,
      template: `[Global Plot Overview]:
{{fullPlotSummary}}`,
      metadata: {
        tier: 'context',
        isStatic: false,
        dataSource: 'computed',
        description: 'Global plot summary for story continuity'
      }
    },
    {
      id: 'character_context',
      title: 'Character & World Context',
      order: 3,
      template: `{{contextStr}}`,
      metadata: {
        tier: 'context',
        isStatic: false,
        dataSource: 'computed',
        description: 'Formatted character and world context'
      }
    },
    {
      id: 'parent_node',
      title: 'Parent Plot Beat',
      order: 4,
      template: `[Parent Plot Beat]:
Title: {{targetNode.title}}
Content: {{targetNode.content}}`,
      metadata: {
        tier: 'context',
        isStatic: false,
        dataSource: 'user_input',
        description: 'Parent plot beat that contains this chapter'
      }
    },
    {
      id: 'previous_chapter',
      title: 'Previous Chapter',
      order: 5,
      template: `[Previous Chapter Outline]:
Title: {{previousChapter.title}}
Content: {{previousChapter.summary}}`,
      condition: 'previousChapter != null',
      metadata: {
        tier: 'context',
        isStatic: false,
        dataSource: 'computed',
        description: 'Previous chapter outline for continuity'
      }
    },
    {
      id: 'next_chapter',
      title: 'Next Chapter',
      order: 6,
      template: `[Next Chapter Outline]:
Title: {{nextChapter.title}}
Content: {{nextChapter.summary}}`,
      condition: 'nextChapter != null',
      metadata: {
        tier: 'context',
        isStatic: false,
        dataSource: 'computed',
        description: 'Next chapter outline for continuity'
      }
    },
    {
      id: 'current_chapter',
      title: 'Chapter to Rewrite',
      order: 7,
      template: `[Current Chapter to Rewrite]:
Title: {{chapterToRewrite.title}}
Original Content: {{chapterToRewrite.summary}}
Original POV: {{chapterToRewrite.expectedPOV}}`,
      metadata: {
        tier: 'task',
        isStatic: false,
        dataSource: 'user_input',
        description: 'The chapter to be rewritten'
      }
    },
    {
      id: 'task_requirements',
      title: 'Task Requirements',
      order: 8,
      template: `Task: Rewrite this chapter outline based on context.

Requirements:
1. Provide detailed [Summary] with core reversals, dialogues, actions
2. Ensure perfect connection with previous and next chapters
3. Align with parent plot beat
4. Keep or optimize title and POV

Output JSON array with single chapter. No preamble.`,
      metadata: {
        tier: 'constraint',
        isStatic: true,
        dataSource: 'static',
        description: 'Task requirements and output format for chapter rewrite'
      }
    },
  ],

  variables: [
    {
      name: 'genre',
      type: 'string',
      tier: 'critical',
      source: 'project_state',
      required: true,
      description: 'Novel genre',
      display: '小说类型',
    },
    {
      name: 'fullPlotSummary',
      type: 'string',
      tier: 'critical',
      source: 'project_state',
      required: true,
      description: 'Global plot summary',
      display: '全局剧情概览',
    },
    {
      name: 'targetNode',
      type: 'object',
      tier: 'critical',
      source: 'user_input',
      required: true,
      description: 'Parent plot node',
      display: '父情节节点',
    },
    {
      name: 'chapterToRewrite',
      type: 'object',
      tier: 'critical',
      source: 'user_input',
      required: true,
      description: 'Chapter to rewrite',
      display: '待重写章节',
    },
    {
      name: 'previousChapter',
      type: 'object',
      tier: 'important',
      source: 'project_state',
      required: false,
      description: 'Previous chapter for continuity',
      display: '上一章',
    },
    {
      name: 'nextChapter',
      type: 'object',
      tier: 'important',
      source: 'project_state',
      required: false,
      description: 'Next chapter for continuity',
      display: '下一章',
    },
    {
      name: 'contextStr',
      type: 'string',
      tier: 'important',
      source: 'computed',
      required: false,
      description: 'Formatted character and world context',
      display: '上下文',
    },
  ],

  metadata: {
    version: '1.0.0',
    author: 'Muse System',
    lastUpdated: '2026-03-28',
    tags: ['refinement', 'chapter', 'outline', 'rewrite'],
  },
};

// ============================================================
// Generate Twist Hooks Template
// ============================================================

/**
 * Generate Twist Hooks Template
 *
 * Used for generating plot twist inspiration.
 * Based on generateTwistHooks in services/gemini/plot.ts
 */
const GENERATE_TWIST_HOOKS_TEMPLATE: PromptTemplate = {
  id: 'generate_twist_hooks',
  name: 'Generate Twist Hooks',
  description: 'Generate plot twist inspiration and dramatic hooks',
  category: 'generation',
  systemInstruction: `You are a master story planner specializing in dramatic twists and narrative hooks. Your task is to:

1. Generate 3 highly dramatic plot hooks or twist ideas
2. Ensure logical consistency within the story world
3. Maximize dramatic impact and character relationship dynamics
4. Match the genre style (fantasy, urban, mystery, etc.)

Output 3 numbered ideas directly. No preamble.`,

  userPromptBlocks: [
    {
      id: 'requirements',
      title: 'Requirements',
      order: 1,
      template: `[Twist Requirements]:
1. Logical: Unexpected but reasonable within story logic
2. Dramatic: Instantly elevates tension or shifts character dynamics
3. Style-matched: Adapt to genre (fantasy/urban/mystery/etc.)`,
      metadata: {
        tier: 'constraint',
        isStatic: true,
        dataSource: 'static',
        description: 'Static twist generation requirements'
      }
    },
    {
      id: 'story_context',
      title: 'Story Context',
      order: 2,
      template: `[Story Background/Memory]:
{{context}}`,
      metadata: {
        tier: 'context',
        isStatic: false,
        dataSource: 'computed',
        description: 'Story background and memory context for twist generation'
      }
    },
    {
      id: 'plot_target',
      title: 'Plot Target',
      order: 3,
      template: `[Plot Goal]:
{{plotBeat}}`,
      metadata: {
        tier: 'task',
        isStatic: false,
        dataSource: 'user_input',
        description: 'Target plot beat for twist generation'
      }
    },
    {
      id: 'output_format',
      title: 'Output Format',
      order: 4,
      template: `Output 3 ideas, one per line, numbered (e.g., "1. ..."). No extra commentary.`,
      metadata: {
        tier: 'format',
        isStatic: true,
        dataSource: 'static',
        description: 'Output format specification for twist ideas'
      }
    },
  ],

  variables: [
    {
      name: 'context',
      type: 'string',
      tier: 'critical',
      source: 'project_state',
      required: true,
      description: 'Story background and memory context',
      display: '故事背景',
    },
    {
      name: 'plotBeat',
      type: 'string',
      tier: 'critical',
      source: 'user_input',
      required: true,
      description: 'Target plot beat for twist generation',
      display: '情节目标',
    },
  ],

  metadata: {
    version: '1.0.0',
    author: 'Muse System',
    lastUpdated: '2026-03-28',
    tags: ['generation', 'twist', 'inspiration', 'drama', 'hooks'],
  },
};

// ============================================================
// Exports
// ============================================================

export const PLOT_TEMPLATES = {
  generate_plot: GENERATE_PLOT_TEMPLATE,
  rewrite_plot: REWRITE_PLOT_TEMPLATE,
  analyze_plot_rhythm: ANALYZE_PLOT_RHYTHM_TEMPLATE,
  split_plot_node_into_chapters: SPLIT_PLOT_NODE_INTO_CHAPTERS_TEMPLATE,
  regenerate_chapter_outline: REGENERATE_CHAPTER_OUTLINE_TEMPLATE,
  generate_twist_hooks: GENERATE_TWIST_HOOKS_TEMPLATE,
};

// Export individual templates
export {
  GENERATE_PLOT_TEMPLATE,
  REWRITE_PLOT_TEMPLATE,
  ANALYZE_PLOT_RHYTHM_TEMPLATE,
  SPLIT_PLOT_NODE_INTO_CHAPTERS_TEMPLATE,
  REGENERATE_CHAPTER_OUTLINE_TEMPLATE,
  GENERATE_TWIST_HOOKS_TEMPLATE,
};
