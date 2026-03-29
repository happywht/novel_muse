/**
 * Character-related AI functions
 *
 * Functions for generating and managing character data
 */

import { Character, Echo, WorldSetting, CreativeSettings } from '../../types';
import { executeModelTask, getModelName, getInstructionWithSettings } from './core';

/**
 * Generate a single character based on description
 */
export async function generateSingleCharacter(
  description: string,
  genre: string,
  role: string = 'SUPPORTING',
  settings?: CreativeSettings
): Promise<Partial<Character>> {
  const instruction = getInstructionWithSettings('character_generation', settings);

  const prompt = `请根据以下描述创建一个角色：

描述: ${description}
小说类型: ${genre}
角色类型: ${role}

请输出 JSON 格式，包含以下字段:
{
  "name": "角色名称",
  "role": "角色类型 (PROTAGONIST/ANTAGONIST/SUPPORTING/MINOR)",
  "description": "角色详细描述",
  "alignment": "阵营 (GOOD/EVIL/NEUTRAL/COMPLEX)",
  "desire": "角色的核心欲望",
  "fear": "角色的恐惧",
  "weakness": "角色的弱点",
  "background": "角色背景故事"
}`;

  try {
    const responseText = await executeModelTask(
      'generateSingleCharacter',
      instruction,
      prompt,
      await getModelName('flash'),
      0.7,
      undefined,
      undefined,
      { templateId: 'character_generation', templateData: { description, genre, role } }
    );

    // Parse JSON response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    throw new Error('Failed to parse character JSON');
  } catch (e) {
    console.error('[generateSingleCharacter] Failed:', e);
    throw e;
  }
}

/**
 * Generate character image (placeholder - returns empty string)
 * Note: Image generation requires additional API integration
 */
export async function generateCharacterImage(prompt: string): Promise<string> {
  console.log('[generateCharacterImage] Image generation requested with prompt:', prompt);

  // Return empty string - image generation needs to be implemented with
  // a suitable image generation API (e.g., DALL-E, Stable Diffusion, etc.)
  return '';
}

/**
 * Chat with a persona (character chat simulation)
 */
export async function chatWithPersona(
  character: Character,
  message: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [],
  settings?: CreativeSettings
): Promise<string> {
  const instruction = `你是 ${character.name}，一个小说中的角色。

角色信息:
- 名称: ${character.name}
- 类型: ${character.role}
- 描述: ${character.description}
- 阵营: ${character.alignment || '未知'}
- 核心欲望: ${character.desire || '未知'}
- 恐惧: ${character.fear || '未知'}
- 弱点: ${character.weakness || '未知'}

请以这个角色的身份和语气与用户对话。保持角色一致性。`;

  // Build conversation context
  const contextMessages = conversationHistory
    .map((m) => `${m.role === 'user' ? '用户' : character.name}: ${m.content}`)
    .join('\n');

  const prompt = `${contextMessages ? `对话历史:\n${contextMessages}\n\n` : ''}用户: ${message}\n\n请以 ${character.name} 的身份回复:`;

  try {
    const responseText = await executeModelTask(
      'chatWithPersona',
      instruction,
      prompt,
      await getModelName('flash'),
      0.8,
      undefined,
      undefined,
      { templateId: 'chat_with_persona', templateData: { characterName: character.name, message } }
    );

    return responseText.trim();
  } catch (e) {
    console.error('[chatWithPersona] Failed:', e);
    throw e;
  }
}

/**
 * Batch generate multiple characters
 */
export async function batchGenerateCharacters(
  prompts: Array<{ description: string; role: string }>,
  genre: string,
  settings?: CreativeSettings
): Promise<Partial<Character>[]> {
  const results: Partial<Character>[] = [];

  for (const prompt of prompts) {
    try {
      const character = await generateSingleCharacter(
        prompt.description,
        genre,
        prompt.role,
        settings
      );
      results.push(character);
    } catch (e) {
      console.error('[batchGenerateCharacters] Failed to generate character:', e);
      results.push({});
    }
  }

  return results;
}

/**
 * Batch generate world settings by category
 */
