# CharacterRelations 组件 - 快速开始指南

## 5 分钟快速集成

### 步骤 1: 导入组件

```tsx
import { CharacterRelations } from './components/CharacterRelations';
```

### 步骤 2: 在角色详情中使用

```tsx
function CharacterDetail({ character, allCharacters }) {
  return (
    <div>
      <h2>{character.name}</h2>

      {/* 添加关系展示 */}
      <CharacterRelations
        character={character}
        allCharacters={allCharacters}
      />
    </div>
  );
}
```

### 步骤 3: 添加导航功能（可选）

```tsx
<CharacterRelations
  character={character}
  allCharacters={allCharacters}
  onNavigateToCharacter={(characterId) => {
    // 跳转到目标角色
    navigate(`/characters/${characterId}`);
  }}
/>
```

### 步骤 4: 添加编辑功能（可选）

```tsx
<CharacterRelations
  character={character}
  allCharacters={allCharacters}
  onEdit={() => {
    // 打开编辑对话框
    setIsEditingRelations(true);
  }}
/>
```

## 完整示例

```tsx
import React from 'react';
import { CharacterRelations } from './components/CharacterRelations';
import { useProjectStore } from './store/useProjectStore';

function CharacterProfile() {
  const { project } = useProjectStore();
  const [activeCharId, setActiveCharId] = React.useState(null);

  const activeChar = project.characters.find(c => c.id === activeCharId);

  if (!activeChar) {
    return <div>请选择一个角色</div>;
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">{activeChar.name}</h2>

      <CharacterRelations
        character={activeChar}
        allCharacters={project.characters}
        onNavigateToCharacter={setActiveCharId}
        onEdit={() => console.log('Edit relations')}
      />
    </div>
  );
}
```

## 测试组件

使用提供的测试数据快速测试：

```tsx
import {
  characterWithStructuredRelations,
  characterWithLegacyRelations,
  allTestCharacters
} from './components/CharacterRelations.test';

function TestComponent() {
  return (
    <div className="space-y-8">
      {/* 测试新格式 */}
      <div>
        <h3>新格式关系</h3>
        <CharacterRelations
          character={characterWithStructuredRelations}
          allCharacters={allTestCharacters}
        />
      </div>

      {/* 测试旧格式 */}
      <div>
        <h3>旧格式关系</h3>
        <CharacterRelations
          character={characterWithLegacyRelations}
          allCharacters={allTestCharacters}
        />
      </div>
    </div>
  );
}
```

## 常见问题

### Q: 组件如何处理旧格式数据？
A: 组件会自动检测并解析旧格式字符串，无需手动转换。

### Q: 如果目标角色不存在会怎样？
A: 组件会显示警告提示，但不会报错，关系仍然会展示。

### Q: 可以自定义颜色吗？
A: 可以，编辑组件中的 `RELATION_COLORS` 对象。

### Q: 支持哪些关系类型？
A: 支持 9 种预定义类型：敌对、盟友、爱慕、亲属、师徒、竞争、效忠、朋友、关联。

## 下一步

- 查看完整文档: `CharacterRelations.README.md`
- 查看集成示例: `CharacterRelations.integration.example.tsx`
- 查看测试数据: `CharacterRelations.test.tsx`
- 查看开发总结: `CharacterRelations.SUMMARY.md`

## 支持

如有问题，请检查：
1. TypeScript 类型是否正确
2. 所有必需的 props 是否提供
3. allCharacters 数组是否包含所有相关角色
4. lucide-react 是否正确安装
