/**
 * ProjectTransformer 单元测试
 *
 * 测试项目DTO转换逻辑
 */

import { describe, it, expect } from 'vitest';
import { ProjectTransformer } from './ProjectTransformer';
import { ProjectDTO } from '@/types/api';
import { ProjectState } from '@/types';
import { INITIAL_PROJECT } from '@/store/initialState';

describe('ProjectTransformer', () => {
  const transformer = new ProjectTransformer();

  describe('DTO -> State 转换', () => {
    it('应该正确转换完整的项目DTO', () => {
      const mockDTO: ProjectDTO = {
        id: 'test-project-1',
        title: '测试项目',
        genre: '玄幻',
        premise: '这是一个测试项目',
        creativeSettings: {
          tone: '史诗',
          style: '热血',
          creativity: 0.8,
          targetAudience: '青年',
          promptProfile: 'WEB_NOVEL',
          styleTags: ['热血', '冒险'],
          referenceText: '',
        },
        worldGenConfig: {
          detailLevel: 'Standard',
          focus: 'Balanced',
        },
        characters: [],
        worldSettings: [],
        plotOutline: '',
        chapters: [],
        echoes: [],
        lastModified: Date.now(),
      };

      const state = transformer.transform(mockDTO);

      expect(state.id).toBe(mockDTO.id);
      expect(state.title).toBe(mockDTO.title);
      expect(state.genre).toBe(mockDTO.genre);
      expect(state.premise).toBe(mockDTO.premise);
      expect(state.creativeSettings).toEqual(mockDTO.creativeSettings);
      expect(state.worldGenConfig).toEqual(mockDTO.worldGenConfig);
    });

    it('应该为缺失字段提供默认值', () => {
      const incompleteDTO: Partial<ProjectDTO> = {
        id: 'test-project-2',
        title: '不完整项目',
      } as ProjectDTO;

      const state = transformer.transform(incompleteDTO);

      expect(state.id).toBe('test-project-2');
      expect(state.title).toBe('不完整项目');
      expect(state.characters).toEqual([]);
      expect(state.worldSettings).toEqual([]);
      expect(state.chapters).toEqual([]);
    });

    it('应该正确转换嵌套数据结构', () => {
      const mockDTO: ProjectDTO = {
        id: 'test-project-3',
        title: '嵌套测试',
        genre: '科幻',
        premise: '',
        creativeSettings: INITIAL_PROJECT.creativeSettings,
        worldGenConfig: INITIAL_PROJECT.worldGenConfig,
        characters: [
          {
            id: 'char-1',
            name: '主角',
            role: 'protagonist',
            personality: '勇敢',
            background: '背景',
          },
        ],
        worldSettings: [],
        plotOutline: '',
        chapters: [],
        echoes: [],
        lastModified: Date.now(),
      };

      const state = transformer.transform(mockDTO);

      expect(state.characters).toHaveLength(1);
      expect(state.characters[0].name).toBe('主角');
      expect(state.characters[0].role).toBe('protagonist');
    });
  });

  describe('State -> DTO 转换', () => {
    it('应该正确转换完整的项目State', () => {
      const mockState: ProjectState = {
        ...INITIAL_PROJECT,
        id: 'test-state-1',
        title: '状态转换测试',
        genre: '仙侠',
      };

      const dto = transformer.transformReverse(mockState);

      expect(dto.id).toBe(mockState.id);
      expect(dto.title).toBe(mockState.title);
      expect(dto.genre).toBe(mockState.genre);
    });

    it('应该包含所有必需字段', () => {
      const state: ProjectState = {
        ...INITIAL_PROJECT,
        id: 'required-fields-test',
      };

      const dto = transformer.transformReverse(state);

      expect(dto).toHaveProperty('id');
      expect(dto).toHaveProperty('title');
      expect(dto).toHaveProperty('creativeSettings');
      expect(dto).toHaveProperty('worldGenConfig');
    });
  });

  describe('双向转换', () => {
    it('DTO -> State -> DTO 应该保持数据完整性', () => {
      const originalDTO: ProjectDTO = {
        id: 'bidirectional-test',
        title: '双向转换测试',
        genre: '都市',
        premise: '测试前提',
        creativeSettings: INITIAL_PROJECT.creativeSettings,
        worldGenConfig: INITIAL_PROJECT.worldGenConfig,
        characters: [],
        worldSettings: [],
        plotOutline: '',
        chapters: [],
        echoes: [],
        lastModified: Date.now(),
      };

      const state = transformer.transform(originalDTO);
      const convertedDTO = transformer.transformReverse(state);

      expect(convertedDTO.id).toBe(originalDTO.id);
      expect(convertedDTO.title).toBe(originalDTO.title);
      expect(convertedDTO.genre).toBe(originalDTO.genre);
      expect(convertedDTO.premise).toBe(originalDTO.premise);
    });

    it('State -> DTO -> State 应该保持数据完整性', () => {
      const originalState: ProjectState = {
        ...INITIAL_PROJECT,
        id: 'reverse-bidirectional-test',
        title: '反向双向转换测试',
        genre: '奇幻',
      };

      const dto = transformer.transformReverse(originalState);
      const convertedState = transformer.transform(dto);

      expect(convertedState.id).toBe(originalState.id);
      expect(convertedState.title).toBe(originalState.title);
      expect(convertedState.genre).toBe(originalState.genre);
    });
  });

  describe('数组转换', () => {
    it('应该正确转换DTO数组', () => {
      const dtoArray: ProjectDTO[] = [
        {
          id: 'array-test-1',
          title: '数组测试1',
          genre: '玄幻',
          premise: '',
          creativeSettings: INITIAL_PROJECT.creativeSettings,
          worldGenConfig: INITIAL_PROJECT.worldGenConfig,
          characters: [],
          worldSettings: [],
          plotOutline: '',
          chapters: [],
          echoes: [],
          lastModified: Date.now(),
        },
        {
          id: 'array-test-2',
          title: '数组测试2',
          genre: '仙侠',
          premise: '',
          creativeSettings: INITIAL_PROJECT.creativeSettings,
          worldGenConfig: INITIAL_PROJECT.worldGenConfig,
          characters: [],
          worldSettings: [],
          plotOutline: '',
          chapters: [],
          echoes: [],
          lastModified: Date.now(),
        },
      ];

      const stateArray = transformer.transformArray(dtoArray);

      expect(stateArray).toHaveLength(2);
      expect(stateArray[0].title).toBe('数组测试1');
      expect(stateArray[1].title).toBe('数组测试2');
    });

    it('应该正确转换State数组', () => {
      const stateArray: ProjectState[] = [
        { ...INITIAL_PROJECT, id: 'reverse-array-1', title: '反向数组1' },
        { ...INITIAL_PROJECT, id: 'reverse-array-2', title: '反向数组2' },
      ];

      const dtoArray = transformer.transformReverseArray(stateArray);

      expect(dtoArray).toHaveLength(2);
      expect(dtoArray[0].title).toBe('反向数组1');
      expect(dtoArray[1].title).toBe('反向数组2');
    });

    it('应该处理空数组', () => {
      const emptyDTOArray: ProjectDTO[] = [];
      const emptyStateArray = transformer.transformArray(emptyDTOArray);

      expect(emptyStateArray).toEqual([]);

      const emptyStateArray2: ProjectState[] = [];
      const emptyDTOArray2 = transformer.transformReverseArray(emptyStateArray2);

      expect(emptyDTOArray2).toEqual([]);
    });
  });

  describe('边界条件', () => {
    it('应该处理null和undefined字段', () => {
      const dtoWithNulls: ProjectDTO = {
        id: 'null-test',
        title: 'Null测试',
        genre: null as any,
        premise: undefined as any,
        creativeSettings: INITIAL_PROJECT.creativeSettings,
        worldGenConfig: INITIAL_PROJECT.worldGenConfig,
        characters: [],
        worldSettings: [],
        plotOutline: '',
        chapters: [],
        echoes: [],
        lastModified: Date.now(),
      };

      const state = transformer.transform(dtoWithNulls);

      expect(state.id).toBe('null-test');
      expect(state.title).toBe('Null测试');
      expect(state.genre).toBe(''); // null被转为空字符串（设计行为）
    });

    it('应该处理大型数据集', () => {
      const largeDTO: ProjectDTO = {
        id: 'large-data-test',
        title: '大数据测试',
        genre: '玄幻',
        premise: '',
        creativeSettings: INITIAL_PROJECT.creativeSettings,
        worldGenConfig: INITIAL_PROJECT.worldGenConfig,
        characters: Array.from({ length: 100 }, (_, i) => ({
          id: `char-${i}`,
          name: `角色${i}`,
          role: 'npc',
          personality: '',
          background: '',
        })),
        worldSettings: [],
        plotOutline: '',
        chapters: [],
        echoes: [],
        lastModified: Date.now(),
      };

      const state = transformer.transform(largeDTO);

      expect(state.characters).toHaveLength(100);
      expect(state.characters[0].name).toBe('角色0');
      expect(state.characters[99].name).toBe('角色99');
    });
  });
});
