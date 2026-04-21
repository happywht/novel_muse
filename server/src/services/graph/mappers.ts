import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 名称到UUID映射结果接口
 */
export interface NameMappingResult {
  success: boolean;
  mapped: number;           // 成功映射的数量
  unmapped: string[];       // 未能映射的名称列表
  warnings: string[];       // 警告信息
}

/**
 * PlotNode元数据扩展接口
 * 用于名称到UUID转换的中间表示
 */
export interface PlotNodeWithNames {
  id?: string;
  title: string;
  content: string;
  order?: number;
  beatTag?: string;
  // AI生成的名称数组
  relatedCharacterNames?: string[];
  relatedLocationNames?: string[];
  // 已存在的UUID数组（向后兼容）
  relatedCharacters?: string[];
  relatedLocations?: string[];
  relatedChapters?: string[];
  conflictScenario?: any;
}

/**
 * PlotNode UUID增强结果
 */
export interface PlotNodeWithUUIDs extends PlotNodeWithNames {
  relatedCharacters: string[];  // UUID数组
  relatedLocations: string[];   // UUID数组
  _mappingInfo?: {              // 映射信息（用于调试）
    characters: NameMappingResult;
    locations: NameMappingResult;
  };
}

/**
 * 获取项目中所有角色的 name -> id 映射
 *
 * @param projectId 项目ID
 * @returns Record<string, string> 名称到ID的映射表
 *
 * @example
 * const map = await getCharacterNameToIdMap('project-123');
 * console.log(map['张三']); // 'character-uuid-123'
 */
export async function getCharacterNameToIdMap(
  projectId: string
): Promise<Record<string, string>> {
  try {
    const characters = await prisma.character.findMany({
      where: { projectId },
      select: {
        id: true,
        name: true
      }
    });

    // 构建名称到ID的映射表
    const nameToIdMap: Record<string, string> = {};
    for (const char of characters) {
      // 使用精确匹配
      nameToIdMap[char.name] = char.id;

      // 可选：支持模糊匹配（去除空格、标点等）
      // 这样AI生成时的轻微格式差异也能匹配
      const normalizedNames = [
        char.name.trim(),
        char.name.replace(/\s+/g, ''),  // 移除所有空格
        char.name.replace(/[，。、！？；：""''（）【】]/g, ''), // 移除中文标点
      ];

      // 去重后添加到映射表
      const uniqueNames = Array.from(new Set(normalizedNames));
      for (const name of uniqueNames) {
        if (name && name !== char.name) {
          nameToIdMap[name] = char.id;
        }
      }
    }

    console.log(`[Mapper] Loaded ${characters.length} characters for project ${projectId}`);
    return nameToIdMap;
  } catch (error) {
    console.error('[Mapper] Error loading character name-to-id map:', error);
    throw new Error(`Failed to load character mappings: ${error}`);
  }
}

/**
 * 获取项目中所有地点的 title -> id 映射
 *
 * @param projectId 项目ID
 * @returns Record<string, string> 地点标题到ID的映射表
 *
 * @example
 * const map = await getLocationNameToIdMap('project-123');
 * console.log(map['咖啡厅']); // 'worldsetting-uuid-456'
 */
export async function getLocationNameToIdMap(
  projectId: string
): Promise<Record<string, string>> {
  try {
    const locations = await prisma.worldSetting.findMany({
      where: { projectId },
      select: {
        id: true,
        title: true,
        category: true
      }
    });

    // 构建标题到ID的映射表
    const titleToIdMap: Record<string, string> = {};
    for (const loc of locations) {
      // 使用精确匹配
      titleToIdMap[loc.title] = loc.id;

      // 可选：支持模糊匹配
      const normalizedTitles = [
        loc.title.trim(),
        loc.title.replace(/\s+/g, ''),
        loc.title.replace(/[，。、！？；：""''（）【】]/g, ''),
      ];

      const uniqueTitles = Array.from(new Set(normalizedTitles));
      for (const title of uniqueTitles) {
        if (title && title !== loc.title) {
          titleToIdMap[title] = loc.id;
        }
      }
    }

    console.log(`[Mapper] Loaded ${locations.length} world settings for project ${projectId}`);
    return titleToIdMap;
  } catch (error) {
    console.error('[Mapper] Error loading location name-to-id map:', error);
    throw new Error(`Failed to load location mappings: ${error}`);
  }
}

