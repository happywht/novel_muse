/**
 * Zod Schemas for AI Output Validation
 * 
 * This file defines strict schemas for all structured AI outputs.
 * Every JSON.parse() in geminiService.ts MUST go through safeParseAiJson()
 * to ensure graceful degradation when AI produces malformed data.
 */

import { z } from 'zod';

// ============================================================
// Core Utility: Safe AI JSON Parser
// ============================================================

/**
 * Parses a raw JSON string from AI and validates it against a Zod schema.
 * Returns the validated data or null on failure.
 * 
 * @param rawText - The raw text response from the AI model
 * @param schema - A Zod schema to validate against
 * @param label - A human-readable label for logging purposes
 * @returns Validated data of type T, or null if parsing/validation fails
 */
export function safeParseAiJson<T>(
    rawText: string | undefined,
    schema: z.ZodSchema<T>,
    label: string = 'AI Response'
): T | null {
    if (!rawText) {
        console.warn(`[Zod] ${label}: Received empty response from AI.`);
        return null;
    }

    // Step 1: Attempt to strip potential markdown code fences
    let cleanedText = rawText.trim();
    if (cleanedText.startsWith('```')) {
        // Remove ```json or ``` prefix and trailing ```
        cleanedText = cleanedText
            .replace(/^```(?:json)?\s*\n?/i, '')
            .replace(/\n?\s*```$/i, '')
            .trim();
    }

    // Step 2: Attempt JSON.parse
    let rawObj: unknown;
    try {
        rawObj = JSON.parse(cleanedText);
    } catch (jsonError) {
        console.error(`[Zod] ${label}: JSON.parse failed. Raw text (first 500 chars):`, cleanedText.substring(0, 500));
        return null;
    }

    // Step 3: Validate with Zod (safeParse never throws)
    const result = schema.safeParse(rawObj);
    if (result.success) {
        return result.data;
    } else {
        console.warn(`[Zod] ${label}: Validation failed. Issues:`, result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`));
        console.warn(`[Zod] ${label}: Raw object (keys):`, typeof rawObj === 'object' && rawObj !== null ? Object.keys(rawObj) : typeof rawObj);
        return null;
    }
}

// ============================================================
// Schema Definitions
// ============================================================

// --- Characters (batchGenerateCharacters) ---
export const AiCharacterSchema = z.object({
    name: z.string().min(1, '角色名不能为空'),
    role: z.string().default('未知角色'),
    archetype: z.string().default(''),
    description: z.string().default(''),
    relationships: z.string().optional(),
});

export const AiCharacterArraySchema = z.array(AiCharacterSchema);

// --- World Settings (batchGenerateWorldSettingsByCategory) ---
export const AiWorldSettingSchema = z.object({
    title: z.string().min(1, '设定标题不能为空'),
    category: z.enum(['Geography', 'Magic/Tech', 'Society', 'History', 'Other']).default('Other'),
    content: z.string().default(''),
});

export const AiWorldSettingArraySchema = z.array(AiWorldSettingSchema);

// --- State Changes (analyzeStateChanges, deduceWorldConsequences) ---
export const AiStateChangeSchema = z.object({
    targetName: z.string().min(1),
    targetType: z.enum(['CHARACTER', 'WORLD']).default('CHARACTER'),
    suggestedUpdate: z.string().default(''),
    reason: z.string().default(''),
});

export const AiStateChangeArraySchema = z.array(AiStateChangeSchema);

// --- Echoes (extractEchoesFromText) ---
export const AiEchoSchema = z.object({
    targetName: z.string().min(1),
    targetType: z.enum(['CHARACTER', 'WORLD']).default('CHARACTER'),
    description: z.string().default(''),
    reason: z.string().default(''),
});

export const AiEchoArraySchema = z.array(AiEchoSchema);

// --- Plot Rhythm (analyzePlotRhythm) ---
export const AiPlotRhythmSchema = z.object({
    beat: z.string().min(1),
    tension: z.number().min(0).max(100).default(50),
    description: z.string().default(''),
});

export const AiPlotRhythmArraySchema = z.array(AiPlotRhythmSchema);
