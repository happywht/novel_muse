/**
 * AI-tell detection — pure rule-based analysis (no LLM, no external dependencies).
 *
 * Detects structural patterns common in AI-generated Chinese text:
 * 1. Paragraph length uniformity (low coefficient of variation)
 * 2. Hedge/filler word density
 * 3. Formulaic transition word repetition
 * 4. List-like structure (consecutive same-prefix sentences)
 */

export interface AITellIssue {
  readonly severity: 'warning' | 'info';
  readonly category: string;
  readonly description: string;
  readonly suggestion: string;
}

export interface AITellResult {
  readonly issues: ReadonlyArray<AITellIssue>;
  readonly aiScore: number; // 0–100 composite risk score
}

const HEDGE_WORDS: ReadonlyArray<string> = [
  '似乎',
  '可能',
  '或许',
  '大概',
  '某种程度上',
  '一定程度上',
  '在某种意义上',
];

const TRANSITION_WORDS: ReadonlyArray<string> = [
  '然而',
  '不过',
  '与此同时',
  '另一方面',
  '尽管如此',
  '话虽如此',
  '但值得注意的是',
];

function countOccurrences(
  text: string,
  words: ReadonlyArray<string>
): ReadonlyArray<{ word: string; count: number }> {
  return words
    .map((word) => {
      const matches = text.match(new RegExp(word, 'g'));
      return { word, count: matches?.length ?? 0 };
    })
    .filter((r) => r.count > 0);
}

function checkParagraphUniformity(content: string): AITellIssue | null {
  const paragraphs = content
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  if (paragraphs.length < 3) return null;

  const lengths = paragraphs.map((p) => p.length);
  const avg = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  if (avg === 0) return null;

  const variance = lengths.reduce((sum, l) => sum + (l - avg) ** 2, 0) / lengths.length;
  const cv = Math.sqrt(variance) / avg;

  if (cv < 0.15) {
    return {
      severity: 'warning',
      category: '段落等长',
      description: `段落长度变异系数仅${cv.toFixed(3)}（阈值<0.15），段落长度过于均匀，呈现AI生成特征`,
      suggestion: '增加段落长度差异：短段落用于节奏加速或冲击，长段落用于沉浸描写',
    };
  }
  return null;
}

function checkHedgeDensity(content: string): AITellIssue | null {
  const totalChars = content.length;
  if (totalChars === 0) return null;

  const hedgeCount = countOccurrences(content, HEDGE_WORDS).reduce((s, r) => s + r.count, 0);
  const density = hedgeCount / (totalChars / 1000);

  if (density > 3) {
    return {
      severity: 'warning',
      category: '套话密度',
      description: `套话词（似乎/可能/或许等）密度为${density.toFixed(1)}次/千字（阈值>3），语气过于模糊犹豫`,
      suggestion: '用确定性叙述替代模糊表达：去掉「似乎」直接描述状态，用具体细节替代「可能」',
    };
  }
  return null;
}

function checkTransitionRepetition(content: string): AITellIssue | null {
  const counts = countOccurrences(content, TRANSITION_WORDS);
  const repeated = counts.filter((r) => r.count >= 3);

  if (repeated.length === 0) return null;

  const detail = repeated.map((r) => `"${r.word}"×${r.count}`).join('、');
  return {
    severity: 'warning',
    category: '公式化转折',
    description: `转折词重复使用：${detail}。同一转折模式≥3次暴露AI生成痕迹`,
    suggestion: '用情节自然转折替代转折词，或换用不同的过渡手法（动作切入、时间跳跃、视角切换）',
  };
}

function checkListStructure(content: string): AITellIssue | null {
  const sentences = content
    .split(/[。！？\n]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 2);

  if (sentences.length < 3) return null;

  let consecutive = 1;
  let maxConsecutive = 1;

  for (let i = 1; i < sentences.length; i++) {
    const prevPrefix = sentences[i - 1]!.slice(0, 2);
    const currPrefix = sentences[i]!.slice(0, 2);
    if (prevPrefix === currPrefix) {
      consecutive++;
      if (consecutive > maxConsecutive) maxConsecutive = consecutive;
    } else {
      consecutive = 1;
    }
  }

  if (maxConsecutive >= 3) {
    return {
      severity: 'info',
      category: '列表式结构',
      description: `检测到${maxConsecutive}句连续以相同开头的句子，呈现列表式AI生成结构`,
      suggestion: '变换句式开头：用不同主语、时间词、动作词开头，打破列表感',
    };
  }
  return null;
}

function computeScore(issues: ReadonlyArray<AITellIssue>): number {
  const WEIGHTS: Record<string, number> = {
    段落等长: 30,
    套话密度: 25,
    公式化转折: 25,
    列表式结构: 20,
  };

  let score = 0;
  for (const issue of issues) {
    const weight = WEIGHTS[issue.category] ?? 15;
    score += issue.severity === 'warning' ? weight : weight * 0.5;
  }
  return Math.min(100, Math.round(score));
}

/**
 * Analyze text for structural AI-tell patterns.
 * Pure function, zero LLM cost, no side effects.
 */
export function analyzeAITells(content: string): AITellResult {
  const issues: AITellIssue[] = [
    checkParagraphUniformity(content),
    checkHedgeDensity(content),
    checkTransitionRepetition(content),
    checkListStructure(content),
  ].filter((issue): issue is AITellIssue => issue !== null);

  return {
    issues,
    aiScore: computeScore(issues),
  };
}