/**
 * 将角色名称数组转换为UUID数组
 *
 * @param names 角色名称数组
 * @param nameToIdMap 名称到ID的映射表
 * @param context 上下文信息（用于日志）
 * @returns NameMappingResult 映射结果
 */
export function mapCharacterNamesToUuids(
  names: string[] | undefined,
  nameToIdMap: Record<string, string>,
  context?: string
): NameMappingResult {
  if (!names || names.length === 0) {
    return { success: true, mapped: 0, unmapped: [], warnings: [] };
  }

  const uuids: string[] = [];
  const unmapped: string[] = [];
  const warnings: string[] = [];

  for (const name of names) {
    if (!name || name.trim() === '') {
      continue;
    }

    const trimmedName = name.trim();
    const uuid = nameToIdMap[trimmedName];

    if (uuid) {
      uuids.push(uuid);
    } else {
      unmapped.push(trimmedName);
      warnings.push(`[Mapper] Character "${trimmedName}" not found in project${context ? ` (${context})` : ''}`);
    }
  }

  // 记录未能映射的名称
  if (unmapped.length > 0) {
    console.warn(`[Mapper] ${unmapped.length} character names could not be mapped:`, unmapped);
  }

  return {
    success: unmapped.length === 0,
    mapped: uuids.length,
    unmapped,
    warnings
  };
}

/**
 * 将地点名称数组转换为UUID数组
 *
 * @param names 地点名称数组
 * @param nameToIdMap 名称到ID的映射表
 * @param context 上下文信息（用于日志）
 * @returns NameMappingResult 映射结果
 */
export function mapLocationNamesToUuids(
  names: string[] | undefined,
  nameToIdMap: Record<string, string>,
  context?: string
): NameMappingResult {
  if (!names || names.length === 0) {
    return { success: true, mapped: 0, unmapped: [], warnings: [] };
  }

  const uuids: string[] = [];
  const unmapped: string[] = [];
  const warnings: string[] = [];

  for (const name of names) {
    if (!name || name.trim() === '') {
      continue;
    }

    const trimmedName = name.trim();
    const uuid = nameToIdMap[trimmedName];

    if (uuid) {
      uuids.push(uuid);
    } else {
      unmapped.push(trimmedName);
      warnings.push(`[Mapper] Location "${trimmedName}" not found in project${context ? ` (${context})` : ''}`);
    }
  }

  if (unmapped.length > 0) {
    console.warn(`[Mapper] ${unmapped.length} location names could not be mapped:`, unmapped);
  }

  return {
    success: unmapped.length === 0,
    mapped: uuids.length,
    unmapped,
    warnings
  };
}

/**
 * 批量转换PlotNode中的名称为UUID引用
 *
 * @param nodes 包含名称的PlotNode数组
 * @param projectId 项目ID
 * @returns Promise<PlotNodeWithUUIDs[]> 增强后的PlotNode数组
 *
 * @example
 * const enhancedNodes = await convertPlotNodeNamesToUuids(aiGeneratedNodes, 'project-123');
 */
