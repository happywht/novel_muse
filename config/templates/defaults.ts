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
// Export Default Templates
// ============================================================

/**
 * Default prompt templates registry
 */
export const DEFAULT_TEMPLATES: Record<string, PromptTemplate> = {
  scene_generation: SCENE_GENERATION_TEMPLATE,
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
