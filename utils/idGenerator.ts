/**
 * 统一ID生成工具
 *
 * 解决ID生成策略不一致的问题，统一使用crypto.randomUUID()
 * 提供类型安全的ID生成、验证、转换功能
 */

/**
 * 生成符合UUID v4格式的唯一标识符
 * @returns UUID v4格式的字符串
 */
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback for environments without crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * 生成带前缀的UUID
 * @param prefix 前缀标识符（如 'char', 'loc', 'beat'）
 * @returns 带前缀的UUID
 */
export function generatePrefixedUUID(prefix: string): string {
  const uuid = generateUUID();
  return `${prefix}_${uuid}`;
}

/**
 * 验证字符串是否为有效的UUID
 * @param id 要验证的字符串
 * @returns 是否为有效的UUID
 */
export function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * 从带前缀的UUID中提取纯UUID
 * @param prefixedId 带前缀的UUID
 * @returns 纯UUID，如果无效则返回null
 */
export function extractUUID(prefixedId: string): string | null {
  const match = prefixedId.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
  return match ? match[1] : null;
}

/**
 * 批量生成UUID
 * @param count 生成数量
 * @returns UUID数组
 */
export function generateUUIDs(count: number): string[] {
  return Array.from({ length: count }, () => generateUUID());
}

/**
 * 为不同实体类型生成ID
 */
export const EntityIdGenerator = {
  // Character IDs
  character: () => generatePrefixedUUID('char'),

  // Location/World Setting IDs
  location: () => generatePrefixedUUID('loc'),

  // Plot Node IDs
  plotNode: () => generatePrefixedUUID('plot'),

  // Chapter IDs
  chapter: () => generatePrefixedUUID('chapter'),

  // Echo IDs
  echo: () => generatePrefixedUUID('echo'),

  // Beat IDs
  beat: () => generatePrefixedUUID('beat'),

  // Relationship IDs
  relationship: () => generatePrefixedUUID('rel'),

  // Faction IDs
  faction: () => generatePrefixedUUID('faction'),

  // Foreshadowing IDs
  foreshadowing: () => generatePrefixedUUID('foreshadow'),

  // Project IDs
  project: () => generatePrefixedUUID('project'),
} as const;

/**
 * ID类型验证器
 */
export const EntityTypeValidator = {
  isCharacterId: (id: string) => id.startsWith('char_') && isValidUUID(id.substring(5)),
  isLocationId: (id: string) => id.startsWith('loc_') && isValidUUID(id.substring(4)),
  isPlotNodeId: (id: string) => id.startsWith('plot_') && isValidUUID(id.substring(5)),
  isChapterId: (id: string) => id.startsWith('chapter_') && isValidUUID(id.substring(8)),
  isEchoId: (id: string) => id.startsWith('echo_') && isValidUUID(id.substring(5)),
  isBeatId: (id: string) => id.startsWith('beat_') && isValidUUID(id.substring(5)),
  isRelationshipId: (id: string) => id.startsWith('rel_') && isValidUUID(id.substring(4)),
  isFactionId: (id: string) => id.startsWith('faction_') && isValidUUID(id.substring(8)),
  isForeshadowingId: (id: string) => id.startsWith('foreshadow_') && isValidUUID(id.substring(11)),
  isProjectId: (id: string) => id.startsWith('project_') && isValidUUID(id.substring(8)),
} as const;

/**
 * 从ID中推断实体类型
 * @param id 实体ID
 * @returns 实体类型，如果无法推断则返回'unknown'
 */
export function inferEntityTypeFromId(id: string): string {
  if (id.startsWith('char_')) return 'character';
  if (id.startsWith('loc_')) return 'location';
  if (id.startsWith('plot_')) return 'plotNode';
  if (id.startsWith('chapter_')) return 'chapter';
  if (id.startsWith('echo_')) return 'echo';
  if (id.startsWith('beat_')) return 'beat';
  if (id.startsWith('rel_')) return 'relationship';
  if (id.startsWith('faction_')) return 'faction';
  if (id.startsWith('foreshadow_')) return 'foreshadowing';
  if (id.startsWith('project_')) return 'project';
  return 'unknown';
}

/**
 * 批量修复旧格式ID为新格式UUID
 * @param entities 实体数组
 * @param idGetter ID获取函数
 * @param idSetter ID设置函数
 * @returns 修复后的实体数组
 */
export function migrateEntityIds<T>(
  entities: T[],
  idGetter: (entity: T) => string,
  idSetter: (entity: T, newId: string) => void
): T[] {
  return entities.map(entity => {
    const currentId = idGetter(entity);

    // 如果已经是有效的UUID格式，直接返回
    if (isValidUUID(currentId) || currentId.startsWith('char_') || currentId.startsWith('loc_')) {
      return entity;
    }

    // 生成新的UUID并更新
    const newId = generateUUID();
    idSetter(entity, newId);
    return entity;
  });
}

/**
 * 创建ID映射表，用于迁移旧ID到新ID
 * @param oldIds 旧ID数组
 * @returns 旧ID到新ID的映射表
 */
export function createIdMigrationMap(oldIds: string[]): Record<string, string> {
  const migrationMap: Record<string, string> = {};

  oldIds.forEach(oldId => {
    // 如果旧ID已经是有效UUID，则不迁移
    if (isValidUUID(oldId)) {
      migrationMap[oldId] = oldId;
    } else {
      migrationMap[oldId] = generateUUID();
    }
  });

  return migrationMap;
}

/**
 * 时间戳ID生成器（用于需要时间排序的场景）
 * @returns 基于时间戳的ID
 */
export function generateTimestampId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 9);
  return `${timestamp}_${random}`;
}

/**
 * 短ID生成器（用于URL等需要短ID的场景）
 * @param length ID长度（默认8）
 * @returns 短ID
 */
export function generateShortId(length: number = 8): string {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * 验证ID是否为系统生成的ID（vs 用户输入的名称）
 * @param id 要验证的ID
 * @returns 是否为系统生成的ID
 */
export function isSystemGeneratedId(id: string): boolean {
  return isValidUUID(id) ||
         id.startsWith('char_') ||
         id.startsWith('loc_') ||
         id.startsWith('plot_') ||
         id.includes('-'); // UUID格式包含连字符
}

/**
 * 清理和标准化ID
 * @param id 原始ID
 * @returns 标准化后的ID
 */
export function normalizeId(id: string): string {
  return id.trim().toLowerCase();
}

/**
 * 批量验证ID数组
 * @param ids ID数组
 * @returns 验证结果对象
 */
export function validateIdBatch(ids: string[]): {
  valid: string[];
  invalid: string[];
  validationErrors: Record<string, string>;
} {
  const valid: string[] = [];
  const invalid: string[] = [];
  const validationErrors: Record<string, string> = {};

  ids.forEach(id => {
    if (isValidUUID(id) || id.match(/^[a-z]+_[0-9a-f-]+$/)) {
      valid.push(id);
    } else {
      invalid.push(id);
      validationErrors[id] = 'Invalid ID format';
    }
  });

  return { valid, invalid, validationErrors };
}

/**
 * 导出统一的ID生成函数，供全局使用
 */
export const generateId = generateUUID;
export const generateEntityId = EntityIdGenerator;
export const validateId = isValidUUID;
