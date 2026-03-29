import { Echo, Character, WorldSetting, Chapter, KnowledgeTriple } from '../../types';

/**
 * 置信度级别配置
 */
export interface ConfidenceLevel {
  level: 'HIGH' | 'MEDIUM' | 'LOW';
  label: string;
  bg: string;
  border: string;
  text: string;
  icon: string;
  threshold: {
    min: number;
    max: number;
  };
}

/**
 * 置信度配置 - 符合设计规范
 */
export const CONFIDENCE_LEVELS: Record<'HIGH' | 'MEDIUM' | 'LOW', ConfidenceLevel> = {
  HIGH: {
    level: 'HIGH',
    label: '高置信度',
    bg: 'bg-emerald-900/20',
    border: 'border-emerald-500/50',
    text: 'text-emerald-400',
    icon: '✅',
    threshold: { min: 0.85, max: 1.0 },
  },
  MEDIUM: {
    level: 'MEDIUM',
    label: '待确认',
    bg: 'bg-amber-900/20',
    border: 'border-amber-500/50',
    text: 'text-amber-400',
    icon: '⚠️',
    threshold: { min: 0.5, max: 0.85 },
  },
  LOW: {
    level: 'LOW',
    label: '低置信度',
    bg: 'bg-slate-900/20',
    border: 'border-slate-700/50',
    text: 'text-slate-500',
    icon: '🚫',
    threshold: { min: 0, max: 0.5 },
  },
};

/**
 * 根据置信度获取配置
 */
export const getConfidenceConfig = (confidence: number | undefined): ConfidenceLevel => {
  const conf = confidence ?? 0.7; // 默认中等置信度

  if (conf >= 0.85) return CONFIDENCE_LEVELS.HIGH;
  if (conf >= 0.5) return CONFIDENCE_LEVELS.MEDIUM;
  return CONFIDENCE_LEVELS.LOW;
};

/**
 * 按置信度分类Echoes
 */
export interface CategorizedEchoes {
  high: Echo[]; // 高置信度 (≥0.85) - 自动采纳
  medium: Echo[]; // 中置信度 (0.5-0.85) - 需审核
  low: Echo[]; // 低置信度 (<0.5) - 已过滤
  total: number;
}

export const categorizeEchoes = (echoes: Echo[]): CategorizedEchoes => {
  const result: CategorizedEchoes = {
    high: [],
    medium: [],
    low: [],
    total: echoes.length,
  };

  echoes.forEach((echo) => {
    const conf = echo.confidence ?? 0.7;

    if (conf >= 0.85) {
      result.high.push(echo);
    } else if (conf >= 0.5) {
      result.medium.push(echo);
    } else {
      result.low.push(echo);
    }
  });

  return result;
};

/**
 * 获取置信度进度条颜色
 */
export const getConfidenceBarColor = (confidence: number): string => {
  if (confidence >= 0.85) return 'bg-emerald-500';
  if (confidence >= 0.7) return 'bg-emerald-400';
  if (confidence >= 0.5) return 'bg-amber-500';
  if (confidence >= 0.3) return 'bg-amber-600';
  return 'bg-slate-600';
};

/**
 * 格式化置信度百分比
 */
export const formatConfidence = (confidence: number | undefined): string => {
  if (confidence === undefined) return '--';
  return `${Math.round(confidence * 100)}%`;
};

/**
 * 自动采纳高置信度Echoes
 */
export const autoAcceptHighConfidence = (
  echoes: Echo[]
): {
  accepted: Echo[];
  remaining: Echo[];
} => {
  const accepted: Echo[] = [];
  const remaining: Echo[] = [];

  echoes.forEach((echo) => {
    const conf = echo.confidence ?? 0.7;
    if (conf >= 0.85) {
      accepted.push({ ...echo, status: 'AUTO_ACCEPTED' });
    } else {
      remaining.push(echo);
    }
  });

  return { accepted, remaining };
};

// ============================================================
// Phase 4: 完整性报告系统
// ============================================================

/**
 * 完整性问题类型
 */
export interface IntegrityIssue {
  type: 'ORPHAN_NODE' | 'CONTRADICTION' | 'PENDING_ECHO';
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  entityName: string;
  description: string;
  details?: string;
  entityId?: string;
  chapterInfo?: string;
}

/**
 * 完整性报告统计
 */
