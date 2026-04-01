/**
 * Audit Templates
 *
 * Templates for content auditing, knowledge extraction, and analysis operations.
 */

import {
  VariableTier,
  VariableSource,
  BlockMetadata,
  PromptBlock,
} from '../../types/promptTemplate';

import type { TemplateSection } from '../../types/promptTemplate';

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
// Audit Plot Template
// ============================================================

const AUDIT_PLOT_TEMPLATE: PromptTemplate = {
  id: 'audit_plot',
    name: 'Audit Plot',
    description: 'Deep plot auditing for logic, pacing, and consistency',
    category: 'analysis',
    systemInstruction: `You are a senior narrative analyst specializing in plot logic, pacing, and story structure. Your task is to:

1. Identify logical inconsistencies and plot holes
2. evaluate pacing and narrative flow
3. check character motivation consistency
4. assess world-building coherence
5. provide actionable improvement suggestions

Be thorough, critical, and constructive. Focus on issues that impact reader immersion and story credibility.`,
    userPromptBlocks: [
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
        {
            id: 'context',
            title: 'Character和 World Context',
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
        {
            id: 'current_plot',
            title: 'Current Plot outline',
            order: 3,
            template: `[Current plot outline]
{{currentPlot}}`,
            metadata: {
                tier: 'context',
                isStatic: false,
                dataSource: 'user_input',
                description: 'Current plot outline to be audited'
            }
        },
        {
            id: 'audit_instructions',
            title: 'Audit task',
            order: 4,
            template: `Please conduct a comprehensive audit of the above plot outline. Focus on:

1. **Logic consistency**: Are there plot holes, contradictions, or implausible events?
2. **Character motivation**: Do character actions align with their established personalities and goals?
3. **pacing analysis**: Is the narrative rhythm appropriate? Are there slow sections or rushed moments?
4. **World-building coherence**: does the plot respect established world rules and settings?
5. **Narrative structure**: Are plot beats properly connected with clear cause and effect?

Please output your analysis in Markdown format. Ensure the report includes a clear "Actionable suggestions List" at the end for automated fix procedures.`,
            metadata: {
                tier: 'constraint',
                isStatic: true,
                dataSource: 'static',
                description: '审核任务指令和JSON输出格式要求'
            }
        },
    ],
    variables: [
        {
            name: 'premise',
            type: 'string',
            tier: 'critical',
            source: 'user_input',
            required: true,
            description: 'The core premise/logline of the story',
            display: '故事前提',
        },
        {
            name: 'contextStr',
            type: 'string',
            tier: 'important',
            source: 'computed',
            required: false,
            description: 'Character and world context for plot audit',
            display: '上下文',
        },
        {
            name: 'currentPlot',
            type: 'string',
            tier: 'critical',
            source: 'user_input',
            required: true,
            description: 'The current plot outline to be audited',
            display: '当前剧情',
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
// Audit chapter plan template
// ============================================================

const AUDIT_CHAPTER_PLAN_TEMPLATE: PromptTemplate = {
    id: 'audit_chapter_plan',
    name: 'Audit chapter Plan',
    description: 'Audit chapter plans for alignment, drift, and logic contradictions',
    category: 'analysis',
    systemInstruction: `You are a senior chapter planner and narrative structure. Your task is to:

1. Check alignment of core objectives and plot nodes
2. Detect drift from character arc or main line
3. identify logic contradictions between chapters
4. verify character motivations are consistent
4 Output a JSON report with findings and suggestions.`,
    userPromptBlocks: [
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
                description: '故事核心前提用于审核上下文'
            }
        },
        {
            id: 'chapters',
            title: 'Chapter plans',
            order: 2,
            template: `[Current chapter plans]
{{#each chapters}}
- [Chapter {{@index}}]: {{this.title}}
Summary: {{this.summary}}
Beats:
{{#each this.beats}}
- [{{this.type}}] {{this.description}}
{{#each this.beats}}
{{/each}}
{{/each}}`,
            metadata: {
                tier: 'context',
                isStatic: false,
                dataSource: 'user_input',
                description: '待审核的章节计划列表'
            }
        },
        {
            id: 'audit_task',
            title: 'Audit task',
            order: 3,
            template: `Audit Tasks:
1. **Alignment Check (align)**: do the chapter plans fulfill all core objectives set by the plot node?
2. **Drift Detection (drift)**: are there chapters introducing irrelevant subplot unrelated to the main line, or deviating from character motivations set by the node?
3. **Logic Contradictions (contradiction)**: are there logical inconsistencies between chapters?

**Important output format**:
Please return a JSON object:
{
  "is_aligned": true/false,
  "issues": [
    {
      "type": "gap/drift/contradiction",
      "description": "issue description"
      "suggestion": "fix suggestion"
    }
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
            description: 'The target plot node to audit',
            display: '目标节点',
        },
        {
            name: 'chapters',
            type: 'object',
            tier: 'critical',
            source: 'user_input',
            required: true,
            description: 'Array of chapter plans to audit',
            display: '章节计划',
        },
        {
            name: 'premise',
            type: 'string',
            tier: 'important',
            source: 'user_input',
            required: false,
            description: 'The core premise/logline of the story',
            display: '故事前提',
        },
    ],
    metadata: {
        version: '1.0.0',
        author: 'Muse System',
        lastUpdated: '2026-03-28',
        tags: ['audit', 'chapter', 'plan', 'alignment', 'drift', 'logic'],
    },
};

// ============================================================
// Extract Knowledge triples template
// ============================================================
const EXTRACT_KNOWLED_TRIPLES_TEMPLATE: PromptTemplate = {
    id: 'extract_knowledge_triples',
    name: 'Extract Knowledge Triples',
    description: 'Extract knowledge triples (subject-predicate-object) from text for knowledge graph',
    category: 'analysis',
    systemInstruction: `You are a knowledge graph extraction specialist. Your task is to:

1. Extract (subject, predicate, object) triples from text
2. Build structured knowledge for the knowledge graph
3. Output triples in standard RDF format
    Output triples in the following format:
    {
      "subject": "The extracted text",
      "predicate": "is a predicate or the extracted text",
      "object": "is the object or concept in the extracted text"
    }`,
    userPromptBlocks: [
        {
            id: 'content',
            title: 'Content to extract',
            order: 1,
            template: `[Content to extract knowledge triples from]
{{content}}`,
            metadata: {
                tier: 'task',
                isStatic: false,
                dataSource: 'user_input',
                description: '待提取知识三元的内容文本'
            }
        },
        {
            id: 'format_requirements',
            title: 'Format requirements',
            order: 2,
            template: `[Extraction Requirements]
1. Focus on subject-predicate-object patterns
2. Extract entities, relationships, and attributes
3. Output in standard RDF format (subject predicate, object, object)
4. Entities should be URI-compatible (e.g., "ex:character:name", "character:Lin_Yuan")
5. Relationships should include specific types: "knows", "hates", "fears", "enemy_of", "respects"
        "trusts", "dislikes"

        "attributes": {
          "age": "number",
          "occupation": "string",
          "personality": ["curious", "brave", "cautious", "arrogant", "kind", "ruthless"],
          "goals": ["seek power", "find love", "revenge", "redemption", "protect family", "gain wealth"],
          "physical": {
            "height": "string",
            "build": "string",
            "hairColor": "string",
            "eyeColor": "string",
            "distinctiveFeatures": "string"
          },
          "location": {
            "current": "string",
            "home": "string",
            "work": "string"
          }
        }
        }
        Output format:
        Triple 1: <subject> <predicate> <object>
        Triple 2: <subject> <predicate> <object>
        ...
        ]`,
            metadata: {
                tier: 'format',
                isStatic: true,
                dataSource: 'static',
                description: 'RDF格式输出要求'
            }
        },
    ],
    variables: [
        {
            name: 'content',
            type: 'string',
            tier: 'critical',
            source: 'user_input',
            required: true,
            description: 'The content to extract knowledge triples from',
            display: '内容文本',
        },
    ],
    metadata: {
        version: '1.0.0',
        author: 'Muse System',
        lastUpdated: '2026-03-28',
        tags: ['knowledge', 'triple', 'extraction', 'graph', 'rdf'],
    },
};

// ============================================================
// Audit chapter content template
// ============================================================
const AUDIT_CHAPTER_CONTENT_TEMPLATE: PromptTemplate = {
    id: 'audit_chapter_content',
    name: 'Audit chapter content',
    description: 'Audit chapter content for quality, consistency and engagement',
    category: 'analysis',
    systemInstruction: `You are a senior editor and narrative analyst. Your task is to audit chapter content for:

1. Narrative quality and prose style, and consistency
2. Character consistency and behavior
3. Plot logic and causality
4. Reader engagement ( hook effectiveness, pacing)
5. Provide actionable feedback and specific examples

Be constructive, specific, and actionable.`,
    userPromptBlocks: [
        {
            id: 'chapter_content',
            title: 'Chapter content',
            order: 1,
            template: `[Chapter Content to Audit]
{{content}}`,
            metadata: {
                tier: 'task',
                isStatic: false,
                dataSource: 'user_input',
                description: '待审核的章节内容'
            }
        },
        {
            id: 'audit_focus',
            title: 'Audit focus',
            order: 2,
            template: `[Audit Focus Areas]
{{#if focusPacing}}- Pacing and rhythm
{{/if}}
{{#if focusCharacters}}- Character behavior and consistency
{{/if}}
{{#if focusPlot}}- Plot logic and causality
{{/if}}
{{#if focusEngagement}}- Reader engagement and hook effectiveness
{{/if}}
{{#if focusAll}}- All of the above
{{/if}}
Provide actionable feedback with specific examples.`,
            metadata: {
                tier: 'task',
                isStatic: false,
                dataSource: 'user_input',
                description: '审核重点领域'
            }
        },
        {
            id: 'context',
            title: 'Context',
            order: 3,
            template: `[Context for reference]
{{#if genre}}Genre: {{genre}}{{/if}}
{{#if styleGuide}}Style Guide: {{styleGuide}}{{/if}}
{{#if premise}}Premise: {{premise}}{{/if}}
{{#if characters}}Characters: {{characters}}{{/if}}`,
            metadata: {
                tier: 'context',
                isStatic: false,
                dataSource: 'derived',
                description: '审核上下文'
            }
        },
    ],
    variables: [
        {
            name: 'content',
            type: 'string',
            tier: 'critical',
            source: 'user_input',
            required: true,
            description: 'The chapter content to audit',
            display: '章节内容',
        },
        {
            name: 'focusPacing',
            type: 'boolean',
            tier: 'optional',
            source: 'user_input',
            required: false,
            description: 'Focus on pacing analysis',
            display: '关注节奏',
            defaultValue: true,
        },
        {
            name: 'focusCharacters',
            type: 'boolean',
            tier: 'optional',
            source: 'user_input',
            required: false,
            description: 'Focus on character consistency',
            display: '关注角色',
            defaultValue: true,
        },
        {
            name: 'focusPlot',
            type: 'boolean',
            tier: 'optional',
            source: 'user_input',
            required: false,
            description: 'Focus on plot logic',
            display: '关注剧情',
            defaultValue: true,
        },
        {
            name: 'focusEngagement',
            type: 'boolean',
            tier: 'optional',
            source: 'user_input',
            required: false,
            description: 'Focus on reader engagement',
            display: '关注参与度',
            defaultValue: true,
        },
        {
            name: 'focusAll',
            type: 'boolean',
            tier: 'optional',
            source: 'user_input',
            required: false,
            description: 'Comprehensive audit of all areas',
            display: '全面审核',
            defaultValue: false,
        },
        {
            name: 'genre',
            type: 'string',
            tier: 'optional',
            source: 'project_state',
            required: false,
            description: 'The novel genre for style reference',
            display: '小说类型',
        },
        {
            name: 'styleGuide',
            type: 'string',
            tier: 'optional',
            source: 'project_state',
            required: false,
            description: 'The novel style guide for tone reference',
            display: '风格指南',
        },
        {
            name: 'premise',
            type: 'string',
            tier: 'optional',
            source: 'project_state',
            required: false,
            description: 'The story premise for context',
            display: '故事前提',
        },
        {
            name: 'characters',
            type: 'string',
            tier: 'optional',
            source: 'project_state',
            required: false,
            description: 'Additional context for character consistency',
            display: '角色信息',
        },
    ],
    metadata: {
        version: '1.0.0',
        author: 'Muse System',
        lastUpdated: '2026-03-28',
        tags: ['audit', 'chapter', 'content', 'quality', 'analysis', 'editor'],
    },
};

// Export all audit templates
export const AUDIT_TEMPLATES = {
    audit_plot: AUDIT_PLOT_TEMPLATE,
    audit_chapter_plan: AUDIT_CHAPTER_PLAN_TEMPLATE,
    extract_knowledge_triples: EXTRACT_KNOWLED_TRIPLES_TEMPLATE,
    audit_chapter_content: AUDIT_CHAPTER_CONTENT_TEMPLATE,
};
