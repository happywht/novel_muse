# 模板编辑器用户体验改进方案

> **优化目标**: 添加中文界面、提供功能说明、简化默认视图
> **优先级**: P2
> **状态**: 🚧 进行中

---

## 🎯 当前问题分析

### 1. 全英文界面 ❌
```
问题：
- 所有按钮、标签、说明都是英文
- 新用户难以理解功能
- 与项目其他部分的中文界面不一致

影响：
- 学习曲线陡峭
- 用户困惑
- 使用门槛高
```

### 2. 用途不明 ❓
```
问题：
- 没有功能说明
- 没有使用示例
- 用户不知道这个模块是做什么的

影响：
- 功能被忽略
- 用户不敢尝试
- 价值未体现
```

### 3. 高级功能复杂 ⚠️
```
问题：
- 界面复杂，术语多
- 默认显示所有高级选项
- 新手用户不知所措

影响：
- 认知负荷高
- 容易出错
- 用户体验差
```

---

## 💡 改进方案

### Phase 1: 添加中文界面支持 ⭐⭐⭐

#### 方案1: 中英文切换开关（推荐）

```tsx
// 在TemplateEditor组件顶部添加
const [language, setLanguage] = useState<'zh' | 'en'>('zh');

// 切换按钮
<div className="flex items-center gap-2 mb-4">
  <button
    onClick={() => setLanguage('zh')}
    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
      language === 'zh'
        ? 'bg-muse-500 text-white'
        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
    }`}
  >
    🇨🇳 中文
  </button>
  <button
    onClick={() => setLanguage('en')}
    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
      language === 'en'
        ? 'bg-muse-500 text-white'
        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
    }`}
  >
    🇺🇸 English
  </button>
</div>
```

#### 中文标签映射

```tsx
// 创建翻译映射对象
const translations = {
  zh: {
    // 顶部导航
    templateList: '模板列表',
    blockEditor: '区块编辑器',
    variableManager: '变量管理',
    templatePreview: '模板预览',
    
    // 操作按钮
    save: '保存',
    cancel: '取消',
    reset: '重置',
    export: '导出',
    import: '导入',
    
    // 功能说明
    templateId: '模板ID',
    description: '描述',
    category: '分类',
    systemTemplate: '系统模板',
    userTemplate: '用户模板',
    sections: '区块',
    variables: '变量',
    
    // 提示信息
    whatIsThis: '这是什么？',
    whatIsThisDesc: '模板编辑器用于自定义AI提示词，影响所有AI生成功能',
    getStarted: '快速开始',
    learnMore: '了解更多',
  },
  en: {
    templateList: 'Template List',
    blockEditor: 'Block Editor',
    variableManager: 'Variable Manager',
    templatePreview: 'Template Preview',
    
    save: 'Save',
    cancel: 'Cancel',
    reset: 'Reset',
    export: 'Export',
    import: 'Import',
    
    templateId: 'Template ID',
    description: 'Description',
    category: 'Category',
    systemTemplate: 'System Template',
    userTemplate: 'User Template',
    sections: 'Sections',
    variables: 'Variables',
    
    whatIsThis: 'What is this?',
    whatIsThisDesc: 'Template Editor allows you to customize AI prompts for all AI generation features',
    getStarted: 'Get Started',
    learnMore: 'Learn More',
  }
};

// 使用翻译
const t = translations[language];
```

### Phase 2: 添加功能说明 📚

#### 方案1: 添加"这是什么？"信息面板

```tsx
// 在TemplateEditor顶部添加信息面板
<div className="mb-6 bg-gradient-to-r from-muse-500/10 to-sky-500/10 border border-muse-500/30 rounded-2xl p-5">
  <div className="flex items-start gap-4">
    <div className="p-2 bg-muse-500/20 rounded-lg">
      <FileCode className="text-muse-400" size={24} />
    </div>
    <div className="flex-1">
      <h3 className="text-lg font-bold text-muse-200 mb-2 flex items-center gap-2">
        <Sparkles size={18} className="text-muse-400" />
        {t.whatIsThis || '什么是模板编辑器？'}
      </h3>
      <p className="text-sm text-slate-300 leading-relaxed mb-3">
        {t.whatIsThisDesc || '模板编辑器是AI提示词工程的管理后台。通过它，你可以：'}
      </p>
      <ul className="space-y-1.5 text-sm text-slate-400">
        <li className="flex items-start gap-2">
          <CheckCircle size={14} className="text-emerald-400 mt-0.5" />
          <span>自定义所有AI生成功能的提示词模板</span>
        </li>
        <li className="flex items-start gap-2">
          <CheckCircle size={14} className="text-emerald-400 mt-0.5" />
          <span>覆盖默认模板行为，调整AI输出风格</span>
        </li>
        <li className="flex items-start gap-2">
          <CheckCircle size={14} className="text-emerald-400 mt-0.5" />
          <span>管理模板变量和区块结构</span>
        </li>
        <li className="flex items-start gap-2">
          <CheckCircle size={14} className="text-emerald-400 mt-0.5" />
          <span>实时预览和测试模板效果</span>
        </li>
      </ul>
    </div>
    <button
      onClick={() => setShowInfoPanel(false)}
      className="text-slate-400 hover:text-slate-200 transition-colors"
    >
      <X size={20} />
    </button>
  </div>
</div>
```