export async function batchGenerateWorldSettingsByCategory(
  categories: string[],
  genre: string,
  existingSettings: WorldSetting[],
  settings?: CreativeSettings
): Promise<Partial<WorldSetting>[]> {
  const instruction = getInstructionWithSettings('world_setting_generation', settings);

  const results: Partial<WorldSetting>[] = [];

  for (const category of categories) {
    const prompt = `请为以下小说类型和类别创建世界观设定:

小说类型: ${genre}
设定类别: ${category}

已有设定（避免重复）:
${existingSettings.map((s) => `- ${s.title}: ${s.content.slice(0, 100)}...`).join('\n')}

请输出 JSON 数组格式，包含 2-3 个该类别的设定:
[
  {
    "title": "设定标题",
    "content": "设定详细内容",
    "category": "${category}"
  }
]`;

    try {
      const responseText = await executeModelTask(
        'batchGenerateWorldSettingsByCategory',
        instruction,
        prompt,
        await getModelName('flash'),
        0.7,
        undefined,
        undefined,
        { templateId: 'world_setting_generation', templateData: { category, genre } }
      );

      // Parse JSON response
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const items = JSON.parse(jsonMatch[0]);
        results.push(...items);
      }
    } catch (e) {
      console.error('[batchGenerateWorldSettingsByCategory] Failed for category:', category, e);
    }
  }

  return results;
}

/**
 * Analyze state changes from text
 */
export async function analyzeStateChanges(
  text: string,
  characters: Character[],
  worldSettings: WorldSetting[],
  settings?: CreativeSettings
): Promise<Echo[]> {
  const instruction = getInstructionWithSettings('state_change_analysis', settings);

  const charList = characters.map((c) => `- ${c.name} (${c.role})`).join('\n');
  const worldList = worldSettings.map((w) => `- ${w.title}`).join('\n');

  const prompt = `请分析以下文本中的状态变化（事件、关系变化、环境变化等）:

文本:
${text}

已知角色:
${charList}

已知世界设定:
${worldList}

请输出 JSON 数组格式:
[
  {
    "targetName": "受影响的实体名称",
    "targetType": "CHARACTER 或 WORLD",
    "description": "变化描述",
    "reason": "变化原因",
    "triples": [
      {
        "subject": "主体",
        "relation": "关系",
        "object": "客体"
      }
    ]
  }
]`;

  try {
    const responseText = await executeModelTask(
      'analyzeStateChanges',
      instruction,
      prompt,
      await getModelName('flash'),
      0.5,
      undefined,
      undefined,
      { templateId: 'state_change_analysis', templateData: { text } }
    );

    // Parse JSON response
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const items = JSON.parse(jsonMatch[0]);
      return items.map((item: any) => ({
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        targetId: '',
        targetName: item.targetName || '',
        type: item.targetType || 'CHARACTER',
        description: item.description || '',
        reason: item.reason || '',
        status: 'PENDING' as const,
        timestamp: Date.now(),
        triples: item.triples || [],
      }));
    }

    return [];
  } catch (e) {
    console.error('[analyzeStateChanges] Failed:', e);
    return [];
  }
}

/**
 * Expand world lore based on existing settings
 */
export async function expandWorldLore(
  topic: string,
  genre: string,
  existingSettings: WorldSetting[],
  settings?: CreativeSettings
): Promise<string> {
  const instruction = getInstructionWithSettings('world_lore_expansion', settings);

  const existingContext = existingSettings
    .map((s) => `## ${s.title}\n${s.content}`)
    .join('\n\n');

  const prompt = `请根据以下现有世界观设定，扩展关于"${topic}"的详细内容:

小说类型: ${genre}

现有设定:
${existingContext}

请输出详细的扩展内容，保持与现有设定的一致性。`;

  try {
    const responseText = await executeModelTask(
      'expandWorldLore',
      instruction,
      prompt,
      await getModelName('pro'),
      0.7,
      undefined,
      undefined,
      { templateId: 'world_lore_expansion', templateData: { topic, genre } }
    );

    return responseText.trim();
  } catch (e) {
    console.error('[expandWorldLore] Failed:', e);
    throw e;
  }
}
