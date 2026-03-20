# CharacterRelations 组件使用文档

## 概述

`CharacterRelations` 是一个专门用于展示角色关系的可视化组件，支持新旧两种数据格式，提供丰富的交互功能和视觉反馈。

## 功能特性

### 1. 双格式支持
- **新格式优先**: 自动检测并优先使用 `structuredRelations` 数组
- **旧格式兼容**: 自动解析 `relationships` 字符串并转换展示
- **无缝切换**: 无需手动处理格式转换

### 2. 视觉设计
- **关系类型颜色编码**: 9种关系类型各有独特配色
  - 敌对 (ENEMY_OF) - 红色
  - 盟友 (ALLY_OF) - 绿色
  - 爱慕 (LOVES) - 粉色
  - 亲属 (KIN_OF) - 蓝色
  - 师徒 (MENTORS) - 紫色
  - 竞争 (RIVAL_OF) - 橙色
  - 效忠 (SERVES) - 灰色
  - 朋友 (FRIEND_OF) - 青色
  - 关联 (RELATED_TO) - 默认色

- **图标标识**: 每种关系类型配有专属图标
- **关系强度条**: 可视化显示关系权重 (0-100)
- **关系走向**: 显示关系趋势（上升/下降/稳定）

### 3. 交互功能
- **点击跳转**: 点击关系卡片跳转到目标角色
- **悬停提示**: 显示完整的关系描述
- **编辑入口**: 可选的编辑回调按钮

### 4. 空状态处理
- 优雅的空状态占位符
- 可选的"添加关系"按钮

## 使用示例

### 基础用法

```tsx
import { CharacterRelations } from './components/CharacterRelations';
import { Character } from './types';

function CharacterProfile({ character, allCharacters }: {
  character: Character;
  allCharacters: Character[];
}) {
  return (
    <div>
      <h2>{character.name}</h2>
      <CharacterRelations
        character={character}
        allCharacters={allCharacters}
      />
    </div>
  );
}
```

### 带导航功能

```tsx
import { useNavigate } from 'react-router-dom';
import { CharacterRelations } from './components/CharacterRelations';

function CharacterDetail({ character, allCharacters }) {
  const navigate = useNavigate();

  const handleNavigateToCharacter = (characterId: string) => {
    navigate(`/characters/${characterId}`);
  };

  const handleEditRelations = () => {
    // 打开编辑对话框或跳转到编辑页面
    openEditDialog();
  };

  return (
    <CharacterRelations
      character={character}
      allCharacters={allCharacters}
      onNavigateToCharacter={handleNavigateToCharacter}
      onEdit={handleEditRelations}
    />
  );
}
```

### 在 Zustand Store 中使用

```tsx
import { useProjectStore } from './store/useProjectStore';
import { CharacterRelations } from './components/CharacterRelations';

function CharacterView() {
  const { project, setActiveCharacterId } = useProjectStore();
  const activeCharacter = project.characters.find(c => c.id === activeCharId);

  if (!activeCharacter) return null;

  return (
    <CharacterRelations
      character={activeCharacter}
      allCharacters={project.characters}
      onNavigateToCharacter={setActiveCharacterId}
      onEdit={() => {
        // 触发编辑模式
        setIsEditingRelations(true);
      }}
    />
  );
}
```

## Props 说明

```typescript
interface CharacterRelationsProps {
  // 当前角色对象
  character: Character;

  // 所有角色列表（用于查找目标角色详情）
  allCharacters: Character[];

  // 可选：点击关系卡片时的回调
  // 参数为目标角色ID
  onNavigateToCharacter?: (characterId: string) => void;

  // 可选：点击编辑按钮时的回调
  onEdit?: () => void;
}
```

## 数据格式示例

### 新格式 (structuredRelations)

```typescript
const character: Character = {
  id: '1',
  name: '张三',
  role: '主角',
  archetype: '英雄',
  description: '故事的主人公',
  structuredRelations: [
    {
      id: 'rel_1',
      targetCharacterId: '2',
      targetName: '李四',
      type: 'FRIEND_OF',
      description: '青梅竹马',
      weight: 80,
      trajectory: 'rising',
      isBidirectional: true,
    },
    {
      id: 'rel_2',
      targetCharacterId: '3',
      targetName: '王五',
      type: 'ENEMY_OF',
      description: '商业竞争对手',
      weight: 60,
      trajectory: 'stable',
      isBidirectional: true,
    },
  ],
};
```

### 旧格式 (relationships)

```typescript
const character: Character = {
  id: '1',
  name: '张三',
  role: '主角',
  archetype: '英雄',
  description: '故事的主人公',
  relationships: '朋友: 李四；敌人: 王五；师父: 赵六',
};
```

## 样式定制

组件使用 Tailwind CSS，会自动适配项目的暗色主题。如需定制：

1. **修改颜色**: 编辑 `RELATION_COLORS` 对象
2. **更换图标**: 修改 `RELATION_ICONS` 映射
3. **调整布局**: 修改网格类名（如 `grid-cols-3`）

## 工具函数依赖

组件依赖以下工具函数（已从 `utils/characterRelations.ts` 导入）：

- `parseLegacyRelationships(str)` - 解析旧格式字符串
- `getRelationType(rel)` - 获取关系类型
- `getTargetName(rel)` - 获取目标名称
- `convertLegacyToStructured()` - 格式转换

## 注意事项

1. **性能优化**: 组件使用 `useMemo` 缓存计算结果，避免不必要的重渲染
2. **模糊匹配**: 查找目标角色时支持名称模糊匹配
3. **容错处理**: 即使目标角色不存在，也会优雅降级显示
4. **可访问性**: 提供了适当的 title 属性用于屏幕阅读器

## 未来扩展

- [ ] 支持关系图谱可视化（D3.js / react-force-graph）
- [ ] 添加关系时间线展示
- [ ] 支持批量编辑关系
- [ ] 导出关系数据为 JSON/CSV