#### 方案2: 添加Tooltip提示

```tsx
// 为关键功能添加Tooltip
import { Tooltip } from '@/components/ui/Tooltip';

<Tooltip content="模板ID是模板的唯一标识符，用于系统内部调用">
  <HelpCircle 
    size={14} 
    className="text-slate-400 hover:text-muse-400 cursor-help" 
  />
</Tooltip>
```

### Phase 3: 简化默认视图 🎯

#### 方案1: 新手/专家模式切换

```tsx
const [mode, setMode] = useState<'beginner' | 'expert'>('beginner');

// 模式切换按钮
<div className="flex items-center gap-2 mb-4 p-1 bg-slate-800/60 rounded-lg w-fit">
  <button
    onClick={() => setMode('beginner')}
    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
      mode === 'beginner'
        ? 'bg-muse-500 text-white'
        : 'text-slate-400 hover:text-slate-200'
    }`}
  >
    🌱 新手模式
  </button>
  <button
    onClick={() => setMode('expert')}
    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
      mode === 'expert'
        ? 'bg-muse-500 text-white'
        : 'text-slate-400 hover:text-slate-200'
    }`}
  >
    🚀 专家模式
  </button>
</div>
```

#### 新手模式 vs 专家模式

```tsx
// 新手模式：简化视图
{mode === 'beginner' && (
  <>
    {/* 只显示最常用的功能 */}
    <SimpleTemplateList />
    <QuickOverridePanel />
    <BasicPreview />
  </>
)}

// 专家模式：完整视图
{mode === 'expert' && (
  <>
    {/* 显示所有功能 */}
    <FullTemplateList />
    <AdvancedBlockEditor />
    <CompleteVariableManager />
    <DetailedPreview />
  </>
)}
```

### Phase 4: 添加使用示例和文档 📖

#### 方案1: 内置教程

```tsx
// 添加"快速开始"引导
const [showTutorial, setShowTutorial] = useState(false);

{showTutorial && (
  <TutorialModal onClose={() => setShowTutorial(false)}>
    <TutorialStep 
      title="第一步：选择模板"
      description="从左侧列表中选择一个模板，查看其详情"
    />
    <TutorialStep 
      title="第二步：编辑区块"
      description="点击'区块编辑器'标签，自定义模板的各个区块"
    />
    <TutorialStep 
      title="第三步：管理变量"
      description="在'变量管理'中添加、删除或修改变量"
    />
    <TutorialStep 
      title="第四步：预览和保存"
      description="在'模板预览'中查看效果，确认后点击保存"
    />
  </TutorialModal>
)}
```

#### 方案2: 示例模板库

```tsx
// 提供预设的示例模板
const exampleTemplates = [
  {
    id: 'example-character-profile',
    name: '示例：角色档案模板',
    description: '一个完整的角色档案生成模板示例',
    category: 'character',
    sections: [...],
    variables: [...]
  },
  {
    id: 'example-plot-outline',
    name: '示例：情节大纲模板',
    description: '一个情节大纲生成模板示例',
    category: 'plot',
    sections: [...],
    variables: [...]
  }
];
```

---

## 📋 实施计划

### Phase 1: 添加中文界面（1.5小时）
- [x] 创建翻译映射对象
- [x] 添加中英文切换开关
- [x] 替换所有英文文本
- [x] 测试切换功能

### Phase 2: 添加功能说明（1小时）
- [x] 创建信息面板组件
- [x] 编写功能说明文案
- [x] 添加Tooltip组件
- [x] 测试提示显示

### Phase 3: 简化默认视图（1.5小时）
- [x] 添加新手/专家模式切换
- [x] 创建简化版组件
- [x] 实现模式切换逻辑
- [x] 测试两种模式

### Phase 4: 添加使用示例（1小时）
- [x] 创建教程模态框
- [x] 编写教程步骤
- [x] 创建示例模板库
- [x] 添加示例导入功能

---

## 🎯 预期效果

### 改进前 vs 改进后

```
改进前：
❌ 全英文界面，难以理解
❌ 没有功能说明，不知道做什么
❌ 高级功能复杂，不敢尝试
❌ 学习曲线陡峭

改进后：
✅ 中文界面（默认），易于理解
✅ 清晰的功能说明和引导
✅ 新手模式简化操作
✅ 快速上手指南
✅ 平滑的学习曲线
```

---

**预计总时间**: 5小时
**优先级**: P2
**状态**: 🚧 进行中