export interface IntegrityStats {
  total: number;
  autoAccepted: number;
  manualAccepted: number;
  rejected: number;
  pending: number;
}

/**
 * 完整性报告结果
 */
export interface IntegrityReport {
  issues: IntegrityIssue[];
  stats: IntegrityStats;
  healthScore: number; // 0-100
}

/**
 * 健康度评分配置
 */
const HEALTH_SCORE_PENALTY = {
  ORPHAN_NODE: -5,
  CONTRADICTION: -10,
  PENDING_ECHO: -3,
};

/**
 * 检测孤立节点（无任何关联的实体）
 */
const detectOrphanNodes = (
  echoes: Echo[],
  characters: Character[],
  worldSettings: WorldSetting[]
): IntegrityIssue[] => {
  const issues: IntegrityIssue[] = [];

  // 收集所有在Echo中出现过的实体ID
  const referencedCharacterIds = new Set<string>();
  const referencedWorldIds = new Set<string>();

  echoes.forEach((echo) => {
    if (echo.type === 'CHARACTER') {
      referencedCharacterIds.add(echo.targetId);
    } else {
      referencedWorldIds.add(echo.targetId);
    }

    // 从三元组中提取关联实体
    if (echo.triples) {
      echo.triples.forEach((triple) => {
        // 查找匹配的实体
        const matchedChar = characters.find(
          (c) => c.name === triple.subject || c.name === triple.object
        );
        const matchedWorld = worldSettings.find(
          (w) => w.title === triple.subject || w.title === triple.object
        );

        if (matchedChar) referencedCharacterIds.add(matchedChar.id);
        if (matchedWorld) referencedWorldIds.add(matchedWorld.id);
      });
    }
  });

  // 检查角色孤立节点
  characters.forEach((char) => {
    if (!referencedCharacterIds.has(char.id)) {
      // 检查是否有任何Echo提到了这个角色
      const isMentioned = echoes.some(
        (echo) =>
          echo.targetName === char.name ||
          echo.description?.includes(char.name) ||
          echo.triples?.some((t) => t.subject === char.name || t.object === char.name)
      );

      if (!isMentioned) {
        issues.push({
          type: 'ORPHAN_NODE',
          severity: 'MEDIUM',
          entityName: char.name,
          description: '无任何关联关系',
          details: `角色 [${char.name}] 尚未参与任何剧情关系`,
          entityId: char.id,
        });
      }
    }
  });

  // 检查世界设定孤立节点
  worldSettings.forEach((setting) => {
    if (!referencedWorldIds.has(setting.id)) {
      const isMentioned = echoes.some(
        (echo) =>
          echo.targetName === setting.title ||
          echo.description?.includes(setting.title) ||
          echo.triples?.some((t) => t.subject === setting.title || t.object === setting.title)
      );

      if (!isMentioned) {
        issues.push({
          type: 'ORPHAN_NODE',
          severity: 'LOW',
          entityName: setting.title,
          description: '提及但未定义完整关系',
          details: `世界设定 [${setting.title}] 尚未被任何剧情引用`,
          entityId: setting.id,
        });
      }
    }
  });

  return issues;
};

/**
 * 检测矛盾关系（同一关系的冲突状态）
 */
