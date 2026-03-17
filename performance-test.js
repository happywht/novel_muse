// 性能测试工具 - 虚拟滚动优化验证
// 使用方法：在浏览器控制台运行

console.log('=== Muse性能测试工具 ===\n');

// 测试1: 角色列表性能
function testCharacterList() {
  console.log('测试1: CharacterCreator 角色列表性能');
  
  // 检查是否使用VirtualList
  const charList = document.querySelector('.CharacterCreator .VirtualList');
  if (charList) {
    console.log('✅ 已检测到VirtualList组件');
  } else {
    console.log('⚠️  未检测到VirtualList，使用降级模式');
  }
  
  // 测试搜索性能
  const searchInput = document.querySelector('input[placeholder="搜索角色..."]');
  if (searchInput) {
    console.time('搜索响应时间');
    searchInput.value = '测试';
    searchInput.dispatchEvent(new Event('input', { bubbles: true }));
    setTimeout(() => {
      console.timeEnd('搜索响应时间');
      console.log('目标：< 100ms\n');
    }, 100);
  }
}

// 测试2: 世界观设定性能
function testWorldBuilder() {
  console.log('测试2: WorldBuilder 设定条目性能');
  
  const worldList = document.querySelector('.WorldBuilder .VirtualList');
  if (worldList) {
    console.log('✅ 已检测到VirtualList组件');
  } else {
    console.log('⚠️  未检测到VirtualList，使用降级模式');
  }
  
  // 测试分类切换性能
  const categoryButtons = document.querySelectorAll('.WorldBuilder button[title="生成配置"]');
  if (categoryButtons.length > 0) {
    console.time('分类切换响应时间');
    categoryButtons[0].click();
    setTimeout(() => {
      console.timeEnd('分类切换响应时间');
      console.log('目标：< 150ms\n');
    }, 100);
  }
}

// 测试3: 剧情节点性能
function testPlotWeaver() {
  console.log('测试3: PlotWeaver 剧情节点性能');
  
  const plotList = document.querySelector('.PlotWeaver .VirtualList');
  if (plotList) {
    console.log('✅ 已检测到VirtualList组件');
  } else {
    console.log('⚠️  未检测到VirtualList，使用降级模式');
  }
  
  // 测试节点滚动性能
  console.log('📊 请手动滚动剧情节点列表，观察FPS');
  console.log('目标：> 45fps\n');
}

// 测试4: DOM节点数量对比
function testDOMNodeCount() {
  console.log('测试4: DOM节点数量统计');
  
  const charNodes = document.querySelectorAll('.CharacterCreator .VirtualList > div').length;
  const worldNodes = document.querySelectorAll('.WorldBuilder .VirtualList > div').length;
  const plotNodes = document.querySelectorAll('.PlotWeaver .VirtualList > div').length;
  
  console.log(`CharacterCreator渲染节点数: ${charNodes} (预期: ~10)`);
  console.log(`WorldBuilder渲染节点数: ${worldNodes} (预期: ~10)`);
  console.log(`PlotWeaver渲染节点数: ${plotNodes} (预期: ~10)`);
  
  if (charNodes <= 15 && worldNodes <= 15 && plotNodes <= 15) {
    console.log('✅ 虚拟滚动工作正常！\n');
  } else {
    console.log('⚠️  可能存在渲染问题，请检查\n');
  }
}

// 运行所有测试
setTimeout(() => {
  testCharacterList();
  setTimeout(testWorldBuilder, 500);
  setTimeout(testPlotWeaver, 1000);
  setTimeout(testDOMNodeCount, 1500);
}, 500);

console.log('🚀 测试将在0.5秒后开始...\n');
console.log('💡 提示：使用Chrome DevTools的FPS Meter观察滚动性能');
console.log('   打开方式：DevTools > Rendering > FPS Meter\n');
