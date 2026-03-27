/**
 * Default Prompt Template Definitions
 *
 * This file defines the default templates for various AI generation tasks.
 * Templates are structured with variable definitions and importance tiers.
 */

// ============================================================
// Type Definitions
// ============================================================

/**
 * Variable importance tier
 * - critical: Core variables required for generation (missing will cause failure)
 * - important: Significant variables that greatly affect output quality
 * - optional: Nice-to-have variables for enhanced context
 */
export type VariableTier = 'critical' | 'important' | 'optional';

/**
 * Variable source - where the data comes from
 */
export type VariableSource =
  | 'user_input'      // Direct user input
  | 'project_state'   // From project store
  | 'computed'        // Computed from other data
  | 'derived'         // Derived from context analysis
  | 'optional';       // May or may not be available

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
 * Prompt block definition - a logical section of the prompt
 */
export interface PromptBlock {
  id: string;
  title: string;          // Block title shown in prompt
  template: string;       // Template string with {{variable}} placeholders
  condition?: string;     // JavaScript expression for conditional inclusion
  order: number;          // Display order
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
    },

    // Block 3: Tiered Memory Context
    {
      id: 'tiered_memory',
      title: 'Tiered Memory Context',
      order: 3,
      template: `{{tieredContext}}`,
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
    },

    // Block 9: Twist Hook
    {
      id: 'twist_hook',
      title: 'Plot Twist Instruction',
      order: 9,
      template: `[Plot Twist Instruction (Twist Hook)]
{{twistHook}}`,
      condition: 'twistHook != null && twistHook !== ""',
    },

    // Block 10: Plot Beat
    {
      id: 'plot_beat',
      title: 'Scene Plot Beat',
      order: 10,
      template: `[Scene Plot Beat]
{{plotBeat}}`,
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
    },

    // Block 2: Category Guidance
    {
      id: 'category_guidance',
      title: 'Category Guidance',
      order: 2,
      template: `[Category-Specific Guidance]
{{categoryGuidance}}`,
      condition: 'categoryGuidance != null && categoryGuidance !== ""',
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
    },

    // Block 2: Current Setting Content
    {
      id: 'current_content',
      title: 'Current Setting Content',
      order: 2,
      template: `[Current Setting Content]
{{currentContent}}`,
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
    },

    // Block 2: Character Information
    {
      id: 'character_info',
      title: 'Character Information',
      order: 2,
      template: `[Character Context]
{{contextStr}}`,
      condition: 'contextStr != null && contextStr !== ""',
    },

    // Block 3: World Settings
    {
      id: 'world_settings',
      title: 'World Settings',
      order: 3,
      template: `[Relevant World Settings]
{{relevantSettings}}`,
      condition: 'relevantSettings != null && relevantSettings !== ""',
    },

    // Block 4: Graph Context
    {
      id: 'graph_context',
      title: 'Knowledge Graph Context',
      order: 4,
      template: `[Knowledge Graph Context]
{{graphContext}}`,
      condition: 'graphContext != null && graphContext !== ""',
    },

    // Block 5: Lookup Table
    {
      id: 'lookup_table',
      title: 'Reference Information',
      order: 5,
      template: `[Reference Information]
{{lookupTable}}`,
      condition: 'lookupTable != null && lookupTable !== ""',
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
    },

    // Block 2: Character Context
    {
      id: 'character_context',
      title: 'Character Context',
      order: 2,
      template: `[Character Context]
{{contextStr}}`,
      condition: 'contextStr != null && contextStr !== ""',
    },

    // Block 3: Reference Information
    {
      id: 'lookup_table',
      title: 'Reference Information',
      order: 3,
      template: `[Reference Information]
{{lookupTable}}`,
      condition: 'lookupTable != null && lookupTable !== ""',
    },

    // Block 4: Current Plot
    {
      id: 'current_plot',
      title: 'Current Plot',
      order: 4,
      template: `[Current Plot Outline]
{{currentPlot}}`,
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
    },

    // Block 2: Conversation History
    {
      id: 'conversation_history',
      title: 'Conversation History',
      order: 2,
      template: `[Previous Conversation]
{{historyText}}`,
      condition: 'historyText != null && historyText !== ""',
    },

    // Block 3: Current Message
    {
      id: 'current_message',
      title: 'Current Message',
      order: 3,
      template: `[User's Message]
{{message}}

Respond as {{characterName}} would. Stay true to their personality, knowledge, and emotional state. Express their unique voice and perspective in your response.`,
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