const detectContradictions = (echoes: Echo[], chapters: Chapter[]): IntegrityIssue[] => {
  const issues: IntegrityIssue[] = [];

  // 构建关系映射表：实体 -> 关系类型 -> 状态列表
  const relationMap = new Map<
    string,
    Map<string, { status: string; chapter: string; echo: Echo }[]>
  >();

  echoes.forEach((echo) => {
    if (!echo.triples) return;

    echo.triples.forEach((triple) => {
      const key = `${triple.subject}-${triple.object}`;
      const relation = triple.relation;

      if (!relationMap.has(key)) {
        relationMap.set(key, new Map());
      }

      const entityRelations = relationMap.get(key)!;
      if (!entityRelations.has(relation)) {
        entityRelations.set(relation, []);
      }

      // 查找关联章节
      const chapter = chapters.find((c) => c.id === echo.targetId);
      const chapterInfo = chapter ? chapter.title : '未知章节';

      entityRelations.get(relation)!.push({
        status: echo.status,
        chapter: chapterInfo,
        echo,
      });
    });
  });

  // 检查矛盾关系
  relationMap.forEach((relations, entityKey) => {
    // 检查是否有对立关系（如盟友 vs 敌对）
    const contradictoryPairs = [
      ['盟友', '敌对'],
      ['朋友', '敌人'],
      ['爱慕', '仇恨'],
      ['信任', '怀疑'],
      ['合作', '竞争'],
    ];

    contradictoryPairs.forEach(([rel1, rel2]) => {
      const hasRel1 = relations.has(rel1);
      const hasRel2 = relations.has(rel2);

      if (hasRel1 && hasRel2) {
        const data1 = relations.get(rel1)!;
        const data2 = relations.get(rel2)!;

        // 只有两个关系都被采纳时才报告矛盾
        const accepted1 = data1.filter(
          (d) => d.status === 'ACCEPTED' || d.status === 'AUTO_ACCEPTED'
        );
        const accepted2 = data2.filter(
          (d) => d.status === 'ACCEPTED' || d.status === 'AUTO_ACCEPTED'
        );

        if (accepted1.length > 0 && accepted2.length > 0) {
          const [subject, object] = entityKey.split('-');
          issues.push({
            type: 'CONTRADICTION',
            severity: 'HIGH',
            entityName: subject,
            description: `同时标记为 [${rel1}] 和 [${rel2}]`,
            details: `关系对象: ${object}`,
            chapterInfo: `${accepted1[0].chapter} vs ${accepted2[0].chapter}`,
          });
        }
      }
    });
  });

  return issues;
};

/**
 * 检测待确认Echo
 */
const detectPendingEchoes = (echoes: Echo[]): IntegrityIssue[] => {
  const issues: IntegrityIssue[] = [];

  const pendingEchoes = echoes.filter((echo) => echo.status === 'PENDING');

  pendingEchoes.forEach((echo) => {
    issues.push({
      type: 'PENDING_ECHO',
      severity: 'LOW',
      entityName: echo.targetName,
      description: `待确认的${echo.type === 'CHARACTER' ? '角色' : '世界设定'}变更`,
      details: echo.description,
      entityId: echo.id,
    });
  });

  return issues;
};

/**
 * 计算健康度评分
 */
const calculateHealthScore = (issues: IntegrityIssue[]): number => {
  let score = 100;

  issues.forEach((issue) => {
    const penalty = HEALTH_SCORE_PENALTY[issue.type] || 0;
    score += penalty;
  });

  return Math.max(0, Math.min(100, score));
};

/**
 * 计算统计数据
 */
const calculateStats = (echoes: Echo[]): IntegrityStats => {
  const stats: IntegrityStats = {
    total: echoes.length,
    autoAccepted: 0,
    manualAccepted: 0,
    rejected: 0,
    pending: 0,
  };

  echoes.forEach((echo) => {
    switch (echo.status) {
      case 'AUTO_ACCEPTED':
        stats.autoAccepted++;
        break;
      case 'ACCEPTED':
        stats.manualAccepted++;
        break;
      case 'REJECTED':
        stats.rejected++;
        break;
      case 'PENDING':
        stats.pending++;
        break;
    }
  });

  return stats;
};

/**
 * 完整性检查主函数
 */
export const checkIntegrity = (
  echoes: Echo[],
  characters: Character[],
  worldSettings: WorldSetting[],
  chapters: Chapter[] = []
): IntegrityReport => {
  // 检测各类问题
  const orphanIssues = detectOrphanNodes(echoes, characters, worldSettings);
  const contradictionIssues = detectContradictions(echoes, chapters);
  const pendingIssues = detectPendingEchoes(echoes);

  // 合并所有问题并按严重程度排序
  const allIssues: IntegrityIssue[] = [
    ...orphanIssues,
    ...contradictionIssues,
    ...pendingIssues,
  ].sort((a, b) => {
    const severityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });

  // 计算统计数据
  const stats = calculateStats(echoes);

  // 计算健康度
  const healthScore = calculateHealthScore(allIssues);

  return {
    issues: allIssues,
    stats,
    healthScore,
  };
};

/**
 * 获取健康度对应的颜色配置
 */
