/**
 * Character Templates
 *
 * Templates for character generation and management operations.
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
// Batch Generate Characters Template
// ============================================================

/**
 * Batch Generate Characters Template
 *
 * Used for generating multiple characters at once based on story premise and genre.
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
// Generate Single Character Template
// ============================================================

/**
 * Generate Single Character Template
 *
 * Used for generating a single detailed character with depth fields.
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
// Exports
// ============================================================

export const CHARACTER_TEMPLATES = {
  batch_generate_characters: BATCH_GENERATE_CHARACTERS_TEMPLATE,
  generate_single_character: GENERATE_SINGLE_CHARACTER_TEMPLATE,
  shura_field_conflict: SHURA_FIELD_CONFLICT_TEMPLATE,
};

export {
  BATCH_GENERATE_CHARACTERS_TEMPLATE,
  GENERATE_SINGLE_CHARACTER_TEMPLATE,
  SHURA_FIELD_CONFLICT_TEMPLATE,
};
