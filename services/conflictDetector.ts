/**
 * 伏笔矛盾检测服务
 *
 * 自动检测伏笔与内容的矛盾冲突
 */

import {
  Foreshadowing,
  ForeshadowingConflict,
} from '@/types/foreshadowing';
import { Project } from '@/types';

/**
 * 矛盾检测器
 */
export class ConflictDetector {
  /**
   * 检测伏笔的所有潜在矛盾
   */
  static detectConflicts(
    foreshadowing: Foreshadowing,
    project: Project
  ): ForeshadowingConflict[] {
    const conflicts: ForeshadowingConflict[] = [];

    // 1. 检测时间线矛盾
    conflicts.push(...this.detectTimelineConflicts(foreshadowing, project));

    // 2. 检测角色设定矛盾
    conflicts.push(...this.detectCharacterConflicts(foreshadowing, project));

    // 3. 检测剧情逻辑矛盾
    conflicts.push(...this.detectPlotConflicts(foreshadowing, project));

    // 4. 检测世界观矛盾
    conflicts.push(...this.detectWorldConflicts(foreshadowing, project));

    return conflicts;
  }

  /**
   * 检测时间线矛盾
   */
  static detectTimelineConflicts(
    foreshadowing: Foreshadowing,
    project: Project
  ): ForeshadowingConflict[] {
    const conflicts: ForeshadowingConflict[] = [];

    // 检查伏笔的揭示时间是否在关联事件之后
    if (foreshadowing.actualRevealChapterId && foreshadowing.relatedChapters.length > 0) {
      // 查找章节顺序（这里假设有章节数据）
      const revealChapter = this.findChapterById(foreshadowing.actualRevealChapterId, project);
      const relatedChapters = foreshadowing.relatedChapters
        .map(chapterId => this.findChapterById(chapterId, project))
        .filter(Boolean);

      // 如果揭示章节早于某些关联章节，可能存在时间线问题
      if (revealChapter && relatedChapters.length > 0) {
        const earlyRelatedChapters = relatedChapters.filter(chapter =>
          chapter.order < revealChapter.order
        );

        if (earlyRelatedChapters.length > 0) {
          conflicts.push({
            id: `conf-tl-${Date.now()}`,
            foreshadowingId: foreshadowing.id,
            conflictType: 'timeline',
            description: `伏笔在第${revealChapter.order}章揭示，但关联了更早的章节（${earlyRelatedChapters.map(c => `第${c.order}章`).join('、')}）`,
            severity: 5,
            targetId: foreshadowing.actualRevealChapterId,
            suggestions: [
              '检查伏笔是否应该在更早的章节揭示',
              '调整关联章节的范围',
              '确认章节顺序是否正确',
            ],
            resolved: false,
            detectedAt: new Date(),
          });
        }
      }
    }

    // 检查未揭示但已过预计揭示时间的伏笔
    if (foreshadowing.estimatedRevealTime && foreshadowing.status === 'unrevealed') {
      const currentChapter = this.getCurrentChapter(project);
      if (currentChapter && currentChapter.order > foreshadowing.estimatedRevealTime) {
        conflicts.push({
          id: `conf-tl-est-${Date.now()}`,
          foreshadowingId: foreshadowing.id,
          conflictType: 'timeline',
          description: `伏笔预计在第${foreshadowing.estimatedRevealTime}章揭示，但当前已到第${currentChapter.order}章，状态仍为"未揭示"`,
          severity: 3,
          suggestions: [
            '更新伏笔状态为"已揭示"或"进行中"',
            '调整预计揭示时间',
            '检查是否需要延迟揭示',
          ],
          resolved: false,
          detectedAt: new Date(),
        });
      }
    }

    return conflicts;
  }

