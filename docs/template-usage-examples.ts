/**
 * 模板功能使用示例
 * 展示如何使用升级后的 aiCallInterceptor 支持模板数据
 */

import { interceptAICall, AICallContext } from '../services/aiCallInterceptor';

// ============================================================
// 示例 1: 传统方式（向后兼容）
// ============================================================

async function example1_traditionalUsage() {
  // 现有代码无需修改，继续工作
  const context: AICallContext = {
    taskType: 'scene_generation',
    systemInstruction: 'You are a creative writer...',
    userPrompt: 'Generate a scene about...',
    model: 'gemini-3-flash-preview',
    temperature: 0.9,
  };

  const result = await interceptAICall(context);
  // result.approved - 用户是否批准
  // result.modifiedUserPrompt - 用户可能修改的提示词
}

// ============================================================
// 示例 2: 使用模板数据（新功能）
// ============================================================

async function example2_templateUsage() {
  // 定义模板变量
  const templateData = {
    genre: '科幻',
    sceneGoal: '建立主角与反派的对立关系',
    mainCharacter: {
      name: '李明',
      personality: '冷静、理性',
      currentEmotion: '紧张但坚定',
    },
    setting: {
      location: '废弃的太空站控制室',
      time: '深夜',
      atmosphere: '紧张、压抑',
    },
    recentEvents: ['主角发现反派的真实身份', '主角潜入太空站', '主角发现关键证据'],
    hasForeshadowing: true,
    foreshadowing: '主角的武器卡壳了',
  };

  const context: AICallContext = {
    taskType: 'scene_generation',
    templateId: 'scene_generation', // 使用模板ID
    templateData: templateData, // 结构化变量数据

    // 模板字符串（会被 templateEngine 渲染）
    systemInstruction: `You are a master novelist specializing in {{genre}} fiction...`,

    userPrompt: `
【情节目标】
{{sceneGoal}}

【主角状态】
姓名：{{mainCharacter.name}}
性格：{{mainCharacter.personality}}
当前情绪：{{mainCharacter.currentEmotion}}

【场景设定】
地点：{{setting.location}}
时间：{{setting.time}}
氛围：{{setting.atmosphere}}

【近期事件】
{{#each recentEvents}}
- {{this}}
{{/each}}

{{#if hasForeshadowing}}
【伏笔提示】
{{foreshadowing}}
{{/if}}
    `.trim(),

    model: 'gemini-3-flash-preview',
    temperature: 0.9,

    // 模板元信息（用于UI展示）
    templateMeta: {
      label: '场景生成模板',
      description: '基于配料的完整场景生成',
      variables: [
        {
          name: 'genre',
          value: templateData.genre,
          tier: 'critical',
          tokenCount: 2,
        },
        {
          name: 'sceneGoal',
          value: templateData.sceneGoal,
          tier: 'critical',
          tokenCount: 15,
        },
        {
          name: 'mainCharacter',
          value: templateData.mainCharacter,
          tier: 'important',
          tokenCount: 25,
        },
        {
          name: 'setting',
          value: templateData.setting,
          tier: 'important',
          tokenCount: 20,
        },
        {
          name: 'recentEvents',
          value: templateData.recentEvents,
          tier: 'optional',
          tokenCount: 50,
        },
        {
          name: 'hasForeshadowing',
          value: templateData.hasForeshadowing,
          tier: 'optional',
          tokenCount: 1,
        },
      ],
    },
  };

  const result = await interceptAICall(context);

  if (result.approved) {
    // 用户批准，可以继续执行AI调用
    // 渲染后的提示词已经应用到了 context.systemInstruction 和 context.userPrompt
    console.log('用户批准，可以继续执行AI调用');
  } else {
    // 用户取消
    console.log('用户取消AI调用');
  }
}

// ============================================================
// 示例 3: 从模板注册表获取模板（假设存在）
// ============================================================

