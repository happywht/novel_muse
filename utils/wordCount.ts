/**
 * 字数统计工具函数
 * 针对中文小说场景优化
 */

/**
 * 计算文本的字数（中文字符按1个字计算，英文按单词计算）
 * @param text 要统计的文本
 * @returns 字数
 */
export function countWords(text: string): number {
  if (!text || text.trim().length === 0) return 0;

  // 移除空白字符用于统计
  const trimmedText = text.trim();
  if (trimmedText.length === 0) return 0;

  let wordCount = 0;
  let englishWordBuffer = '';

  for (const char of trimmedText) {
    // 判断是否为中文字符（包括中文标点）
    if (/[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]/.test(char)) {
      // 如果有未处理的英文单词，先计入
      if (englishWordBuffer.trim().length > 0) {
        wordCount += 1;
        englishWordBuffer = '';
      }
      wordCount += 1;
    } else if (/[a-zA-Z0-9]/.test(char)) {
      // 英文字母或数字，累积到缓冲区
      englishWordBuffer += char;
    } else {
      // 其他字符（空格、标点等）
      // 如果有未处理的英文单词，先计入
      if (englishWordBuffer.trim().length > 0) {
        wordCount += 1;
        englishWordBuffer = '';
      }
    }
  }

  // 处理最后的英文单词
  if (englishWordBuffer.trim().length > 0) {
    wordCount += 1;
  }

  return wordCount;
}

/**
 * 计算文本的字符数（不含空白）
 * @param text 要统计的文本
 * @returns 字符数
 */
export function countCharacters(text: string): number {
  if (!text) return 0;
  return text.replace(/\s/g, '').length;
}

/**
 * 格式化字数显示
 * @param count 字数
 * @returns 格式化后的字符串
 */
export function formatWordCount(count: number): string {
  if (count >= 10000) {
    return `${(count / 10000).toFixed(1)}万字`;
  }
  return `${count.toLocaleString()}字`;
}

/**
 * 计算字数进度百分比
 * @param current 当前字数
 * @param target 目标字数
 * @returns 百分比（0-100）
 */
export function calculateProgress(current: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(100, Math.round((current / target) * 100));
}

/**
 * 获取进度状态颜色类名
 * @param progress 进度百分比
 * @returns Tailwind CSS 类名
 */
export function getProgressColor(progress: number): string {
  if (progress >= 100) return 'bg-emerald-500';
  if (progress >= 75) return 'bg-sky-500';
  if (progress >= 50) return 'bg-amber-500';
  if (progress >= 25) return 'bg-orange-500';
  return 'bg-slate-500';
}

/**
 * 获取进度状态文本
 * @param progress 进度百分比
 * @returns 状态文本
 */
export function getProgressStatus(progress: number): string {
  if (progress >= 100) return '已完成';
  if (progress >= 75) return '接近完成';
  if (progress >= 50) return '进行中';
  if (progress >= 25) return '起步中';
  return '待开始';
}

/**
 * 预设字数目标选项
 */
export const WORD_COUNT_TARGETS = [
  { value: 2000, label: '2,000字（短章）' },
  { value: 3000, label: '3,000字（标准）' },
  { value: 4000, label: '4,000字（中章）' },
  { value: 5000, label: '5,000字（长章）' },
  { value: 8000, label: '8,000字（大章）' },
  { value: 10000, label: '10,000字（超大章）' },
] as const;

/**
 * 默认目标字数
 */
export const DEFAULT_TARGET_WORD_COUNT = 3000;
