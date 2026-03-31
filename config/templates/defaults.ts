/**
 * Default Prompt Template Definitions
 *
 * This file defines the default templates for various AI generation tasks.
 * Templates are structured with variable definitions and importance tiers.
 *
 * @see types/promptTemplate.ts for unified type definitions
 */

// Import unified types from central location
import {
  VariableTier,
  VariableSource,
  BlockTier,
  BlockDataSource,
  BlockMetadata,
  PromptBlock,
} from '../../types/promptTemplate';

// Re-export for backward compatibility
export type {
  VariableTier,
  VariableSource,
  BlockTier,
  BlockDataSource,
  BlockMetadata,
};

// ============================================================
// Local Type Definitions (specific to this file)
// ============================================================

/**
 * Template variable definition
 */
export interface TemplateVariable {
  name: string;           // Variable identifier (e.g., {{genre}})
  type: 'string' | 'string[]' | 'number' | 'boolean' | 'object';
  tier: VariableTier;     // Importance level
  source: VariableSource; // Data source
  required: boolean;      // Whether this variable must be provided
  description: string;    // Human-readable description
  display?: string;       // Display name in UI (Chinese)
  defaultValue?: unknown; // Default value if not provided
}

/**
 * Complete template definition
 */
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
// Batch Generate Characters Template
// ============================================================

/**
 * Batch Generate Characters Template
 *
 * Used for generating multiple characters at once based on premise, genre, and setting.
 */