async function example3_fromTemplateRegistry() {
  // 假设有一个模板注册表
  // const template = await TemplateRegistry.get('scene_generation');

  const templateData = {
    genre: '奇幻',
    sceneGoal: '展示主角的成长',
    // ... 其他变量
  };

  const context: AICallContext = {
    taskType: 'scene_generation',
    templateId: 'scene_generation',
    templateData: templateData,

    // 从模板获取（示例）
    systemInstruction: 'You are a master novelist...', // template.systemInstruction
    userPrompt: 'Generate a scene...', // template.userPromptBlocks.map(b => b.template).join('\n\n')

    model: 'gemini-3-flash-preview',
    temperature: 0.9,

    // 从模板构建元信息
    // templateMeta: {
    //   label: template.name,
    //   description: template.description,
    //   variables: template.variables.map(v => ({
    //     name: v.name,
    //     value: templateData[v.name],
    //     tier: v.tier,
    //     tokenCount: estimateTokens(String(templateData[v.name]))
    //   }))
    // }
  };

  await interceptAICall(context);
}

// ============================================================
// 示例 4: 动态构建模板数据
// ============================================================

async function example4_dynamicTemplateData() {
  // 从项目状态动态构建模板数据
  const projectStore = {
    genre: '科幻',
    mainCharacter: {
      name: '李明',
      personality: '冷静、理性',
    },
    currentScene: {
      goal: '揭示真相',
      location: '太空站',
    },
  };

  // 计算派生数据
  const recentEvents = await fetchRecentEvents();
  const foreshadowing = await findActiveForeshadowing();

  const templateData = {
    // 基础数据
    genre: projectStore.genre,
    sceneGoal: projectStore.currentScene.goal,

    // 嵌套对象
    mainCharacter: projectStore.mainCharacter,
    setting: {
      location: projectStore.currentScene.location,
      time: '深夜',
      atmosphere: '紧张',
    },

    // 数组数据
    recentEvents: recentEvents,

    // 条件数据
    hasForeshadowing: foreshadowing.length > 0,
    foreshadowing: foreshadowing[0]?.description,
  };

  const context: AICallContext = {
    taskType: 'scene_generation',
    templateId: 'scene_generation',
    templateData,
    systemInstruction: '...', // 模板字符串
    userPrompt: '...', // 模板字符串
    model: 'gemini-3-flash-preview',
    temperature: 0.9,
  };

  await interceptAICall(context);
}

// 辅助函数示例
async function fetchRecentEvents(): Promise<string[]> {
  // 从数据库或状态管理中获取最近事件
  return ['事件1', '事件2', '事件3'];
}

async function findActiveForeshadowing(): Promise<Array<{ description: string }>> {
  // 查找活跃的伏笔
  return [{ description: '主角的武器卡壳了' }];
}

// ============================================================
// 类型安全示例
// ============================================================

interface SceneGenerationData {
  genre: string;
  sceneGoal: string;
  mainCharacter: {
    name: string;
    personality: string;
    currentEmotion: string;
  };
  setting: {
    location: string;
    time: string;
    atmosphere: string;
  };
  recentEvents: string[];
  hasForeshadowing: boolean;
  foreshadowing?: string;
}

async function example5_typeSafe() {
  const templateData: SceneGenerationData = {
    genre: '科幻',
    sceneGoal: '建立主角与反派的对立关系',
    mainCharacter: {
      name: '李明',
      personality: '冷静、理性',
      currentEmotion: '紧张但坚定',
    },
    setting: {
      location: '废弃的太空站控制室',
      time: '深夜',
      atmosphere: '紧张、压抑',
    },
    recentEvents: ['主角发现反派的真实身份', '主角潜入太空站'],
    hasForeshadowing: true,
    foreshadowing: '主角的武器卡壳了',
  };

  const context: AICallContext = {
    taskType: 'scene_generation',
    templateId: 'scene_generation',
    templateData,
    systemInstruction: '...',
    userPrompt: '...',
    model: 'gemini-3-flash-preview',
    temperature: 0.9,
  };

  await interceptAICall(context);
}

export {
  example1_traditionalUsage,
  example2_templateUsage,
  example3_fromTemplateRegistry,
  example4_dynamicTemplateData,
  example5_typeSafe,
};
