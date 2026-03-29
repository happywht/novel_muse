#!/usr/bin/env node

/**
 * 验证知识图谱数据完整性
 * 使用方法: node verify-graph-data.js <project-id>
 */

const API_BASE = 'http://localhost:3001/api';

async function verifyGraphData(projectId) {
  console.log(`🔍 验证项目 ${projectId} 的图谱数据...\n`);

  try {
    // 1. 获取全量图谱数据
    const response = await fetch(`${API_BASE}/graph/${projectId}`);
    const data = await response.json();

    console.log('📊 全量数据统计:');
    console.log(`   节点总数: ${data.nodes.length}`);
    console.log(`   关系总数: ${data.edges.length}`);
    console.log('');

    // 2. 按类型统计节点
    const nodeTypes = {};
    data.nodes.forEach((node) => {
      const type = node.type || 'Unknown';
      nodeTypes[type] = (nodeTypes[type] || 0) + 1;
    });

    console.log('📦 节点类型分布:');
    Object.entries(nodeTypes).forEach(([type, count]) => {
      console.log(`   ${type}: ${count} 个`);
    });
    console.log('');

    // 3. 按类型统计关系
    const edgeTypes = {};
    data.edges.forEach((edge) => {
      const type = edge.type || 'Unknown';
      edgeTypes[type] = (edgeTypes[type] || 0) + 1;
    });

    console.log('🔗 关系类型分布:');
    Object.entries(edgeTypes).forEach(([type, count]) => {
      console.log(`   ${type}: ${count} 条`);
    });
    console.log('');

    // 4. 检查数据完整性
    console.log('✅ 数据完整性检查:');

    // 检查孤立节点
    const connectedNodeIds = new Set();
    data.edges.forEach((edge) => {
      connectedNodeIds.add(edge.source);
      connectedNodeIds.add(edge.target);
    });

    const isolatedNodes = data.nodes.filter((node) => !connectedNodeIds.has(node.id));
    if (isolatedNodes.length > 0) {
      console.log(`   ⚠️  发现 ${isolatedNodes.length} 个孤立节点（无关系连接）`);
      isolatedNodes.slice(0, 5).forEach((node) => {
        console.log(`      - ${node.type}: ${node.label}`);
      });
    } else {
      console.log('   ✅ 无孤立节点');
    }

    // 5. 检查前端期望的节点类型
    const expectedTypes = ['Character', 'WorldSetting', 'Event', 'Echo', 'Chapter', 'PlotNode'];
    const missingTypes = expectedTypes.filter((type) => !nodeTypes[type]);

    if (missingTypes.length > 0) {
      console.log(`   ⚠️  缺失节点类型: ${missingTypes.join(', ')}`);
    } else {
      console.log('   ✅ 所有节点类型都存在');
    }

    console.log('');
    console.log('🎉 验证完成！');
  } catch (error) {
    console.error('❌ 验证失败:', error.message);
    process.exit(1);
  }
}

// 从命令行获取projectId
const projectId = process.argv[2];
if (!projectId) {
  console.log('使用方法: node verify-graph-data.js <project-id>');
  console.log('示例: node verify-graph-data.js proj-123456789');
  process.exit(1);
}

verifyGraphData(projectId);