const BATCH_GENERATE_CHARACTERS_TEMPLATE: PromptTemplate = {
  id: 'batch_generate_characters',
  name: 'Batch Generate Characters',
  description: 'Generate multiple characters at once based on story premise and genre',
  category: 'generation',
  systemInstruction: `You are an expert character designer for novels and creative writing. Your task is to create compelling, multi-dimensional characters that:

1. Fit naturally within the story's genre and world setting
2. Have clear motivations, flaws, and character arcs
3. Possess distinctive voices and personalities
4. Maintain internal consistency with their backgrounds
5. Serve the narrative while feeling like real people

Create characters that readers will remember and care about.`,

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

[World Setting]
{{settingText}}`,
      metadata: {
        tier: 'context',
        isStatic: false,
        dataSource: 'user_input',
        description: 'Story premise, genre and world setting context'
      }
    },

    // Block 2: Character Configuration Requirements
    {
      id: 'character_config',
      title: 'Character Configuration Requirements',
      order: 2,
      template: `[Character Configuration Requirements]
Please generate a diverse cast of characters based on the story context above. Each character should include:

1. **Basic Information**: Name, age, gender, role in story
2. **Physical Description**: Distinctive appearance traits
3. **Personality**: Core traits, strengths, and flaws
4. **Background**: Origin, history, and formative experiences
5. **Motivations**: Goals, desires, and what drives them
6. **Relationships**: Key connections to other characters
7. **Character Arc**: Potential growth trajectory

Ensure characters complement each other and create interesting dynamics.`,
      metadata: {
        tier: 'task',
        isStatic: true,
        dataSource: 'static',
        description: 'Character generation requirements and structure'
      }
    },

    // Block 3: Core Requirements
    {
      id: 'core_requirements',
      title: 'Core Requirements',
      order: 3,
      template: `[Core Requirements]
- Characters should feel authentic and three-dimensional
- Avoid stereotypes and cliches
- Each character should have a unique voice and perspective
- Consider how characters will interact and create conflict
- Ensure diversity in personality, background, and motivation
- Characters should serve the story while feeling independent

Output each character in a structured format that can be easily parsed and integrated into the story management system.`,
      metadata: {
        tier: 'constraint',
        isStatic: true,
        dataSource: 'static',
        description: 'Quality constraints for character generation'
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
      description: 'The story premise/logline for character generation',
      display: 'Story Premise',
    },
    {
      name: 'genre',
      type: 'string',
      tier: 'critical',
      source: 'project_state',
      required: true,
      description: 'The novel genre for character style guidance',
      display: 'Novel Genre',
    },
    {
      name: 'settingText',
      type: 'string',
      tier: 'critical',
      source: 'project_state',
      required: true,
      description: 'World setting description for character context',
      display: 'World Setting',
    },
  ],

  metadata: {
    version: '1.0.0',
    author: 'Muse System',
    lastUpdated: '2026-03-27',
    tags: ['character', 'generation', 'batch', 'creative-writing'],
  },
};

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
// Generate Plot Template
// ============================================================

/**
 * Generate Plot Template
 *
 * Used for generating story plot outlines based on premise, characters, and settings.
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
// Generate Single Character Template
// ============================================================

/**
 * Generate Single Character Template
 *
 * Used for generating a single character with full depth fields.
 * Based on generateSingleCharacter in services/gemini/world.ts
 */
const GENERATE_SINGLE_CHARACTER_TEMPLATE: PromptTemplate = {
  id: 'generate_single_character',
  name: 'Generate Single Character',
  description: 'Generate a single detailed character with depth fields (desire, fear, signature, weakness, alignment)',
  category: 'generation',
  systemInstruction: `You are an expert character designer for novels. Your task is to create a single, multi-dimensional character with deep psychological profile:

1. Create characters with clear motivations, flaws, and growth potential
2. Ensure psychological depth through desire/fear/weakness analysis
3. Give distinctive signature traits that make characters memorable
4. Define moral alignment for behavioral consistency
5. Consider how the character serves the story while feeling authentic

Create characters that readers will remember and care about.`,

  userPromptBlocks: [
    // Block 1: Story Context
    {
      id: 'story_context',
      title: 'Story Context',
      order: 1,
      template: `[Story Premise]: {{premise}}
[Genre]: {{genre}}
{{settingText}}`,
      metadata: {
        tier: 'context',
        isStatic: false,
        dataSource: 'computed',
        description: '故事前提、类型和风格设定'
      }
    },

    // Block 2: Character Basics
    {
      id: 'character_basics',
      title: 'Character Basic Information',
      order: 2,
      template: `[Character Name]: {{name}}
[Character Role]: {{role}}`,
      metadata: {
        tier: 'context',
        isStatic: false,
        dataSource: 'user_input',
        description: '角色名称和定位'
      }
    },

    // Block 3: Generation Requirements
    {
      id: 'generation_requirements',
      title: 'Character Generation Requirements',
      order: 3,
      template: `Please create a detailed character profile including:
- Physical appearance traits
- Core personality (moral alignment)
- Motivation and goals (desire and fear)
- Secrets and flaws
- Abilities

[Core Requirements]:
- **Depth**: Must have clear desire, core fear, signature trait, weakness/flaw
- **Moral Alignment**: Lawful good, chaotic evil, etc.
- **Consistency**: Character should fit story genre and tone
- **Memorability**: Signature traits should make character stand out

Output character profile in structured format.`,
      metadata: {
        tier: 'task',
        isStatic: true,
        dataSource: 'static',
        description: '角色生成要求和输出格式'
      }
    },
  ],

  variables: [
    // === CRITICAL VARIABLES ===
    {
      name: 'name',
      type: 'string',
      tier: 'critical',
      source: 'user_input',
      required: true,
      description: 'Character name to generate',
      display: '角色名称',
    },
    {
      name: 'role',
      type: 'string',
      tier: 'critical',
      source: 'user_input',
      required: true,
      description: 'Character role (protagonist, antagonist, mentor, ally, etc.)',
      display: '角色定位',
    },
    {
      name: 'premise',
      type: 'string',
      tier: 'critical',
      source: 'user_input',
      required: true,
      description: 'Story premise for character context',
      display: '故事梗概',
    },
    {
      name: 'genre',
      type: 'string',
      tier: 'critical',
      source: 'project_state',
      required: true,
      description: 'Novel genre for character style',
      display: '小说类型',
    },
    // === OPTIONAL VARIABLES ===
    {
      name: 'settingText',
      type: 'string',
      tier: 'optional',
      source: 'computed',
      required: false,
      description: 'Style requirements from creative settings',
      display: '风格要求',
    },
  ],

  metadata: {
    version: '1.0.0',
    author: 'Muse System',
    lastUpdated: '2026-03-28',
    tags: ['character', 'generation', 'single', 'depth', 'creative-writing'],
  },
};

// ============================================================
// Shura Field Conflict Template
// ============================================================

/**
 * Shura Field Conflict Template
 *
 * Used for generating multi-character conflict scenarios (Shura Field).
 * Based on generateConflictScenario in services/gemini/shuraField.ts
 */
const SHURA_FIELD_CONFLICT_TEMPLATE: PromptTemplate = {
  id: 'shura_field_conflict',
  name: 'Shura Field Conflict',
  description: 'Generate high-density multi-character conflict scenarios with layered confrontations and reversals',
  category: 'generation',
  systemInstruction: `You are a master conflict scene designer specializing in multi-character confrontations, psychological warfare, and dramatic tension. Your task is to create compelling conflict scenes that:

1. Feature multiple characters with clear and opposing goals
2. Build tension through layered confrontations (minimum 3 rounds of conflict/reversal)
3. Balance dialogue, action, and psychological insight
4. Ensure each character acts consistently with their personality and motivations
5. Deliver unexpected but logical outcomes that serve the narrative
6. Maintain high dramatic stakes appropriate to the intensity level

Create conflict scenes that readers cannot look away from.`,

  userPromptBlocks: [
    // Block 1: Character Profiles
    {
      id: 'character_profiles',
      title: 'Character Profiles',
      order: 1,
      template: `[Shura Field Participants]
{{characterContext}}`,
      metadata: {
        tier: 'context',
        isStatic: false,
        dataSource: 'computed',
        description: '格式化的角色档案包含关系和潜在冲突点'
      }
    },

    // Block 2: Location Context
    {
      id: 'location_context',
      title: 'Location Context',
      order: 2,
      template: `[Scene Location]
{{locationContext}}`,
      condition: 'locationContext != null && locationContext !== ""',
      metadata: {
        tier: 'context',
        isStatic: false,
        dataSource: 'computed',
        description: '冲突场景的具体位置细节'
      }
    },

    // Block 3: World Context
    {
      id: 'world_context',
      title: 'World Constraints',
      order: 3,
      template: `[World Constraints]
{{worldContext}}`,
      condition: 'worldContext != null && worldContext !== ""',
      metadata: {
        tier: 'context',
        isStatic: false,
        dataSource: 'computed',
        description: '相关的世界设定约束'
      }
    },

    // Block 4: Plot Background
    {
      id: 'plot_background',
      title: 'Plot Background',
      order: 4,
      template: `[Plot Background]
{{plotContext}}`,
      metadata: {
        tier: 'context',
        isStatic: false,
        dataSource: 'user_input',
        description: '冲突场景的剧情背景和上下文'
      }
    },

    // Block 5: Generation Requirements
    {
      id: 'generation_requirements',
      title: 'Conflict Scenario Requirements',
      order: 5,
      template: `[Task Requirements]:
1. Design a high-density conflict scene between {{participantCount}} characters.
2. Conflict intensity level: {{intensityLevel}}/10 ({{intensityDescription}})
3. Each character must have clear goals, motivations, and secrets (or hidden information).
4. The conflict must escalate through at least 3 rounds of confrontation or reversal.
5. The ending must be unexpected but consistent with character personalities.
6. Must clearly specify: core stakes, conflict type, and intensity level.

[Conflict Type Definitions]:
- CONFRONTATION: Direct confrontation, argument, debate, or negotiation
- CLIMAX: Climactic conflict, decisive moment
- TWIST: Reversal conflict, truth revelation, or betrayal

[Output Format]:
Please output a single plot node in the following JSON format:
{
  "title": "Plot title (highlighting the core conflict)",
  "content": "Detailed multi-character conflict scene description, including:\n   - Opening atmosphere and character entrances\n   - Each party's stance and goals\n   - First round of confrontation/engagement\n   - Second round of confrontation/reversal\n   - Third round of confrontation/climax\n   - Outcome and subsequent impact",
  "beatTag": "CLIMAX" | "PLOT_POINT_2" | "MIDPOINT",
  "relatedCharacters": [{{relatedCharacterIds}}],
  "relatedLocations": [{{relatedLocationId}}],
  "conflictScenario": {
    "type": "CONFRONTATION" | "CLIMAX" | "TWIST",
    "participants": [{{relatedCharacterIds}}],
    "stakes": "Core stakes of the conflict (e.g., throne succession, business control, romantic affiliation, family honor, survival opportunity, etc.)",
    "intensity": {{intensityLevel}}
  }
}

IMPORTANT: Output ONLY the JSON. No opening remarks, no explanations, no markdown code blocks.`,
      metadata: {
        tier: 'constraint',
        isStatic: false,
        dataSource: 'derived',
        description: '任务要求和输出格式，包含动态参数（参与者数量、强度等级）'
      }
    },
  ],

  variables: [
    // === CRITICAL VARIABLES ===
    {
      name: 'characterContext',
      type: 'string',
      tier: 'critical',
      source: 'computed',
      required: true,
      description: 'Formatted character profiles with relationships and potential conflict points',
      display: '角色档案',
    },
    {
      name: 'plotContext',
      type: 'string',
      tier: 'critical',
      source: 'user_input',
      required: true,
      description: 'Plot background and context for the conflict scene',
      display: '情节背景',
    },
    {
      name: 'intensityLevel',
      type: 'number',
      tier: 'critical',
      source: 'user_input',
      required: true,
      description: 'Conflict intensity level from 1-10',
      display: '冲突强度',
      defaultValue: 7,
    },
    {
      name: 'participantCount',
      type: 'number',
      tier: 'critical',
      source: 'computed',
      required: true,
      description: 'Number of characters participating in the conflict',
      display: '参与人数',
    },
    {
      name: 'relatedCharacterIds',
      type: 'string',
      tier: 'critical',
      source: 'computed',
      required: true,
      description: 'JSON array string of participating character IDs',
      display: '角色ID列表',
    },
    {
      name: 'intensityDescription',
      type: 'string',
      tier: 'critical',
      source: 'computed',
      required: true,
      description: 'Human-readable intensity level description',
      display: '强度描述',
    },
    // === IMPORTANT VARIABLES ===
    {
      name: 'genre',
      type: 'string',
      tier: 'important',
      source: 'project_state',
      required: false,
      description: 'Novel genre for tone and style guidance',
      display: '小说类型',
    },
    {
      name: 'worldContext',
      type: 'string',
      tier: 'important',
      source: 'computed',
      required: false,
      description: 'Relevant world setting constraints for the scene',
      display: '世界观约束',
    },
    // === OPTIONAL VARIABLES ===
    {
      name: 'locationContext',
      type: 'string',
      tier: 'optional',
      source: 'computed',
      required: false,
      description: 'Specific location details for the conflict scene',
      display: '场景地点',
    },
    {
      name: 'relatedLocationId',
      type: 'string',
      tier: 'optional',
      source: 'computed',
      required: false,
      description: 'JSON array string of related location IDs',
      display: '地点ID列表',
      defaultValue: '',
    },
    {
      name: 'allCharacters',
      type: 'object',
      tier: 'optional',
      source: 'project_state',
      required: false,
      description: 'Full character list for relationship context',
      display: '全部角色',
    },
    {
      name: 'worldSettings',
      type: 'object',
      tier: 'optional',
      source: 'project_state',
      required: false,
      description: 'World settings for context retrieval',
      display: '世界观设定',
    },
    {
      name: 'locationId',
      type: 'string',
      tier: 'optional',
      source: 'user_input',
      required: false,
      description: 'Optional specific location ID for the scene',
      display: '指定地点ID',
    },
    {
      name: 'selectedCharacters',
      type: 'object',
      tier: 'optional',
      source: 'user_input',
      required: false,
      description: 'Array of selected characters for the conflict',
      display: '选中角色',
    },
  ],

  metadata: {
    version: '1.0.0',
    author: 'Muse System',
    lastUpdated: '2026-03-28',
    tags: ['shura-field', 'conflict', 'multi-character', 'confrontation', 'generation'],
  },
};

// ============================================================
// Audit Plot Template
// ============================================================

/**
 * Audit Plot Template
 *
 * Used for deep plot auditing for logic and pacing.
 */
const AUDIT_PLOT_TEMPLATE: PromptTemplate = {
  id: 'audit_plot',
  name: 'Audit Plot',
  description: 'Deep plot auditing for logic, pacing, and consistency',
  category: 'analysis',
  systemInstruction: `You are a senior narrative analyst specializing in plot logic, pacing, and story structure. Your task is to:

1. Identify logical inconsistencies and plot holes
2. Evaluate pacing and narrative flow
3. Check character motivation consistency
4. Assess world-building coherence
5. Provide actionable improvement suggestions

Be thorough, critical, and constructive. Focus on issues that impact reader immersion and story credibility.`,

  userPromptBlocks: [
    // Block 1: Core Premise
    {
      id: 'core_premise',
      title: 'Core Premise',
      order: 1,
      template: `[Core Premise]
{{premise}}`,
      metadata: {
        tier: 'context',
        isStatic: false,
        dataSource: 'user_input',
        description: 'Story core premise for audit context'
      }
    },

    // Block 2: Context
    {
      id: 'context',
      title: 'Character and World Context',
      order: 2,
      template: `{{contextStr}}`,
      condition: 'contextStr != null && contextStr !== ""',
      metadata: {
        tier: 'context',
        isStatic: false,
        dataSource: 'computed',
        description: 'Character and world context for plot audit'
      }
    },

    // Block 3: Current Plot
    {
      id: 'current_plot',
      title: 'Current Plot Outline',
      order: 3,
      template: `[Current Plot Outline]
{{currentPlot}}`,
      metadata: {
        tier: 'context',
        isStatic: false,
        dataSource: 'user_input',
        description: 'Current plot outline to be audited'
      }
    },

    // Block 4: Audit Instructions
    {
      id: 'audit_instructions',
      title: 'Audit Task',
      order: 4,
      template: `Please conduct a comprehensive audit of the above plot outline. Focus on:

1. **Logic Consistency**: Are there plot holes, contradictions, or implausible events?
2. **Character Motivation**: Do character actions align with their established personalities and goals?
3. **Pacing Analysis**: Is the narrative rhythm appropriate? Are there slow sections or rushed moments?
4. **World-Building Coherence**: Does the plot respect established world rules and settings?
5. **Narrative Structure**: Are plot beats properly connected with clear cause-and-effect?

Please output your analysis in Markdown format. Ensure the report includes a clear "Actionable Suggestions List" at the end for automated fix procedures.`,
      metadata: {
        tier: 'task',
        isStatic: true,
        dataSource: 'static',
        description: 'Static audit task instructions and output format requirements'
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
      description: 'The core premise/logline of the story',
      display: '核心梗概',
    },
    {
      name: 'currentPlot',
      type: 'string',
      tier: 'critical',
      source: 'user_input',
      required: true,
      description: 'The current plot outline to audit',
      display: '当前剧情大纲',
    },
    // === IMPORTANT VARIABLES ===
    {
      name: 'contextStr',
      type: 'string',
      tier: 'important',
      source: 'computed',
      required: false,
      description: 'Formatted context string with characters and world settings',
      display: '上下文信息',
    },
  ],

  metadata: {
    version: '1.0.0',
    author: 'Muse System',
    lastUpdated: '2026-03-28',
    tags: ['audit', 'plot', 'analysis', 'logic', 'pacing'],
  },
};

// ============================================================
// Audit Chapter Plan Template
// ============================================================

/**
 * Audit Chapter Plan Template
 *
 * Used for auditing chapter plans against plot node goals.
 */
const AUDIT_CHAPTER_PLAN_TEMPLATE: PromptTemplate = {
  id: 'audit_chapter_plan',
  name: 'Audit Chapter Plan',
  description: 'Audit chapter plans against plot node goals for alignment and drift',
  category: 'analysis',
  systemInstruction: `You are a rigorous plot quality auditor. Your task is to verify that chapter plans faithfully implement their associated plot node requirements and identify any "drift" or excessive deviation.

Focus on:
1. Alignment checking: Do the chapters fulfill all core objectives of the plot node?
2. Drift detection: Are there chapters introducing irrelevant subplots or deviating from character motivations?
3. Logic contradictions: Are there logical inconsistencies between chapters?

Output must be a valid JSON object with no additional text.`,

  userPromptBlocks: [
    // Block 1: Genre Information
    {
      id: 'genre_info',
      title: 'Genre Information',
      order: 1,
      template: `[Novel Genre]
{{genre}}`,
      metadata: {
        tier: 'context',
        isStatic: false,
        dataSource: 'computed',
        description: '小说类型用于审核上下文'
      }
    },

    // Block 2: Context
    {
      id: 'context',
      title: 'Character and World Context',
      order: 2,
      template: `{{contextStr}}`,
      condition: 'contextStr != null && contextStr !== ""',
      metadata: {
        tier: 'context',
        isStatic: false,
        dataSource: 'computed',
        description: '角色和世界上下文用于章节计划审核'
      }
    },

    // Block 3: Target Node
    {
      id: 'target_node',
      title: 'Target Plot Node',
      order: 3,
      template: `[Target Plot Node Goals]
Title: {{targetNode.title}}
Core Content: {{targetNode.content}}`,
      metadata: {
        tier: 'context',
        isStatic: false,
        dataSource: 'user_input',
        description: '目标情节节点用于审核对照'
      }
    },

    // Block 4: Chapters
    {
      id: 'chapters',
      title: 'Chapter Plans',
      order: 4,
      template: `[Current Chapter Plans]
{{#each chapters}}
[Chapter {{@index}}: {{this.title}}]
Summary: {{this.summary}}
Beats:
{{#each this.beats}}
- [{{this.type}}] {{this.description}}
{{/each}}

{{/each}}`,
      metadata: {
        tier: 'context',
        isStatic: false,
        dataSource: 'user_input',
        description: '待审核的章节计划列表'
      }
    },

    // Block 5: Audit Task
    {
      id: 'audit_task',
      title: 'Audit Task',
      order: 5,
      template: `Audit Tasks:
1. **Alignment Check (Align)**: Do the chapter plans fulfill all core objectives set by the plot node?
2. **Drift Detection (Drift)**: Are there chapters introducing irrelevant subplot unrelated to the main line, or deviating from character motivations set by the node?
3. **Logic Contradictions (Contradiction)**: Are there logical inconsistencies between chapters?

**Important Output Format**:
You must return a JSON object:
{
  "isAligned": true/false,
  "issues": [
    { "type": "GAP/DRIFT/CONTRADICTION", "description": "Issue description", "suggestion": "Fix suggestion" },
    ...
  ]
}
Do not include any opening remarks or explanatory text.`,
      metadata: {
        tier: 'constraint',
        isStatic: true,
        dataSource: 'static',
        description: '审核任务指令和JSON输出格式要求'
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
      display: '小说类型',
    },
    {
      name: 'targetNode',
      type: 'object',
      tier: 'critical',
      source: 'user_input',
      required: true,
      description: 'The target plot node to audit against',
      display: '目标情节节点',
    },
    {
      name: 'chapters',
      type: 'object',
      tier: 'critical',
      source: 'user_input',
      required: true,
      description: 'Array of chapter plans to audit',
      display: '章节规划列表',
    },
    // === IMPORTANT VARIABLES ===
    {
      name: 'contextStr',
      type: 'string',
      tier: 'important',
      source: 'computed',
      required: false,
      description: 'Formatted context string with characters and world settings',
      display: '上下文信息',
    },
  ],

  metadata: {
    version: '1.0.0',
    author: 'Muse System',
    lastUpdated: '2026-03-28',
    tags: ['audit', 'chapter', 'plan', 'alignment', 'drift'],
  },
};

// ============================================================
// Extract Knowledge Triples Template
// ============================================================

/**
 * Extract Knowledge Triples Template
 *
 * Used for extracting knowledge triples from content for the knowledge graph.
 */
const EXTRACT_KNOWLEDGE_TRIPLES_TEMPLATE: PromptTemplate = {
  id: 'extract_knowledge_triples',
  name: 'Extract Knowledge Triples',
  description: 'Extract knowledge triples (subject-relation-object) from content for knowledge graph',
  category: 'analysis',
  systemInstruction: `You are a novel editor expert in logical analysis. Your task is to extract core character locations, character relationships, and major facts as triples from given content, and evaluate relationship strength and trends.

Focus on:
1. Extracting factual statements like "A is at location B", "A has relationship C with B", "A possesses item B"
2. Keeping subjects and objects as brief names (character names, location names)
3. Using concise relation vocabulary (e.g., "located at", "at", "hates", "loves", "possesses")
4. Providing quantitative evaluations (weight, trajectory, foreshadowing status)

Output must be a valid JSON array with no additional text.`,

  userPromptBlocks: [
    // Block 1: Extraction Requirements
    {
      id: 'extraction_requirements',
      title: 'Extraction Requirements',
      order: 1,
      template: `[Extraction Requirements]
1. Focus on extracting facts like "A at location B", "A and B have relationship C", "A possesses item B"
2. Keep Subject and Object as brief names (character names, location names)
3. Use concise vocabulary for Relation (e.g., "located at", "at", "hates", "loves", "possesses")
4. **Quantitative Evaluation**:
   - **weight**: Numeric value 0-100, representing relationship strength or fact importance. E.g., "deep love" = 95, "nodding acquaintance" = 20
   - **trajectory**: Trend analysis, values: ["rising", "falling", "stable"]
   - **isForeshadowing**: Boolean. If this fact/relationship is a **foreshadowing** or unresolved suspense (e.g., obtained mysterious item, heard strange noise, made unfulfilled contract), set to true
   - **status**: Foreshadowing initial status, values: ["OPEN", "RESOLVED", "ABANDONED"]. Default is "OPEN"`,
      metadata: {
        tier: 'task',
        isStatic: true,
        dataSource: 'static',
        description: '提取规则和定量评估标准'
      }
    },

    // Block 2: Content
    {
      id: 'content',
      title: 'Content to Extract',
      order: 2,
      template: `[Content]
{{content}}`,
      metadata: {
        tier: 'context',
        isStatic: false,
        dataSource: 'user_input',
        description: '待提取知识三元的内容文本'
      }
    },

    // Block 3: Format Requirements
    {
      id: 'format_requirements',
      title: 'Output Format',
      order: 3,
      template: `[Format Requirements]
Must return a pure JSON array, format as follows:
[
  {"subject": "CharacterA", "relation": "located at", "object": "LocationB", "weight": 100, "trajectory": "stable", "isForeshadowing": false, "status": "OPEN"},
  {"subject": "Ember", "relation": "possesses", "object": "rusty copper key", "weight": 70, "trajectory": "stable", "isForeshadowing": true, "status": "OPEN"}
]`,
      metadata: {
        tier: 'format',
        isStatic: true,
        dataSource: 'static',
        description: 'JSON输出格式要求和示例'
      }
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
      description: 'The content text to extract knowledge triples from (will be truncated to 5000 chars)',
      display: '正文内容',
    },
  ],

  metadata: {
    version: '1.0.0',
    author: 'Muse System',
    lastUpdated: '2026-03-28',
    tags: ['knowledge', 'triple', 'extraction', 'graph', 'analysis'],
  },
};

// ============================================================
// Audit Chapter Content Template
// ============================================================

/**
 * Audit Chapter Content Template
 *
 * Used for comprehensive chapter content auditing across 10 core dimensions.
 */
const AUDIT_CHAPTER_CONTENT_TEMPLATE: PromptTemplate = {
  id: 'audit_chapter_content',
  name: 'Audit Chapter Content',
  description: 'Comprehensive chapter content audit across 10 core dimensions with severity levels',
  category: 'analysis',
  systemInstruction: `You are a strict novel manuscript editor. Your task is to review chapter content across multiple quality dimensions and provide structured feedback with severity levels.

Audit Dimensions (10 core dimensions):
1. OOC Check - Character behavior consistency with established personality and motivation
2. Timeline Check - Temporal sequence rationality and contradictions
3. Setting Conflicts - Violations of established world-building rules
4. Power System Consistency - Combat system consistency (if applicable)
5. Foreshadowing Check - Forgotten or contradictory planted foreshadowing
6. Pacing Check - Dragging or pacing imbalance
7. Style Check - AI writing traces (equal-length paragraphs, clichés, formulaic transitions)
8. Vocabulary Fatigue - Excessive repetition of specific words
9. Reader Expectation Management - Chapter ending hooks and payoff delivery
10. Outline Deviation - Content deviation from expected direction

Output must be a valid JSON object with no additional text.`,

  userPromptBlocks: [
    // Block 1: Genre and Context
    {
      id: 'genre_context',
      title: 'Genre and Context',
      order: 1,
      template: `[Novel Genre]
{{genre}}

{{contextStr}}`,
      metadata: {
        tier: 'context',
        isStatic: false,
        dataSource: 'computed',
        description: 'Novel genre and formatted context with characters and world settings'
      }
    },

    // Block 2: Genre Rules
    {
      id: 'genre_rules',
      title: 'Genre-Specific Rules',
      order: 2,
      template: `{{genreContext}}`,
      condition: 'genreContext != null && genreContext !== ""',
      metadata: {
        tier: 'context',
        isStatic: false,
        dataSource: 'computed',
        description: 'Genre-specific rules and guidelines for auditing'
      }
    },

    // Block 3: Previous Context
    {
      id: 'previous_context',
      title: 'Previous Chapters Summary',
      order: 3,
      template: `[Previous Chapters Summary]
{{prevContext}}`,
      condition: 'prevContext != null && prevContext !== ""',
      metadata: {
        tier: 'context',
        isStatic: false,
        dataSource: 'computed',
        description: 'Summary of previous chapters for continuity checking'
      }
    },

    // Block 4: Current Chapter
    {
      id: 'current_chapter',
      title: 'Chapter to Audit',
      order: 4,
      template: `[Chapter to Audit]: Chapter {{chapterNumber}} - {{chapterTitle}}
{{chapterContent}}`,
      metadata: {
        tier: 'task',
        isStatic: false,
        dataSource: 'user_input',
        description: 'The chapter content to be audited'
      }
    },

    // Block 5: Audit Instructions
    {
      id: 'audit_instructions',
      title: 'Audit Instructions',
      order: 5,
      template: `Please audit the above chapter content.

Audit Dimensions (10 core dimensions):
1. OOC Check - Character behavior consistency with established personality and motivation
2. Timeline Check - Temporal sequence rationality and contradictions
3. Setting Conflicts - Violations of established world-building rules
4. Power System Consistency - Combat system consistency (if applicable)
5. Foreshadowing Check - Forgotten or contradictory planted foreshadowing
6. Pacing Check - Dragging or pacing imbalance
7. Style Check - AI writing traces (equal-length paragraphs, clichés, formulaic transitions)
8. Vocabulary Fatigue - Excessive repetition of specific words
9. Reader Expectation Management - Chapter ending hooks and payoff delivery
10. Outline Deviation - Content deviation from expected direction

Output format must be pure JSON:
{
  "passed": true,
  "issues": [
    { "severity": "critical|warning|info", "category": "Dimension Name", "description": "Specific Issue", "suggestion": "Fix Suggestion" }
  ],
  "summary": "One-sentence summary"
}

Only when there are critical-level issues should "passed" be false. Do not include any other text.`,
      metadata: {
        tier: 'constraint',
        isStatic: true,
        dataSource: 'static',
        description: 'Static audit instructions with 10-dimension checklist and output format'
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
      display: '小说类型',
    },
    {
      name: 'chapterContent',
      type: 'string',
      tier: 'critical',
      source: 'user_input',
      required: true,
      description: 'The chapter content to audit',
      display: '章节内容',
    },
    {
      name: 'chapterTitle',
      type: 'string',
      tier: 'critical',
      source: 'user_input',
      required: true,
      description: 'The chapter title',
      display: '章节标题',
    },
    {
      name: 'chapterNumber',
      type: 'number',
      tier: 'critical',
      source: 'user_input',
      required: true,
      description: 'The chapter number',
      display: '章节序号',
    },
    // === IMPORTANT VARIABLES ===
    {
      name: 'contextStr',
      type: 'string',
      tier: 'important',
      source: 'computed',
      required: false,
      description: 'Formatted context string with characters and world settings',
      display: '上下文信息',
    },
    {
      name: 'genreContext',
      type: 'string',
      tier: 'important',
      source: 'computed',
      required: false,
      description: 'Genre-specific rules and guidelines',
      display: '类型规则',
    },
    {
      name: 'prevContext',
      type: 'string',
      tier: 'important',
      source: 'computed',
      required: false,
      description: 'Summary of previous chapters for continuity',
      display: '前文摘要',
    },
  ],

  metadata: {
    version: '1.0.0',
    author: 'Muse System',
    lastUpdated: '2026-03-28',
    tags: ['audit', 'chapter', 'content', 'quality', 'multi-dimensional'],
  },
};

// ============================================================
// Analyze Plot Rhythm Template
// ============================================================

/**
 * Analyze Plot Rhythm Template
 *
 * Used for analyzing plot rhythm and tension.
 * Based on analyzePlotRhythm in services/gemini/plot.ts
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
// Export Default Templates
// ============================================================

/**
 * Default prompt templates registry
 */
export const DEFAULT_TEMPLATES: Record<string, PromptTemplate> = {
  scene_generation: SCENE_GENERATION_TEMPLATE,
  batch_generate_characters: BATCH_GENERATE_CHARACTERS_TEMPLATE,
  batch_generate_settings: BATCH_GENERATE_SETTINGS_TEMPLATE,
  expand_world_lore: EXPAND_WORLD_LORE_TEMPLATE,
  generate_plot: GENERATE_PLOT_TEMPLATE,
  rewrite_plot: REWRITE_PLOT_TEMPLATE,
  polish_draft: POLISH_DRAFT_TEMPLATE,
  chat_with_persona: CHAT_WITH_PERSONA_TEMPLATE,
  // New templates for writing.ts integration
  expand_scene: EXPAND_SCENE_TEMPLATE,
  rewrite_local: REWRITE_LOCAL_TEMPLATE,
  summarize_chapter: SUMMARIZE_CHAPTER_TEMPLATE,
  balance_suggestions: BALANCE_SUGGESTIONS_TEMPLATE,
  writing_base: WRITING_BASE_TEMPLATE,
  // New templates for world.ts integration
  analyze_state_changes: ANALYZE_STATE_CHANGES_TEMPLATE,
  extract_echoes: EXTRACT_ECHOES_TEMPLATE,
  consolidate_memory: CONSOLIDATE_MEMORY_TEMPLATE,
  deduce_world_consequences: DEDUCE_WORLD_CONSEQUENCES_TEMPLATE,
  generate_single_character: GENERATE_SINGLE_CHARACTER_TEMPLATE,
  // New template for shuraField.ts integration
  shura_field_conflict: SHURA_FIELD_CONFLICT_TEMPLATE,
  // New templates for audit.ts integration
  audit_plot: AUDIT_PLOT_TEMPLATE,
  audit_chapter_plan: AUDIT_CHAPTER_PLAN_TEMPLATE,
  extract_knowledge_triples: EXTRACT_KNOWLEDGE_TRIPLES_TEMPLATE,
  audit_chapter_content: AUDIT_CHAPTER_CONTENT_TEMPLATE,
  // New templates for plot.ts integration
  analyze_plot_rhythm: ANALYZE_PLOT_RHYTHM_TEMPLATE,
  split_plot_node_into_chapters: SPLIT_PLOT_NODE_INTO_CHAPTERS_TEMPLATE,
  regenerate_chapter_outline: REGENERATE_CHAPTER_OUTLINE_TEMPLATE,
  generate_twist_hooks: GENERATE_TWIST_HOOKS_TEMPLATE,
};

// ============================================================
// Helper Functions
// ============================================================

/**
 * Get a template by ID
 */
export function getTemplate(templateId: string): PromptTemplate | undefined {
  return DEFAULT_TEMPLATES[templateId];
}

/**
 * Get all template IDs
 */
export function getTemplateIds(): string[] {
  return Object.keys(DEFAULT_TEMPLATES);
}

/**
 * Get variables by tier for a template
 */
export function getVariablesByTier(
  templateId: string,
  tier: VariableTier
): TemplateVariable[] {
  const template = getTemplate(templateId);
  if (!template) return [];
  return template.variables.filter((v) => v.tier === tier);
}

/**
 * Get required variables for a template
 */
export function getRequiredVariables(templateId: string): TemplateVariable[] {
  const template = getTemplate(templateId);
  if (!template) return [];
  return template.variables.filter((v) => v.required);
}

/**
 * Validate that all required variables are provided
 */
export function validateTemplateVariables(
  templateId: string,
  providedVariables: Record<string, unknown>
): { valid: boolean; missing: string[] } {
  const requiredVars = getRequiredVariables(templateId);
  const missing = requiredVars
    .filter((v) => !(v.name in providedVariables) || providedVariables[v.name] === undefined)
    .map((v) => v.name);

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Get variable display names for UI
 */
export function getVariableDisplayNames(
  templateId: string
): Record<string, string> {
  const template = getTemplate(templateId);
  if (!template) return {};

  const result: Record<string, string> = {};
  template.variables.forEach((v) => {
    result[v.name] = v.display || v.name;
  });
  return result;
}

/**
 * Render user prompt from template blocks
 * @param templateId Template ID
 * @param variables Variables to render
 * @returns Rendered user prompt string
 */
export function renderUserPromptBlocks(
  templateId: string,
  variables: Record<string, any>
): string {
  const template = getTemplate(templateId);
  if (!template) {
    throw new Error(`Template not found: ${templateId}`);
  }

  // Sort blocks by order
  const sortedBlocks = [...template.userPromptBlocks].sort((a, b) => a.order - b.order);

  // Render each block
  const renderedBlocks: string[] = [];

  for (const block of sortedBlocks) {
    // Check condition if present
    if (block.condition) {
      try {
        // Simple condition evaluation
        const shouldRender = evaluateCondition(block.condition, variables);
        if (!shouldRender) continue;
      } catch (error) {
        console.warn(`Failed to evaluate condition for block ${block.id}:`, error);
        continue;
      }
    }

    // Render the block template
    let renderedBlock = block.template;

    // IMPORTANT: Process loops FIRST before variable replacement
    // to avoid replacing {{this.xxx}} variables prematurely

    // Process loops {{#each variable}}...{{/each}}
    // Support nested loops by processing from innermost to outermost
    const processLoops = (template: string, vars: Record<string, any>): string => {
      // First, process nested loops ({{#each this.items}} inside outer loops)
      let result = template;

      // Process inner loops ({{#each this.xxx}})
      result = result.replace(/\{\{#each\s+this\.(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g, (match, prop, content) => {
        // This will be handled by the outer loop processor
        // Just mark it for now
        return `__NESTED_LOOP_${prop}__${content}__END_NESTED_LOOP__`;
      });

      // Process outer loops ({{#each variable}})
      result = result.replace(/\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g, (match, varName, content) => {
        const items = vars[varName];
        if (!Array.isArray(items) || items.length === 0) {
          return '';
        }

        return items.map((item, index) => {
          let itemContent = content;

          // Handle nested loops
          itemContent = itemContent.replace(/__NESTED_LOOP_(\w+)__([\s\S]*?)__END_NESTED_LOOP__/g, (nestedMatch, prop, nestedContent) => {
            const nestedItems = item[prop];
            if (!Array.isArray(nestedItems) || nestedItems.length === 0) {
              return '';
            }

            return nestedItems.map((nestedItem, nestedIndex) => {
              let nestedItemContent = nestedContent;

              // Replace {{this}} for nested items
              if (typeof nestedItem === 'string' || typeof nestedItem === 'number') {
                nestedItemContent = nestedItemContent.replace(/\{\{this\}\}/g, String(nestedItem));
              } else if (typeof nestedItem === 'object' && nestedItem !== null) {
                // Process nested conditionals
                nestedItemContent = nestedItemContent.replace(/\{\{#if\s+this\.(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (condMatch, condProp, condContent) => {
                  const value = nestedItem[condProp];
                  return isTruthy(value) ? condContent : '';
                });

                // Replace nested object properties
                Object.keys(nestedItem).forEach(key => {
                  const thisPattern = new RegExp(`\\{\\{this\\.${key}\\}\\}`, 'g');
                  nestedItemContent = nestedItemContent.replace(thisPattern, String(nestedItem[key] ?? ''));
                });
              }

              // Replace {{@index}} with nested index
              nestedItemContent = nestedItemContent.replace(/\{\{@index\}\}/g, String(nestedIndex));

              return nestedItemContent;
            }).join('');
          });

          // Replace {{this}} with string representation
          if (typeof item === 'string' || typeof item === 'number') {
            itemContent = itemContent.replace(/\{\{this\}\}/g, String(item));
          } else if (typeof item === 'object' && item !== null) {
            // First, process nested conditionals within the loop
            itemContent = itemContent.replace(/\{\{#if\s+this\.(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (condMatch, prop, condContent) => {
              const value = item[prop];
              if (isTruthy(value)) {
                return condContent;
              }
              return '';
            });

            // Replace object properties - handle {{this.key}} pattern
            Object.keys(item).forEach(key => {
              const thisPattern = new RegExp(`\\{\\{this\\.${key}\\}\\}`, 'g');
              itemContent = itemContent.replace(thisPattern, String(item[key] ?? ''));
            });
          }

          // Replace {{@index}} with index
          itemContent = itemContent.replace(/\{\{@index\}\}/g, String(index));

          return itemContent;
        }).join('');
      });

      return result;
    };

    renderedBlock = processLoops(renderedBlock, variables);

    // Process conditionals {{#if variable}}...{{/if}}
    renderedBlock = renderedBlock.replace(/\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (match, varName, content) => {
      const value = variables[varName];
      if (isTruthy(value)) {
        return content;
      }
      return '';
    });

    // Replace simple variables {{variable}} - AFTER loops and conditionals
    renderedBlock = renderedBlock.replace(/\{\{([^#/][^}]*)\}\}/g, (match, varPath) => {
      const trimmedPath = varPath.trim();
      // Skip if it's a this.xxx pattern (should have been handled in loop)
      if (trimmedPath.startsWith('this.')) {
        return match; // Leave it as is (shouldn't happen if loops are processed correctly)
      }
      const value = getNestedValue(variables, trimmedPath);
      return value !== undefined && value !== null ? String(value) : '';
    });
    renderedBlock = renderedBlock.replace(/\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g, (match, varName, content) => {
      const items = variables[varName];
      if (!Array.isArray(items) || items.length === 0) {
        return '';
      }

      return items.map((item, index) => {
        let itemContent = content;

        // Replace {{this}} with string representation
        if (typeof item === 'string' || typeof item === 'number') {
          itemContent = itemContent.replace(/\{\{this\}\}/g, String(item));
        } else if (typeof item === 'object' && item !== null) {
          // First, process nested conditionals within the loop
          itemContent = itemContent.replace(/\{\{#if\s+this\.(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (condMatch, prop, condContent) => {
            const value = item[prop];
            if (isTruthy(value)) {
              return condContent;
            }
            return '';
          });

          // Replace object properties - handle {{this.key}} pattern
          Object.keys(item).forEach(key => {
            const thisPattern = new RegExp(`\\{\\{this\\.${key}\\}\\}`, 'g');
            itemContent = itemContent.replace(thisPattern, String(item[key] ?? ''));
          });
        }

        // Replace {{@index}} with index
        itemContent = itemContent.replace(/\{\{@index\}\}/g, String(index));

        return itemContent;
      }).join('');
    });

    // Only add non-empty blocks
    if (renderedBlock.trim()) {
      renderedBlocks.push(renderedBlock);
    }
  }

  return renderedBlocks.join('\n\n');
}

/**
 * Simple condition evaluator
 */
function evaluateCondition(condition: string, variables: Record<string, any>): boolean {
  // Handle simple comparisons
  const comparisonMatch = condition.match(/^(\w+)\s*(===|!==|==|!=|>=|<=|>|<)\s*(.+)$/);
  if (comparisonMatch) {
    const [, varName, operator, valueStr] = comparisonMatch;
    const varValue = variables[varName];
    let compareValue: any = valueStr.trim();

    // Parse value
    if (compareValue === 'null') compareValue = null;
    else if (compareValue === 'undefined') compareValue = undefined;
    else if (compareValue === 'true') compareValue = true;
    else if (compareValue === 'false') compareValue = false;
    else if (!isNaN(Number(compareValue))) compareValue = Number(compareValue);
    else if (compareValue.startsWith('"') && compareValue.endsWith('"')) {
      compareValue = compareValue.slice(1, -1);
    } else if (compareValue.startsWith("'") && compareValue.endsWith("'")) {
      compareValue = compareValue.slice(1, -1);
    }

    switch (operator) {
      case '===': return varValue === compareValue;
      case '!==': return varValue !== compareValue;
      case '==': return varValue == compareValue;
      case '!=': return varValue != compareValue;
      case '>': return varValue > compareValue;
      case '>=': return varValue >= compareValue;
      case '<': return varValue < compareValue;
      case '<=': return varValue <= compareValue;
    }
  }

  // Handle '&&' (and)
  if (condition.includes('&&')) {
    const parts = condition.split('&&').map(p => p.trim());
    return parts.every(part => evaluateCondition(part, variables));
  }

  // Handle '||' (or)
  if (condition.includes('||')) {
    const parts = condition.split('||').map(p => p.trim());
    return parts.some(part => evaluateCondition(part, variables));
  }

  // Handle simple truthy checks
  const value = getNestedValue(variables, condition.trim());
  return isTruthy(value);
}

/**
 * Get nested value from object
 */
function getNestedValue(obj: Record<string, any>, path: string): any {
  const parts = path.split('.');
  let value: any = obj;

  for (const part of parts) {
    if (value === undefined || value === null) return undefined;
    value = value[part];
  }

  return value;
}

/**
 * Check if value is truthy
 */
function isTruthy(value: any): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.length > 0;
  if (typeof value === 'number') return value !== 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value).length > 0;
  return Boolean(value);
}
