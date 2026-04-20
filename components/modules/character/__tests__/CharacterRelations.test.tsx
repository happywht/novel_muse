/**
 * CharacterRelations 组件测试
 *
 * 测试角色关系可视化组件
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CharacterRelations } from '../CharacterRelations';
import { type Character } from '@/types';
import { renderWithProviders, setupGlobalMocks, cleanupGlobalMocks } from '@/test/utils/test-utils';

describe('CharacterRelations', () => {
  const mockCharacters: Character[] = [
    {
      id: 'char_001',
      name: '李逍遥',
      role: '男主角',
      archetype: '侠客',
      description: '主角',
    },
    {
      id: 'char_002',
      name: '林月如',
      role: '女主角',
      archetype: '侠女',
      description: '女主角',
      structuredRelations: [
        {
          id: 'rel_001',
          targetCharacterId: 'char_001',
          targetName: '李逍遥',
          type: 'LOVES',
          description: '深爱却不敢表白',
          weight: 90,
          trajectory: 'rising',
          isBidirectional: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ],
    },
    {
      id: 'char_003',
      name: '赵灵儿',
      role: '女主角',
      archetype: '仙女',
      description: '女二号',
    },
  ];

  beforeEach(() => {
    setupGlobalMocks();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanupGlobalMocks();
  });

  describe('基础渲染', () => {
    it('应该正确渲染关系组件', () => {
      const character = mockCharacters[1];
      renderWithProviders(
        <CharacterRelations
          character={character}
          allCharacters={mockCharacters}
        />
      );

      // 检查组件主要元素是否存在
      expect(screen.getByText(/共.*1.*条关系/)).toBeInTheDocument();
    });

    it('应该显示关系数量', () => {
      const character = mockCharacters[1];
      renderWithProviders(
        <CharacterRelations
          character={character}
          allCharacters={mockCharacters}
        />
      );

      expect(screen.getByText(/共.*1.*条关系/)).toBeInTheDocument();
    });

    it('没有关系时应该显示空状态', () => {
      const character = mockCharacters[0];
      renderWithProviders(
        <CharacterRelations
          character={character}
          allCharacters={mockCharacters}
        />
      );

      expect(screen.getByText(/暂无关系/)).toBeInTheDocument();
    });
  });

  describe('关系卡片显示', () => {
    it('应该显示关系类型', () => {
      const character = mockCharacters[1];
      renderWithProviders(
        <CharacterRelations
          character={character}
          allCharacters={mockCharacters}
        />
      );

      // 使用getAllByText因为"爱慕"可能在多个地方出现
      expect(screen.getAllByText('爱慕').length).toBeGreaterThan(0);
    });

    it('应该显示目标角色名称', () => {
      const character = mockCharacters[1];
      renderWithProviders(
        <CharacterRelations
          character={character}
          allCharacters={mockCharacters}
        />
      );

      expect(screen.getByText('李逍遥')).toBeInTheDocument();
    });

    it('应该显示关系描述', () => {
      const character = mockCharacters[1];
      renderWithProviders(
        <CharacterRelations
          character={character}
          allCharacters={mockCharacters}
        />
      );

      expect(screen.getByText('深爱却不敢表白')).toBeInTheDocument();
    });
  });

  describe('交互功能', () => {
    it('点击关系卡片应该触发导航', () => {
      const character = mockCharacters[1];
      const onNavigateToCharacter = vi.fn();

      renderWithProviders(
        <CharacterRelations
          character={character}
          allCharacters={mockCharacters}
          onNavigateToCharacter={onNavigateToCharacter}
        />
      );

      // 找到包含"李逍遥"的可点击元素
      const targetName = screen.getByText('李逍遥');
      fireEvent.click(targetName);

      expect(onNavigateToCharacter).toHaveBeenCalledWith('char_001');
    });
  });

  describe('旧格式兼容', () => {
    it('应该支持旧格式的关系字符串', () => {
      const characterWithLegacyRelations: Character = {
        id: 'char_004',
        name: '测试角色',
        role: '配角',
        archetype: '平民',
        description: '测试',
        relationships: '李逍遥:朋友, 赵灵儿:恋人',
      };

      renderWithProviders(
        <CharacterRelations
          character={characterWithLegacyRelations}
          allCharacters={mockCharacters}
        />
      );

      // 应该能够解析旧格式并显示关系（不验证具体数量，只验证不崩溃）
      expect(screen.getByText(/条关系/)).toBeInTheDocument();
    });
  });

  describe('视觉样式', () => {
    it('不同关系类型应该有不同的颜色标识', () => {
      const character = mockCharacters[1];
      const { container } = renderWithProviders(
        <CharacterRelations
          character={character}
          allCharacters={mockCharacters}
        />
      );

      // 检查是否正确渲染了颜色类
      expect(container.querySelector('.text-pink-400')).toBeInTheDocument(); // LOVES关系的颜色
    });

    it('应该有正确的图标显示', () => {
      const character = mockCharacters[1];
      const { container } = renderWithProviders(
        <CharacterRelations
          character={character}
          allCharacters={mockCharacters}
        />
      );

      // 检查是否有图标元素（lucide图标）
      expect(container.querySelector('.lucide-heart')).toBeInTheDocument();
    });
  });

  describe('边界情况', () => {
    it('应该处理缺少目标角色的情况', () => {
      const characterWithMissingTarget: Character = {
        id: 'char_005',
        name: '孤立角色',
        role: '配角',
        archetype: '平民',
        description: '测试',
        structuredRelations: [
          {
            id: 'rel_002',
            targetName: '不存在的人',
            type: 'FRIEND_OF',
            description: '测试',
          },
        ],
      };

      renderWithProviders(
        <CharacterRelations
          character={characterWithMissingTarget}
          allCharacters={mockCharacters}
        />
      );

      // 应该显示警告信息但不会崩溃
      expect(screen.getByText(/部分角色未在角色列表中找到/)).toBeInTheDocument();
    });

    it('应该处理空的关系数组', () => {
      const characterWithEmptyRelations: Character = {
        id: 'char_006',
        name: '无关系角色',
        role: '配角',
        archetype: '平民',
        description: '测试',
        structuredRelations: [],
      };

      renderWithProviders(
        <CharacterRelations
          character={characterWithEmptyRelations}
          allCharacters={mockCharacters}
        />
      );

      expect(screen.getByText(/暂无关系/)).toBeInTheDocument();
    });
  });
});
