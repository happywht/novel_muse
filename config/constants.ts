/**
 * Muse UI and Business Logic Constants
 * Centralized configuration for UI components, creative settings, and business logic
 */

// ============================================================
// UI Configuration
// ============================================================

export const UI_CONFIG = {
  // Toast notifications
  TOAST_DURATION: 4000,
  TOAST_EXIT_ANIMATION_DURATION: 300,
  TOAST_POSITION: 'top-right' as const,

  // Debounce delays (ms)
  DEBOUNCE_DELAY: 300,
  SEARCH_DEBOUNCE: 500,
  SAVE_DEBOUNCE: 1000,

  // Virtual scrolling
  VIRTUAL_LIST_OVERSCAN: 5,
  DEFAULT_LIST_HEIGHT: 400,
  VIRTUAL_LIST_ITEM_HEIGHT: 80,

  // Text truncation lengths
  DESCRIPTION_TRUNCATE_LENGTH: 150,
  SUMMARY_MAX_LENGTH: 500,
  IMAGE_PROMPT_DESCRIPTION_LENGTH: 200,
  CONTEXT_TRUNCATE_LENGTH: {
    CHARACTER_DESCRIPTION: 200,
    WORLD_SETTING_CONTENT: 300,
    LOCATION_CONTENT: 400,
    HELPER_CONTEXT: 150,
    GRAPH_ENTITY: 300,
    GRAPH_ENTITY_MINI: 150,
  },

  // Pagination
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,

  // Layout heights - Virtual scroll height calculations
  HEADER_HEIGHT: 140,
  PLOT_CARD_HEIGHT: 120,
  VIRTUAL_LIST_BOTTOM_OFFSET: 250,
  WORLD_LIST_HEIGHT_OFFSET: 450,
  WORLD_LIST_ITEM_HEIGHT: 60,
  CHARACTER_LIST_HEIGHT_OFFSET: 400,
  MANUSCRIPT_LIST_HEIGHT_OFFSET: 200,
} as const;

// ============================================================
// Creative Settings Configuration
// ============================================================

export const CREATIVE_CONFIG = {
  // Creativity range
  MIN_CREATIVITY: 0.1,
  MAX_CREATIVITY: 1.0,
  DEFAULT_CREATIVITY: 0.7,

  // Style constraints
  MAX_STYLE_TAGS: 5,

  // Target word counts by profile
  DEFAULT_TARGET_WORDS: {
    WEB_NOVEL: 5000,
    LITERARY: 3000,
  },

  // Default target word count
  DEFAULT_TARGET_WORD_COUNT: 3000,

  // Context lengths
  PREVIOUS_CONTEXT_LENGTH: 2000,
  PLOT_BEAT_TITLE_LENGTH: 20,
  CHAPTER_TITLE_LENGTH: 30,
  MAX_PROMPT_CONTENT_LENGTH: 10000,
  MAX_AUDIT_CONTENT_LENGTH: 5000,
} as const;

// ============================================================
// Relationship Configuration
// ============================================================

export const RELATIONSHIP_CONFIG = {
  // Weight range
  DEFAULT_WEIGHT: 50,
  MIN_WEIGHT: 0,
  MAX_WEIGHT: 100,

  // Weight thresholds for visualization
  HIGH_WEIGHT_THRESHOLD: 70,
  MEDIUM_WEIGHT_THRESHOLD: 40,
} as const;

// ============================================================
// Plot Configuration
// ============================================================

export const PLOT_CONFIG = {
  // History limits
  MAX_HISTORY_ITEMS: 10,
  RECENT_CHAPTERS_CONTEXT: 3,

  // Echo confidence
  AUTO_APPLY_THRESHOLD: 0.8,
  RETENTION_DAYS: 30,
} as const;

// ============================================================
// Graph Configuration
// ============================================================

export const GRAPH_CONFIG = {
  // Sync settings
  SYNC_DEBOUNCE: 2000,

  // Auto-apply threshold
  AUTO_APPLY_THRESHOLD: 0.8,
  RETENTION_DAYS: 30,

  // Node label truncation
  NODE_LABEL_MAX_LENGTH: 8,

  // Force simulation parameters
  FORCE_SIMULATION: {
    ALPHA: 0.1,
    REPULSION: 3000,
    ATTRACTION: 0.002,
    DAMPING: 0.95,
    CENTER_GRAVITY: 0.005,
    MIN_VELOCITY: 0.01,
    IDEAL_EDGE_LENGTH: 120,
  },

  // Node radius by type
  NODE_RADIUS: {
    CHARACTER: 28,
    EVENT: 20,
    DEFAULT: 24,
  },

  // Zoom limits
  ZOOM_MIN: 0.3,
  ZOOM_MAX: 3,
  ZOOM_STEP: 0.2,
} as const;

// ============================================================
// Graph Node Colors
// ============================================================

export const GRAPH_NODE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  Character: { bg: '#8b5cf6', border: '#a78bfa', text: '#f5f3ff' }, // Purple
  WorldSetting: { bg: '#3b82f6', border: '#60a5fa', text: '#eff6ff' }, // Blue
  Event: { bg: '#f59e0b', border: '#fbbf24', text: '#fffbeb' }, // Amber
  Echo: { bg: '#06b6d4', border: '#22d3ee', text: '#ecfeff' }, // Cyan
  Chapter: { bg: '#10b981', border: '#34d399', text: '#f0fdf4' }, // Emerald
  PlotNode: { bg: '#ec4899', border: '#f472b6', text: '#fdf2f8' }, // Pink
} as const;

// Graph edge color for new edge creation
export const GRAPH_NEW_EDGE_COLOR = '#10b981';

// ============================================================
// Batch Operations Configuration
// ============================================================

export const BATCH_OPERATION_CONFIG = {
  // History retention (days)
  HISTORY_RETENTION_DAYS: 7,

  // Maximum history items to keep
  MAX_HISTORY_ITEMS: 50,
} as const;

// ============================================================
// Type Labels (Internationalization)
// ============================================================

export const GRAPH_LAYER_LABELS: Record<string, string> = {
  Character: '角色',
  WorldSetting: '设定',
  Chapter: '大纲章节',
  Event: '时间线',
  Echo: '预测回响',
  PlotNode: '情节卡片',
} as const;

export const GRAPH_RELATIONSHIP_LABELS: Record<string, string> = {
  RELATED_TO: '关联',
  ENEMY_OF: '仇敌',
  LOVES: '爱慕',
  ALLY_OF: '盟友',
  MENTORS: '师徒',
  KIN_OF: '血缘',
  LOCATED_IN: '位于',
  INVOLVED_IN: '参与',
  INVOLVES: '包含/出场',
  HAS_ECHO: '回响',
  CAUSED: '导致',
  PRECEDES: '前置于',
  POV_IS: '视角角色',
} as const;

// ============================================================
// API Key Display Configuration
// ============================================================

export const API_KEY_CONFIG = {
  PREFIX_VISIBLE_LENGTH: 6,
  SUFFIX_VISIBLE_LENGTH: 4,
} as const;
