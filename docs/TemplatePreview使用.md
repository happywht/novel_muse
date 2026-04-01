# TemplatePreview 使用指南

## 概述

`TemplatePreview` 组件用于实时预览合并后的模板效果,帮助用户了解模板的最终渲染结果。

## 弈性特性

1. **显示合并后的 system prompt**
2. **显示合并后的 user prompt blocks**
3. **高亮显示覆盖的区块**（紫色背景 + "已覆盖"标记）
4. **支持复制功能**（系统指令、 用户提示、 完整提示)
5. **显示变量列表和值**
6. **使用模板引擎渲染预览**（支持变量替换、条件、循环)
7. **折叠/展开功能**
8. **实时预览切换**（原始模板 vs 渲染结果）
9. **Token 估算**

## 基本用法

```tsx
import React, { useState, useMemo } from 'react';
import { TemplatePreview } from '@/components/PromptPanel/TemplatePreview';
import { mergeTemplateConfig } from '../services/templateMerge';
import { MergedTemplateResult } from '../types/templateOverride';

import { TemplateOverride, from '../types/templateOverride';

/**
 * 基本示例
 */
const BasicExample: React.FC = () => {
  const [variableValues, setVariableValues] = useState({
    genre: '玄幻',
    mainCharacter: '李逍遥',
    style: '轻松幽默',
  targetWordCount: 3000,
  });

  // 合并模板（模拟）
  const mergedResult = useMemo((): MergedTemplateResult => {
    const templateId = 'scene_generation';
    const projectOverride: TemplateOverride = {
      templateId,
      systemInstruction: '你是一个专业的小说写作助手，擅长生成生动、有深度的场景描写。',
      blocks: {
        genre_info: {
          blockId: 'genre_info',
          template: '[小说类型]: {{genre}}\n[风格基调]: {{style}}',
          order: 1,
        },
      },
      variableDefaults: {
        targetWordCount: 3000,
      },
    };
    const userPreference = null;
    return mergeTemplateConfig(templateId, projectOverride, userPreference);
  }, []);

  return (
    <div style={{ padding: '20px', backgroundColor: '#1a1a2e' }}>
      <h2 style={{ marginBottom: '10px 0, color: 'white' }}>
        基本示例
      </h2>

      <TemplatePreview
        mergedResult={mergedResult}
        variableValues={variableValues}
        defaultExpanded={true}
        showVariables={true}
        showSources={true}
        enableLivePreview={true}
      />

      {/* 变量编辑器 */}
      <div style={{ marginTop: '20px' }}>
        <h3 style={{ marginBottom: '10px 0, color: '#6b728' }}>
          变量值 (可实时修改)
        </h3>
        {Object.keys(variableValues).map(key => (
          <div key={key} style={{ marginBottom: '5px' }}>
            <label style={{ marginRight: '10px', color: '#9ca3af' }}>
              {key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1))}
            </label>
            <input
              type="text"
              value={String(variableValues[key])}
              onChange={(e) => setVariableValues({
                ...variableValues,
                [key]: e.target.value
              })}
              style={{
                padding: '8px',
                backgroundColor: '#2d3748',
                color: 'white',
                borderRadius: '4px',
                border: '1px solid #4a5568',
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default BasicExample;
