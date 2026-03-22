/**
 * Style fingerprint analysis — pure text analysis (no LLM, no external dependencies).
 * Extracts statistical features from reference text to build a StyleProfile.
 */

export interface StyleProfile {
  readonly avgSentenceLength: number;
  readonly sentenceLengthStdDev: number;
  readonly avgParagraphLength: number;
  readonly paragraphLengthRange: { readonly min: number; readonly max: number };
  readonly vocabularyDiversity: number; // TTR (Type-Token Ratio)
  readonly topPatterns: ReadonlyArray<string>;
  readonly rhetoricalFeatures: ReadonlyArray<string>;
  readonly sourceName?: string;
  readonly analyzedAt?: string;
}

const RHETORICAL_PATTERNS: ReadonlyArray<{ readonly name: string; readonly regex: RegExp }> = [
  { name: '比喻', regex: /[像如仿佛似](?:是|同|一般|一样)/g },
  { name: '排比', regex: /[，。；]([^，。；]{2,6})[，。；]\1/g },
  { name: '反问', regex: /难道|怎么可能|岂不是|何尝不/g },
  { name: '夸张', regex: /天崩地裂|惊天动地|翻天覆地|震耳欲聋/g },
  { name: '拟人', regex: /[风雨雪月花树草石](?:在|像|仿佛).*?(?:笑|哭|叹|呻|吟|怒|舞)/g },
  { name: '短句节奏', regex: /[。！？][^。！？]{1,8}[。！？]/g },
];

function mean(values: ReadonlyArray<number>): number {
  return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
}

function stdDev(values: ReadonlyArray<number>, m: number): number {
  return values.length > 1
    ? Math.sqrt(values.reduce((sum, v) => sum + (v - m) ** 2, 0) / values.length)
    : 0;
}

/**
 * Analyze a reference text and extract its style fingerprint.
 * Pure function, zero LLM cost, no side effects.
 */
export function analyzeStyle(text: string, sourceName?: string): StyleProfile {
  const sentences = text
    .split(/[。！？\n]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  const sentenceLengths = sentences.map((s) => s.length);
  const avgSentenceLength = mean(sentenceLengths);
  const sentenceLengthStdDev = stdDev(sentenceLengths, avgSentenceLength);

  const paragraphLengths = paragraphs.map((p) => p.length);
  const avgParagraphLength = mean(paragraphLengths);
  const minParagraph = paragraphLengths.length > 0 ? Math.min(...paragraphLengths) : 0;
  const maxParagraph = paragraphLengths.length > 0 ? Math.max(...paragraphLengths) : 0;

  // Character-level TTR for Chinese text
  const cleanChars = text.replace(/[\s\n\r，。！？、：；""''（）【】《》\d]/g, '');
  const vocabularyDiversity = cleanChars.length > 0
    ? new Set(cleanChars).size / cleanChars.length
    : 0;

  // Top sentence-opening patterns (first 2 chars, min 3 occurrences)
  const openingCounts: Record<string, number> = {};
  for (const s of sentences) {
    if (s.length >= 2) {
      const key = s.slice(0, 2);
      openingCounts[key] = (openingCounts[key] ?? 0) + 1;
    }
  }
  const topPatterns = Object.entries(openingCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .filter(([, count]) => count >= 3)
    .map(([pattern, count]) => `${pattern}...(${count}次)`);

  const rhetoricalFeatures: string[] = [];
  for (const { name, regex } of RHETORICAL_PATTERNS) {
    const matches = text.match(regex);
    if (matches && matches.length >= 2) {
      rhetoricalFeatures.push(`${name}(${matches.length}处)`);
    }
  }

  return {
    avgSentenceLength: Math.round(avgSentenceLength * 10) / 10,
    sentenceLengthStdDev: Math.round(sentenceLengthStdDev * 10) / 10,
    avgParagraphLength: Math.round(avgParagraphLength),
    paragraphLengthRange: { min: minParagraph, max: maxParagraph },
    vocabularyDiversity: Math.round(vocabularyDiversity * 1000) / 1000,
    topPatterns,
    rhetoricalFeatures,
    sourceName,
    analyzedAt: new Date().toISOString(),
  };
}

/**
 * Format a StyleProfile into a human-readable summary.
 */
export function formatStyleProfile(profile: StyleProfile): string {
  const lines: string[] = [];
  lines.push(`━━ 风格指纹分析 ━━`);
  if (profile.sourceName) lines.push(`来源：${profile.sourceName}`);
  if (profile.analyzedAt) lines.push(`分析时间：${profile.analyzedAt}`);
  lines.push('');
  lines.push(`【句式特征】`);
  lines.push(`  平均句长：${profile.avgSentenceLength} 字`);
  lines.push(`  句长标准差：${profile.sentenceLengthStdDev}`);
  lines.push('');
  lines.push(`【段落特征】`);
  lines.push(`  平均段长：${profile.avgParagraphLength} 字`);
  lines.push(`  段长范围：${profile.paragraphLengthRange.min}–${profile.paragraphLengthRange.max} 字`);
  lines.push('');
  lines.push(`【词汇多样性】`);
  lines.push(`  TTR（类符比）：${(profile.vocabularyDiversity * 100).toFixed(1)}%`);

  if (profile.topPatterns.length > 0) {
    lines.push('');
    lines.push(`【高频句首模式】`);
    for (const pattern of profile.topPatterns) lines.push(`  ${pattern}`);
  }
  if (profile.rhetoricalFeatures.length > 0) {
    lines.push('');
    lines.push(`【修辞手法】`);
    for (const feature of profile.rhetoricalFeatures) lines.push(`  ${feature}`);
  }
  return lines.join('\n');
}
