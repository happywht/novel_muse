/**
 * 测试冲突场景图谱化功能
 *
 * 测试步骤：
 * 1. 创建测试项目数据（包含冲突场景）
 * 2. 同步到图数据库
 * 3. 查询角色的冲突场景
 * 4. 查询高强度冲突
 */

import {
  syncProjectToGraph,
  getCharacterConflicts,
  getHighIntensityConflicts,
} from './src/services/graph';

async function testConflictScenario() {
  console.log('========================================');
  console.log('测试：冲突场景图谱化');
  console.log('========================================\n');

  // 1. 准备测试数据
  const testProjectData = {
    id: 'test-conflict-project-001',
    name: '测试项目-冲突场景',
    characters: [
      { id: 'char-1', name: '张三', role: '主角', description: '故事的主角' },
      { id: 'char-2', name: '李四', role: '反派', description: '故事的对手' },
      { id: 'char-3', name: '王五', role: '配角', description: '中立角色' },
    ],
    plotNodes: [
      {
        id: 'plot-1',
        title: '初次相遇',
        content: '张三和李四初次相遇',
        order: 1,
        beatTag: 'setup',
        relatedCharacters: ['char-1', 'char-2'],
        conflictScenario: {
          type: 'CONFRONTATION',
          participants: ['char-1', 'char-2'],
          stakes: '两人之间的第一次冲突，争夺关键资源',
          intensity: 6,
        },
      },
      {
        id: 'plot-2',
        title: '高潮对决',
        content: '最终决战',
        order: 2,
        beatTag: 'climax',
        relatedCharacters: ['char-1', 'char-2', 'char-3'],
        conflictScenario: {
          type: 'CLIMAX',
          participants: ['char-1', 'char-2'],
          stakes: '生死的较量，决定整个故事的走向',
          intensity: 10,
        },
      },
      {
        id: 'plot-3',
        title: '意外转折',
        content: '王五背叛',
        order: 3,
        beatTag: 'twist',
        relatedCharacters: ['char-1', 'char-3'],
        conflictScenario: {
          type: 'TWIST',
          participants: ['char-1', 'char-3'],
          stakes: '信任的崩塌，盟友变成敌人',
          intensity: 8,
        },
      },
    ],
    worldSettings: [],
    chapters: [],
    timeline: [],
    echoes: [],
  };

  console.log('1. 同步测试项目到图数据库...');
  try {
    await syncProjectToGraph(testProjectData);
    console.log('   ✓ 同步成功\n');
  } catch (err) {
    console.error('   ✗ 同步失败:', err);
    return;
  }

  // 2. 测试查询角色的冲突场景
  console.log('2. 查询张三（char-1）参与的所有冲突场景...');
  try {
    const char1Conflicts = await getCharacterConflicts('test-conflict-project-001', 'char-1');
    console.log(`   找到 ${char1Conflicts.length} 个冲突场景:`);
    char1Conflicts.forEach((conflict, idx) => {
      console.log(`   ${idx + 1}. ${conflict.plotNode.title}`);
      console.log(`      - 类型: ${conflict.conflictType}`);
      console.log(`      - 赌注: ${conflict.stakes}`);
      console.log(`      - 强度: ${conflict.intensity}`);
      console.log(
        `      - 其他参与者: ${conflict.otherParticipants.map((p: any) => p.name).join(', ')}`
      );
    });
    console.log('   ✓ 查询成功\n');
  } catch (err) {
    console.error('   ✗ 查询失败:', err);
  }

  // 3. 测试查询高强度冲突
  console.log('3. 查询所有高强度冲突（intensity >= 7）...');
  try {
    const highIntensityConflicts = await getHighIntensityConflicts('test-conflict-project-001');
    console.log(`   找到 ${highIntensityConflicts.length} 个高强度冲突:`);
    highIntensityConflicts.forEach((conflict, idx) => {
      console.log(`   ${idx + 1}. ${conflict.plotNode.title}`);
      console.log(`      - 类型: ${conflict.conflictType}`);
      console.log(`      - 赌注: ${conflict.stakes}`);
      console.log(`      - 强度: ${conflict.intensity}`);
      console.log(`      - 参与者: ${conflict.participants.map((p: any) => p.name).join(', ')}`);
    });
    console.log('   ✓ 查询成功\n');
  } catch (err) {
    console.error('   ✗ 查询失败:', err);
  }

  console.log('========================================');
  console.log('测试完成');
  console.log('========================================');
}

// 运行测试
testConflictScenario().catch(console.error);