  /**
   * 检测角色设定矛盾
   */
  static detectCharacterConflicts(
    foreshadowing: Foreshadowing,
    project: Project
  ): ForeshadowingConflict[] {
    const conflicts: ForeshadowingConflict[] = [];

    // 检查关联角色是否存在
    foreshadowing.relatedCharacters.forEach(characterId => {
      const character = project.characters.find(c => c.id === characterId);
      if (!character) {
        conflicts.push({
          id: `conf-char-${characterId}-${Date.now()}`,
          foreshadowingId: foreshadowing.id,
          conflictType: 'character',
          description: `关联的角色 "${characterId}" 不存在`,
          severity: 7,
          targetId: characterId,
          suggestions: [
            '删除不存在的角色关联',
            '检查角色ID是否正确',
            '创建缺失的角色',
          ],
          resolved: false,
          detectedAt: new Date(),
        });
      }
    });

    // 检查角色关系与伏笔描述是否矛盾
    foreshadowing.relatedCharacters.forEach(characterId => {
      const character = project.characters.find(c => c.id === characterId);
      if (!character) return;

      // 检查已死亡的角色是否有未揭示的伏笔
      if (character.isDead && foreshadowing.status === 'unrevealed') {
        conflicts.push({
          id: `conf-char-dead-${characterId}-${Date.now()}`,
          foreshadowingId: foreshadowing.id,
          conflictType: 'character',
          description: `关联角色 "${character.name}" 已死亡，但伏笔状态仍为"未揭示"`,
          severity: 6,
          targetId: characterId,
          suggestions: [
            '更新角色状态（如果复活）',
            '更新伏笔状态为"已揭示"或"已废弃"',
            '添加角色死亡前的揭示时间点',
          ],
          resolved: false,
          detectedAt: new Date(),
        });
      }

      // 检查角色关系与伏笔类型是否冲突
      character.relationships?.forEach(rel => {
        const relatedCharacter = project.characters.find(c => c.id === rel.characterId);
        if (!relatedCharacter) return;

        // 如果伏笔类型是"敌人关系"，但角色关系是"同盟"，可能存在矛盾
        if (foreshadowing.type === 'ally' && rel.type === 'enemy') {
          conflicts.push({
            id: `conf-char-rel-${characterId}-${rel.characterId}-${Date.now()}`,
            foreshadowingId: foreshadowing.id,
            conflictType: 'character',
            description: `伏笔描述涉及"同盟"关系，但角色 ${character.name} 和 ${relatedCharacter.name} 的关系是"敌人"`,
            severity: 4,
            suggestions: [
              '检查伏笔描述是否准确',
              '更新角色关系',
              '检查是否是关系变化的伏笔',
            ],
            resolved: false,
            detectedAt: new Date(),
          });
        }
      });
    });

    return conflicts;
  }

  /**
   * 检测剧情逻辑矛盾
   */
  static detectPlotConflicts(
    foreshadowing: Foreshadowing,
    project: Project
  ): ForeshadowingConflict[] {
    const conflicts: ForeshadowingConflict[] = [];

    // 检查已解决的伏笔是否有关联的未解决伏笔
    if (foreshadowing.status === 'resolved') {
      const relatedForeshadowings = project.foreshadowings?.filter(fs =>
        fs.id !== foreshadowing.id &&
        fs.relatedForeshadowings.includes(foreshadowing.id) &&
        fs.status === 'unrevealed'
      ) || [];

      relatedForeshadowings.forEach(relatedFs => {
        conflicts.push({
          id: `conf-plot-res-${relatedFs.id}-${Date.now()}`,
          foreshadowingId: foreshadowing.id,
          conflictType: 'plot',
          description: `此伏笔已解决，但关联的伏笔"${relatedFs.title}"仍处于"未揭示"状态`,
          severity: 3,
          targetId: relatedFs.id,
          suggestions: [
            '检查关联伏笔是否需要更新状态',
            '如果确实是独立伏笔，可以忽略此警告',
            '考虑添加说明解释为什么已解决但相关伏笔未揭示',
          ],
          resolved: false,
          detectedAt: new Date(),
        });
      });
    }

    // 检查未揭示的伏笔是否在已废弃的章节中
    if (foreshadowing.status === 'unrevealed' && foreshadowing.relatedChapters.length > 0) {
      // 这里假设可以检查章节是否已废弃
      // 实际实现需要根据项目结构调整
    }

    // 检查伏笔描述中的关键词是否与实际内容矛盾
    const conflictKeywords = this.checkDescriptionConflicts(foreshadowing, project);
    conflicts.push(...conflictKeywords);

    return conflicts;
  }

