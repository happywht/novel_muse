import {
  getCharacterNameToIdMap,
  getLocationNameToIdMap,
  mapCharacterNamesToUuids,
  mapLocationNamesToUuids,
  convertPlotNodeNamesToUuids,
  NameMappingResult
} from '../../services/graph/mappers';
import { PrismaClient } from '@prisma/client';

// Mock Prisma Client
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    character: {
      findMany: jest.fn(),
      count: jest.fn()
    },
    worldSetting: {
      findMany: jest.fn(),
      count: jest.fn()
    }
  }))
}));

describe('Graph Mappers - Name to UUID Conversion', () => {
  let prisma: PrismaClient;

  beforeEach(() => {
    prisma = new PrismaClient();
    jest.clearAllMocks();
  });

  describe('getCharacterNameToIdMap', () => {
    it('should create name to ID mapping for characters', async () => {
      const mockCharacters = [
        { id: 'char-1', name: '张三' },
        { id: 'char-2', name: '李四' },
        { id: 'char-3', name: '王五' }
      ];

      (prisma.character.findMany as jest.Mock).mockResolvedValue(mockCharacters);

      const mapping = await getCharacterNameToIdMap('project-123');

      expect(mapping).toEqual({
        '张三': 'char-1',
        '李四': 'char-2',
        '王五': 'char-3'
      });
      expect(prisma.character.findMany).toHaveBeenCalledWith({
        where: { projectId: 'project-123' },
        select: { id: true, name: true }
      });
    });

    it('should handle empty character list', async () => {
      (prisma.character.findMany as jest.Mock).mockResolvedValue([]);

      const mapping = await getCharacterNameToIdMap('project-123');

      expect(mapping).toEqual({});
    });
  });

  describe('getLocationNameToIdMap', () => {
    it('should create title to ID mapping for world settings', async () => {
      const mockLocations = [
        { id: 'loc-1', title: '咖啡厅', category: 'Geography' },
        { id: 'loc-2', title: '公园', category: 'Geography' },
        { id: 'loc-3', title: '魔法塔', category: 'Magic/Tech' }
      ];

      (prisma.worldSetting.findMany as jest.Mock).mockResolvedValue(mockLocations);

      const mapping = await getLocationNameToIdMap('project-123');

      expect(mapping).toEqual({
        '咖啡厅': 'loc-1',
        '公园': 'loc-2',
        '魔法塔': 'loc-3'
      });
      expect(prisma.worldSetting.findMany).toHaveBeenCalledWith({
        where: { projectId: 'project-123' },
        select: { id: true, title: true, category: true }
      });
    });

    it('should handle empty location list', async () => {
      (prisma.worldSetting.findMany as jest.Mock).mockResolvedValue([]);

      const mapping = await getLocationNameToIdMap('project-123');

      expect(mapping).toEqual({});
    });
  });

  describe('mapCharacterNamesToUuids', () => {
    it('should map character names to UUIDs successfully', () => {
      const nameToIdMap = {
        '张三': 'char-1',
        '李四': 'char-2',
        '王五': 'char-3'
      };

      const names = ['张三', '李四'];
      const result = mapCharacterNamesToUuids(names, nameToIdMap);

      expect(result.success).toBe(true);
      expect(result.mapped).toBe(2);
      expect(result.unmapped).toEqual([]);
    });

    it('should handle unmapped character names', () => {
      const nameToIdMap = {
        '张三': 'char-1',
        '李四': 'char-2'
      };

      const names = ['张三', '赵六']; // 赵六不存在
      const result = mapCharacterNamesToUuids(names, nameToIdMap, 'Test Context');

      expect(result.success).toBe(false);
      expect(result.mapped).toBe(1);
      expect(result.unmapped).toEqual(['赵六']);
      expect(result.warnings).toContain('[Mapper] Character "赵六" not found in project (Test Context)');
    });

    it('should handle empty names array', () => {
      const nameToIdMap = { '张三': 'char-1' };
      const result = mapCharacterNamesToUuids([], nameToIdMap);

      expect(result.success).toBe(true);
      expect(result.mapped).toBe(0);
      expect(result.unmapped).toEqual([]);
    });

    it('should handle undefined names', () => {
      const nameToIdMap = { '张三': 'char-1' };
      const result = mapCharacterNamesToUuids(undefined, nameToIdMap);

      expect(result.success).toBe(true);
      expect(result.mapped).toBe(0);
    });
  });

  describe('mapLocationNamesToUuids', () => {
    it('should map location names to UUIDs successfully', () => {
      const nameToIdMap = {
        '咖啡厅': 'loc-1',
        '公园': 'loc-2'
      };

      const names = ['咖啡厅', '公园'];
      const result = mapLocationNamesToUuids(names, nameToIdMap);

      expect(result.success).toBe(true);
      expect(result.mapped).toBe(2);
      expect(result.unmapped).toEqual([]);
    });

    it('should handle unmapped location names', () => {
      const nameToIdMap = {
        '咖啡厅': 'loc-1'
      };

      const names = ['咖啡厅', '图书馆']; // 图书馆不存在
      const result = mapLocationNamesToUuids(names, nameToIdMap);

      expect(result.success).toBe(false);
      expect(result.mapped).toBe(1);
      expect(result.unmapped).toEqual(['图书馆']);
    });
  });

  describe('convertPlotNodeNamesToUuids', () => {
    it('should convert plot node names to UUIDs', async () => {
      const mockCharacters = [
        { id: 'char-1', name: '张三' },
        { id: 'char-2', name: '李四' }
      ];

      const mockLocations = [
        { id: 'loc-1', title: '咖啡厅', category: 'Geography' },
        { id: 'loc-2', title: '公园', category: 'Geography' }
      ];

      (prisma.character.findMany as jest.Mock).mockResolvedValue(mockCharacters);
      (prisma.worldSetting.findMany as jest.Mock).mockResolvedValue(mockLocations);

      const nodes = [
        {
          title: '第一次相遇',
          content: '张三和李四在咖啡厅相遇',
          relatedCharacterNames: ['张三', '李四'],
          relatedLocationNames: ['咖啡厅']
        },
        {
          title: '公园散步',
          content: '两人在公园聊天',
          relatedCharacterNames: ['张三', '李四'],
          relatedLocationNames: ['公园']
        }
      ];

      const result = await convertPlotNodeNamesToUuids(nodes, 'project-123');

      expect(result).toHaveLength(2);
      expect(result[0].relatedCharacters).toEqual(['char-1', 'char-2']);
      expect(result[0].relatedLocations).toEqual(['loc-1']);
      expect(result[1].relatedCharacters).toEqual(['char-1', 'char-2']);
      expect(result[1].relatedLocations).toEqual(['loc-2']);
    });

    it('should handle missing character/location names gracefully', async () => {
      const mockCharacters = [
        { id: 'char-1', name: '张三' }
      ];

      const mockLocations = [
        { id: 'loc-1', title: '咖啡厅', category: 'Geography' }
      ];

      (prisma.character.findMany as jest.Mock).mockResolvedValue(mockCharacters);
      (prisma.worldSetting.findMany as jest.Mock).mockResolvedValue(mockLocations);

      const nodes = [
        {
          title: '测试节点',
          content: '内容',
          relatedCharacterNames: ['张三', '不存在的角色'],
          relatedLocationNames: ['咖啡厅', '不存在的地点']
        }
      ];

      const result = await convertPlotNodeNamesToUuids(nodes, 'project-123');

      expect(result[0].relatedCharacters).toEqual(['char-1']);
      expect(result[0].relatedLocations).toEqual(['loc-1']);
      expect(result[0]._mappingInfo?.characters.unmapped).toEqual(['不存在的角色']);
      expect(result[0]._mappingInfo?.locations.unmapped).toEqual(['不存在的地点']);
    });

    it('should preserve existing UUID references', async () => {
      const mockCharacters = [
        { id: 'char-1', name: '张三' }
      ];

      const mockLocations = [
        { id: 'loc-1', title: '咖啡厅', category: 'Geography' }
      ];

      (prisma.character.findMany as jest.Mock).mockResolvedValue(mockCharacters);
      (prisma.worldSetting.findMany as jest.Mock).mockResolvedValue(mockLocations);

      const nodes = [
        {
          title: '测试节点',
          content: '内容',
          relatedCharacterNames: ['张三'],
          relatedLocationNames: ['咖啡厅'],
          relatedCharacters: ['char-existing'], // 已存在的UUID
          relatedLocations: ['loc-existing']     // 已存在的UUID
        }
      ];

      const result = await convertPlotNodeNamesToUuids(nodes, 'project-123');

      expect(result[0].relatedCharacters).toContain('char-1');
      expect(result[0].relatedCharacters).toContain('char-existing');
      expect(result[0].relatedLocations).toContain('loc-1');
      expect(result[0].relatedLocations).toContain('loc-existing');
    });
  });
});