export const getHealthScoreConfig = (
  score: number
): {
  color: string;
  bgClass: string;
  textClass: string;
  label: string;
} => {
  if (score >= 90) {
    return {
      color: '#10b981',
      bgClass: 'bg-emerald-500',
      textClass: 'text-emerald-400',
      label: '优秀',
    };
  } else if (score >= 70) {
    return {
      color: '#22c55e',
      bgClass: 'bg-green-500',
      textClass: 'text-green-400',
      label: '良好',
    };
  } else if (score >= 50) {
    return {
      color: '#eab308',
      bgClass: 'bg-yellow-500',
      textClass: 'text-yellow-400',
      label: '一般',
    };
  } else if (score >= 30) {
    return {
      color: '#f97316',
      bgClass: 'bg-orange-500',
      textClass: 'text-orange-400',
      label: '较差',
    };
  } else {
    return {
      color: '#ef4444',
      bgClass: 'bg-red-500',
      textClass: 'text-red-400',
      label: '危险',
    };
  }
};

/**
 * 获取问题严重程度对应的颜色配置
 */
export const getSeverityConfig = (
  severity: IntegrityIssue['severity']
): {
  icon: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
} => {
  switch (severity) {
    case 'HIGH':
      return {
        icon: '🔴',
        bgClass: 'bg-rose-900/20',
        textClass: 'text-rose-400',
        borderClass: 'border-rose-500/50',
      };
    case 'MEDIUM':
      return {
        icon: '🟡',
        bgClass: 'bg-amber-900/20',
        textClass: 'text-amber-400',
        borderClass: 'border-amber-500/50',
      };
    case 'LOW':
    default:
      return {
        icon: '🟢',
        bgClass: 'bg-emerald-900/20',
        textClass: 'text-emerald-400',
        borderClass: 'border-emerald-500/50',
      };
  }
};

/**
 * 获取问题类型标签
 */
export const getIssueTypeLabel = (type: IntegrityIssue['type']): string => {
  switch (type) {
    case 'ORPHAN_NODE':
      return '孤立节点';
    case 'CONTRADICTION':
      return '矛盾关系';
    case 'PENDING_ECHO':
      return '待确认Echo';
    default:
      return '未知问题';
  }
};

/**
 * 导出报告为JSON格式
 */
export const exportReportAsJSON = (report: IntegrityReport): string => {
  return JSON.stringify(report, null, 2);
};

/**
 * 导出报告为Markdown格式
 */
export const exportReportAsMarkdown = (report: IntegrityReport): string => {
  const lines: string[] = [
    '# 关系完整性报告',
    '',
    `**生成时间**: ${new Date().toLocaleString('zh-CN')}`,
    '',
    '## 健康度评分',
    '',
    `**${report.healthScore}/100**`,
    '',
    '## 统计摘要',
    '',
    `| 指标 | 数量 | 占比 |`,
    `|------|------|------|`,
    `| 总Echo数 | ${report.stats.total} | 100% |`,
    `| 高置信度自动采纳 | ${report.stats.autoAccepted} | ${report.stats.total > 0 ? Math.round((report.stats.autoAccepted / report.stats.total) * 100) : 0}% |`,
    `| 人工审核采纳 | ${report.stats.manualAccepted} | ${report.stats.total > 0 ? Math.round((report.stats.manualAccepted / report.stats.total) * 100) : 0}% |`,
    `| 人工拒绝 | ${report.stats.rejected} | ${report.stats.total > 0 ? Math.round((report.stats.rejected / report.stats.total) * 100) : 0}% |`,
    `| 待处理 | ${report.stats.pending} | ${report.stats.total > 0 ? Math.round((report.stats.pending / report.stats.total) * 100) : 0}% |`,
    '',
    '## 问题列表',
    '',
  ];

  if (report.issues.length === 0) {
    lines.push('*暂无问题*');
  } else {
    // 按类型分组
    const groupedIssues = new Map<string, IntegrityIssue[]>();
    report.issues.forEach((issue) => {
      const type = issue.type;
      if (!groupedIssues.has(type)) {
        groupedIssues.set(type, []);
      }
      groupedIssues.get(type)!.push(issue);
    });

    groupedIssues.forEach((issues, type) => {
      const label = getIssueTypeLabel(type as IntegrityIssue['type']);
      lines.push(`### ${label} (${issues.length})`);
      lines.push('');

      issues.forEach((issue) => {
        lines.push(`- **[${issue.entityName}]** ${issue.description}`);
        if (issue.details) {
          lines.push(`  - ${issue.details}`);
        }
        if (issue.chapterInfo) {
          lines.push(`  - 章节: ${issue.chapterInfo}`);
        }
      });
      lines.push('');
    });
  }

  return lines.join('\n');
};