  /**
   * 检测世界观矛盾
   */
  static detectWorldConflicts(
    foreshadowing: Foreshadowing,
    project: Project
  ): ForeshadowingConflict[] {
    const conflicts: ForeshadowingConflict[] = [];

    // 检查伏笔是否与已建立的世界设定冲突
    foreshadowing.relatedCharacters.forEach(characterId => {
      const character = project.characters.find(c => c.id === characterId);
      if (!character) return;

      // 检查角色所属门派/组织与伏笔是否冲突
      if (character.faction && foreshadowing.description) {
        const worldSetting = project.worldSettings?.find(ws =>
          ws.id === character.faction
        );

        if (worldSetting) {
          // 检查伏笔描述是否与门派设定冲突
          const conflicts = this.checkWorldSettingCompatibility(
            foreshadowing.description,
            worldSetting
          );

          if (conflicts.length > 0) {
            conflicts.forEach(conflictDesc => {
              conflicts.push({
                id: `conf-world-${characterId}-${Date.now()}`,
                foreshadowingId: foreshadowing.id,
                conflictType: 'world',
                description: `伏笔描述与门派"${worldSetting.name}"的设定存在潜在冲突: ${conflictDesc}`,
                severity: 5,
                targetId: worldSetting.id,
                suggestions: [
                  '检查伏笔描述是否准确',
                  '确认门派设定',
                  '添加特殊说明解释为何存在例外',
                ],
                resolved: false,
                detectedAt: new Date(),
              });
            });
          }
        }
      }
    });

    return conflicts;
  }

  /**
   * 检查描述中的关键词冲突
   */
  static checkDescriptionConflicts(
    foreshadowing: Foreshadowing,
    project: Project
  ): ForeshadowingConflict[] {
    const conflicts: ForeshadowingConflict[] = [];
    const description = foreshadowing.description.toLowerCase();

    // 定义关键词冲突规则
    const conflictRules = [
      {
        keywords: ['死亡', '身亡', '牺牲', '丧命'],
        check: () => {
          return foreshadowing.relatedCharacters.some(charId => {
            const character = project.characters.find(c => c.id === charId);
            return character && !character.isDead;
          });
        },
        message: '描述中提到死亡，但关联角色仍存活',
      },
      {
        keywords: ['复活', '重生', '归来'],
        check: () => {
          return foreshadowing.relatedCharacters.some(charId => {
            const character = project.characters.find(c => c.id === charId);
            return character && character.isDead;
          });
        },
        message: '描述中提到复活，但角色状态未标记为死亡',
      },
      {
        keywords: ['消失', '失踪', '不知去向'],
        check: () => {
          return foreshadowing.status === 'resolved';
        },
        message: '描述中提到角色/物品消失，但伏笔已"解决"',
      },
    ];

    conflictRules.forEach(rule => {
      const hasKeyword = rule.keywords.some(keyword => description.includes(keyword));
      if (hasKeyword && rule.check()) {
        conflicts.push({
          id: `conf-desc-${Date.now()}-${Math.random()}`,
          foreshadowingId: foreshadowing.id,
          conflictType: 'logic',
          description: rule.message,
          severity: 4,
          suggestions: [
            '检查伏笔描述是否准确',
            '更新相关实体状态',
            '添加详细说明避免误解',
          ],
          resolved: false,
          detectedAt: new Date(),
        });
      }
    });

    return conflicts;
  }

  /**
   * 检查与世界设定的兼容性
   */
  static checkWorldSettingCompatibility(
    description: string,
    worldSetting: any
  ): string[] {
    const conflicts: string[] = [];
    const desc = description.toLowerCase();

    // 这里可以添加更复杂的兼容性检查规则
    // 例如：某些门派不允许使用某些武功、某些地区不存在特定事物等

    return conflicts;
  }

  /**
   * 查找章节
   */
  static findChapterById(chapterId: string, project: Project): any {
    // 这里需要根据实际的章节数据结构调整
    // 假设 project.chapters 存在
    return (project as any).chapters?.find((ch: any) => ch.id === chapterId);
  }

  /**
   * 获取当前章节
   */
  static getCurrentChapter(project: Project): any {
    // 这里需要根据实际逻辑返回当前章节
    // 可能需要从 store 中获取
    return (project as any).currentChapter;
  }

