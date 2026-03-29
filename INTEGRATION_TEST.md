# PromptPanel 集成测试

# 用于验证 DraftingRoom 中的 PromptPanelWrapper 是否正确工作

# 运行方式: 在浏览器控制台中查看组件渲染和检查 store 更新

# 测试步骤:
# 1. 启动应用: npm run dev
# 2. 打开浏览器: http://localhost:5173
# 3. 进入 DraftingRoom (写作工坊)
# 4. 点击侧边栏的 "Prompt" 标签
# 5. 验证以下内容:
#    - Prompt 面板是否正确渲染
#    - 从 config/prompts.ts 获取了 drafting 相关的 prompts
#    - 点击展开某个 prompt,查看详情
#    - 编辑并保存 prompt 覆盖
#    - 重置 prompt 到默认值
#    - 切换 promptProfile (LITERARY/WEB_NOVEL) 查看不同的 prompts

# 鸶在控制台检查:
# - project.customPrompts 是否正确更新
# - 模式切换是否工作

# 预期行为:
# - 显示 3 个 drafting 相关的 prompts (scene_expansion, scene_generation, polish_engine)
# - 根据项目的 promptProfile 显示对应的 registry
# - 支持 PROJECT 和 MODULE 级覆盖 (目前主要实现了 PROJECT 级)
# - onSave 应该将覆盖保存到 project.customPrompts
# - onReset 应该删除覆盖,恢复默认值
# - 编辑界面应提供良好的 UX

# - 参数控制应显示参数配置选项

# 注意事项:
# - 模块级覆盖 (MODULE) 暂未完全实现,仅用于未来扩展
# - 如果需要模块级覆盖,需要扩展 project 结构添加 modulePrompts 字段
# - 参数值的持久化存储可能需要额外的实现
