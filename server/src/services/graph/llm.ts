import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';

/**
 * 关系类型中文显示名称映射
 */
const RELATION_TYPE_LABELS: Record<string, string> = {
  ENEMY_OF: '敌人',
  ALLY_OF: '盟友',
  LOVES: '爱慕',
  KIN_OF: '亲属',
  MENTORS: '师徒',
  RIVAL_OF: '竞争',
  SERVES: '效忠',
  FRIEND_OF: '朋友',
  RELATED_TO: '关联',
};

/**
 * 从结构化关系生成展示字符串
 */
function getDisplayRelationships(structuredRelations: any[] | undefined): string {
  if (
    !structuredRelations ||
    !Array.isArray(structuredRelations) ||
    structuredRelations.length === 0
  ) {
    return '';
  }
  return structuredRelations
    .map((rel: any) => {
      const typeLabel = RELATION_TYPE_LABELS[rel.type] || rel.description || '关联';
      const targetName = rel.targetName || rel.targetCharacterName || rel.targetCharacterId;
      return `${typeLabel}: ${targetName}`;
    })
    .join('；');
}

/**
 * Knowledge Triple Schema (simplified for extraction)
 */
export const AiKnowledgeTripleSchema = z.object({
  subject: z.string(),
  relation: z.string(),
  object: z.string(),
  weight: z.number().optional().default(50),
  reason: z.string().optional(),
});

export const AiKnowledgeTripleArraySchema = z.array(AiKnowledgeTripleSchema);

type KnowledgeTriple = z.infer<typeof AiKnowledgeTripleSchema>;

/**
 * Backend LLM Service for Graph Operations
 */
export class GraphLLMService {
  private genAI: GoogleGenerativeAI;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('⚠️ GEMINI_API_KEY not found in server env. AI features disabled.');
    }
    this.genAI = new GoogleGenerativeAI(apiKey || '');
  }

  /**
   * Extract character relationships from a list of character descriptions
   */
  async extractCharacterRelationships(characters: any[]): Promise<KnowledgeTriple[]> {
    if (!process.env.GEMINI_API_KEY || characters.length < 2) return [];

    const charData = characters
      .map((c) => {
        // 优先使用结构化关系，向后兼容旧格式
        const displayRels = getDisplayRelationships(c.structuredRelations) || c.relationships || '';
        return `[${c.name} (${c.role})]: ${c.description || ''} ${displayRels}`;
      })
      .join('\n\n');

    const prompt = `
你是一位极其专业的小说平衡分析师。你的任务是分析以下角色的描述及其人际关系，并提取为结构化的【三元组】（Subject-Relation-Object）。

【角色列表】:
${charData}

【任务要求】:
1. 提取角色之间的确切关系（如：师徒、仇敌、暗恋、盟友、下属）。
2. 只提取角色列表内的角色之间的关系。
3. 如果关系是双向或相互的，请提取两条边。
4. 为每条关系分配一个“权重 (weight)”：1-100。50为默认，100为极致（如生死之交/血海深仇），10为点头之交。
5. 必须返回纯 JSON 数组，格式如下：
[
  {"subject": "角色A", "relation": "关系名", "object": "角色B", "weight": 80, "reason": "简短原因"}
]

请直接输出 JSON，不要任何 Markdown 包裹或引导语。只提取描述中明确提到的、或者能通过描述逻辑推断出的关系。
    `;

    try {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      let text = response.text().trim();

      // Sanitization: remove markdown code blocks if AI included them
      if (text.startsWith('```')) {
        text = text
          .replace(/^```json\n?/, '')
          .replace(/```$/, '')
          .trim();
      }

      const parsed = JSON.parse(text);
      return AiKnowledgeTripleArraySchema.parse(parsed);
    } catch (error) {
      console.error('Graph AI Extraction Error:', error);
      return [];
    }
  }
}

export const graphLlm = new GraphLLMService();