  /**
   * 生成智能解决建议
   */
  static generateResolutionSuggestions(
    conflict: ForeshadowingConflict
  ): string[] {
    const suggestions: string[] = [];

    switch (conflict.conflictType) {
      case 'timeline':
        suggestions.push(
          '检查时间线是否正确',
          '调整伏笔的揭示时间',
          '更新章节顺序',
          '添加时间跳转说明'
        );
        break;

      case 'character':
        suggestions.push(
          '检查角色状态是否需要更新',
          '确认角色关系是否正确',
          '添加角色状态变化的解释',
          '检查是否是伏笔的一部分（故意为之）'
        );
        break;

      case 'plot':
        suggestions.push(
          '检查剧情逻辑是否一致',
          '更新相关伏笔的状态',
          '添加说明解释为什么存在差异',
          '考虑是否需要修改伏笔描述'
        );
        break;

      case 'world':
        suggestions.push(
          '检查世界观设定',
          '确认是否存在特殊情况或例外',
          '添加背景解释',
          '修改伏笔以符合世界观设定'
        );
        break;

      case 'logic':
        suggestions.push(
          '检查描述是否准确',
          '更新实体状态',
          '添加详细说明',
          '重新表述避免歧义'
        );
        break;
    }

    return suggestions;
  }

  /**
   * 批量检测所有伏笔的矛盾
   */
  static batchDetectConflicts(
    foreshadowings: Foreshadowing[],
    project: Project
  ): Map<string, ForeshadowingConflict[]> {
    const conflictsMap = new Map<string, ForeshadowingConflict[]>();

    foreshadowings.forEach(foreshadowing => {
      const conflicts = this.detectConflicts(foreshadowing, project);
      if (conflicts.length > 0) {
        conflictsMap.set(foreshadowing.id, conflicts);
      }
    });

    return conflictsMap;
  }

  /**
   * 计算矛盾的严重程度
   */
  static calculateConflictSeverity(conflicts: ForeshadowingConflict[]): {
    total: number;
    byType: Record<string, number>;
    average: number;
  } {
    const byType: Record<string, number> = {};
    let totalSeverity = 0;

    conflicts.forEach(conflict => {
      byType[conflict.conflictType] = (byType[conflict.conflictType] || 0) + 1;
      totalSeverity += conflict.severity;
    });

    return {
      total: conflicts.length,
      byType,
      average: conflicts.length > 0 ? totalSeverity / conflicts.length : 0,
    };
  }

  /**
   * 生成矛盾报告
   */
  static generateConflictReport(
    conflictsMap: Map<string, ForeshadowingConflict[]>
  ): {
    totalConflicts: number;
    affectedForeshadowings: number;
    byType: Record<string, number>;
    highSeverityConflicts: number;
    summary: string;
  } {
    let totalConflicts = 0;
    let highSeverityConflicts = 0;
    const byType: Record<string, number> = {};

    conflictsMap.forEach((conflicts, foreshadowingId) => {
      totalConflicts += conflicts.length;

      conflicts.forEach(conflict => {
        byType[conflict.conflictType] = (byType[conflict.conflictType] || 0) + 1;

        if (conflict.severity >= 7) {
          highSeverityConflicts++;
        }
      });
    });

    const summary = this.generateSummary(totalConflicts, highSeverityConflicts, byType);

    return {
      totalConflicts,
      affectedForeshadowings: conflictsMap.size,
      byType,
      highSeverityConflicts,
      summary,
    };
  }

  /**
   * 生成矛盾总结文本
   */
  static generateSummary(
    totalConflicts: number,
    highSeverityConflicts: number,
    byType: Record<string, number>
  ): string {
    const parts: string[] = [];

    if (totalConflicts === 0) {
      return '未检测到任何矛盾。';
    }

    parts.push(`检测到${totalConflicts}个潜在矛盾`);

    if (highSeverityConflicts > 0) {
      parts.push(`，其中${highSeverityConflicts}个为高严重程度`);
    }

    const typeDescriptions = Object.entries(byType).map(([type, count]) => {
      const typeLabels: Record<string, string> = {
        timeline: '时间线',
        character: '角色设定',
        plot: '剧情逻辑',
        world: '世界观',
        logic: '逻辑',
      };
      return `${count}个${typeLabels[type] || type}矛盾`;
    });

    if (typeDescriptions.length > 0) {
      parts.push(`（${typeDescriptions.join('、')}）`);
    }

    return parts.join('') + '。';
  }
}