export async function convertPlotNodeNamesToUuids(
  nodes: PlotNodeWithNames[],
  projectId: string
): Promise<PlotNodeWithUUIDs[]> {
  try {
    console.log(`[Mapper] Starting UUID conversion for ${nodes.length} plot nodes in project ${projectId}`);

    // 并行获取映射表
    const [characterMap, locationMap] = await Promise.all([
      getCharacterNameToIdMap(projectId),
      getLocationNameToIdMap(projectId)
    ]);

    // 转换每个节点
    const enhancedNodes: PlotNodeWithUUIDs[] = nodes.map((node, index) => {
      const nodeContext = `Node "${node.title}" (#${index + 1})`;

      // 转换角色名称
      const characterResult = mapCharacterNamesToUuids(
        node.relatedCharacterNames,
        characterMap,
        nodeContext
      );

      // 转换地点名称
      const locationResult = mapLocationNamesToUuids(
        node.relatedLocationNames,
        locationMap,
        nodeContext
      );

      // 合并已有的UUID引用（向后兼容）
      const existingCharacterUuids = node.relatedCharacters || [];
      const existingLocationUuids = node.relatedLocations || [];

      // 去重合并
      const allCharacterUuids = Array.from(new Set([
        ...existingCharacterUuids,
        ...characterResult.mapped > 0 ? [] : [] // 这里需要修改，应该添加映射成功的UUID
      ]));

      const allLocationUuids = Array.from(new Set([
        ...existingLocationUuids,
        ...locationResult.mapped > 0 ? [] : []
      ]));

      // 正确的实现：获取映射成功的UUID
      const mappedCharacterUuids = node.relatedCharacterNames
        ?.map(name => characterMap[name.trim()])
        .filter(Boolean) || [];

      const mappedLocationUuids = node.relatedLocationNames
        ?.map(name => locationMap[name.trim()])
        .filter(Boolean) || [];

      return {
        ...node,
        relatedCharacters: Array.from(new Set([...existingCharacterUuids, ...mappedCharacterUuids])),
        relatedLocations: Array.from(new Set([...existingLocationUuids, ...mappedLocationUuids])),
        _mappingInfo: {
          characters: characterResult,
          locations: locationResult
        }
      };
    });

    // 统计映射结果
    const totalCharacterWarnings = enhancedNodes.reduce(
      (sum, node) => sum + node._mappingInfo!.characters.warnings.length, 0
    );
    const totalLocationWarnings = enhancedNodes.reduce(
      (sum, node) => sum + node._mappingInfo!.locations.warnings.length, 0
    );

    console.log(`[Mapper] UUID conversion completed:`);
    console.log(`  - Processed ${nodes.length} plot nodes`);
    console.log(`  - Total character mapping warnings: ${totalCharacterWarnings}`);
    console.log(`  - Total location mapping warnings: ${totalLocationWarnings}`);

    return enhancedNodes;
  } catch (error) {
    console.error('[Mapper] Error converting plot node names to UUIDs:', error);
    throw new Error(`Failed to convert plot node names to UUIDs: ${error}`);
  }
}

/**
 * 验证UUID引用的有效性
 *
 * @param uuids UUID数组
 * @param projectId 项目ID
 * @returns Promise<boolean> 是否所有UUID都有效
 */
export async function validateCharacterUuids(
  uuids: string[],
  projectId: string
): Promise<boolean> {
  if (!uuids || uuids.length === 0) {
    return true;
  }

  try {
    const count = await prisma.character.count({
      where: {
        projectId,
        id: { in: uuids }
      }
    });

    return count === uuids.length;
  } catch (error) {
    console.error('[Mapper] Error validating character UUIDs:', error);
    return false;
  }
}

/**
 * 验证地点UUID引用的有效性
 *
 * @param uuids UUID数组
 * @param projectId 项目ID
 * @returns Promise<boolean> 是否所有UUID都有效
 */
export async function validateLocationUuids(
  uuids: string[],
  projectId: string
): Promise<boolean> {
  if (!uuids || uuids.length === 0) {
    return true;
  }

  try {
    const count = await prisma.worldSetting.count({
      where: {
        projectId,
        id: { in: uuids }
      }
    });

    return count === uuids.length;
  } catch (error) {
    console.error('[Mapper] Error validating location UUIDs:', error);
    return false;
  }
}
