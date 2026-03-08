

export type BeatTag = 'INCITING_INCIDENT' | 'PLOT_POINT_1' | 'MIDPOINT' | 'PLOT_POINT_2' | 'CLIMAX' | 'RESOLUTION' | 'OTHER' | null;

export interface PlotNode {
  id: string;
  title: string;
  content: string; // The beat/summary
  order: number;
  beatTag?: BeatTag; // NEW: Narrative milestone tag
  relatedCharacters?: string[]; // IDs
  relatedLocations?: string[]; // IDs
}

export interface Message {
  role: 'user' | 'model';
  content: string;
  type?: 'text' | 'image';
  imageUrl?: string;
  timestamp: number;
}

export interface Character {
  id: string;
  name: string;
  role: string; // Protagonist, Antagonist, Support
  archetype: string;
  description: string;
  relationships?: string; // New field for interpersonal dynamics
  imageUrl?: string;
}

export interface WorldSetting {
  id: string;
  category: 'Geography' | 'Magic/Tech' | 'Society' | 'History' | 'Other';
  title: string;
  content: string;
}

export interface PlotVersion {
  id: string;
  timestamp: number;
  content: string;
  note: string; // e.g., "Initial Generation", "Darker Tone Rewrite"
}

export interface ChapterBeat {
  id: string;
  type: 'CONTENT' | 'ACTION' | 'DIALOGUE' | 'TWIST';
  description: string;
  isCompleted: boolean;
}

export interface Draft {
  id: string;
  title: string;
  content: string;
  relatedPlotPoint?: string;
  lastModified: number;
  branchId?: string; // NEW Task 2.2: Identify which branch this draft belongs to
}

export interface Chapter {
  id: string;
  title: string;
  content: string;
  summary?: string;     // NEW: For chapter-level outlining
  expectedPOV?: string; // NEW: Track perspective
  plotNodeId?: string;  // NEW: Link back to a PlotNode
  order: number;
  lastModified: number;
  beats?: ChapterBeat[]; // NEW: For granular scene planning
}

export type PromptProfile = 'LITERARY' | 'WEB_NOVEL';

export interface CreativeSettings {
  tone: string;      // e.g., "Dark", "Humorous", "Epic"
  style: string;     // e.g., "Descriptive", "Concise", "Poetic"
  creativity: number; // 0.0 to 1.0 (Temperature)
  targetAudience: string;
  promptProfile?: PromptProfile; // Choice of prompt pack
  styleTags?: string[]; // NEW: Micro tag selectors
  referenceText?: string; // NEW: Few-Shot reference text
}

export interface WorldGenConfig {
  detailLevel: 'Brief' | 'Standard' | 'Detailed'; // 简短, 标准, 详尽
  focus: 'Sensory' | 'Logic' | 'History' | 'Balanced'; // 感官, 逻辑, 历史, 平衡
}

export enum AppSection {
  LOBBY = 'LOBBY',
  DASHBOARD = 'DASHBOARD',
  CREATIVE_COMPASS = 'CREATIVE_COMPASS', // NEW: Extracted from Dashboard
  WORLD = 'WORLD',
  CHARACTERS = 'CHARACTERS',
  PLOT = 'PLOT',
  OUTLINER = 'OUTLINER',
  DRAFTING = 'DRAFTING',
  ECHOES = 'ECHOES',
  GRAPH = 'GRAPH'
}

/**
 * Phase 4/5: Structural data for Knowledge Graph
 */
export interface KnowledgeTriple {
  subject: string;
  relation: string;
  object: string;
  weight?: number;      // 0-100: Intensity of relationship
  trajectory?: string;  // rising, falling, stable
  isForeshadowing?: boolean; // NEW Task 2.1: Whether this is a narrative hook
  status?: 'OPEN' | 'RESOLVED' | 'ABANDONED'; // Status of the hook
  branchId?: string; // NEW Task 2.2: Context isolation
}

export interface Echo {
  id: string;
  type: 'CHARACTER' | 'WORLD';
  targetId: string;
  targetName: string;
  description: string;
  reason: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'PREDICTION' | 'ARCHIVED';
  timestamp: number;
  triples?: KnowledgeTriple[]; // NEW: Structural changes associated with this echo
  branchId?: string; // NEW Task 2.2
}

export interface StateChangeRecommendation {
  targetId: string;
  targetType: 'CHARACTER' | 'WORLD';
  targetName: string;
  suggestedUpdate: string;
  reason: string;
}

export interface TimelineEvent {
  id: string;
  timestamp: number; // Real world time of creation
  worldDate: string; // In-world date (e.g., "Year 205, Winter")
  title: string;
  description: string;
  involvedEntities: string[]; // IDs of characters/settings
  type: 'SCENE' | 'BACKGROUND' | 'ECHO';
}

export interface Faction {
  id: string;
  members: string[]; // Names of characters
  dominantTone?: string;
}

export interface PropagationRisk {
  targetName: string;
  impact: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  magnitude: number; // 0-100
  reason: string;
}

export interface PhysicalStatus {
  name: string;
  location: string;
  state: string;
  isDead: boolean;
}

export interface ProjectState {
  id: string; // Unique ID for persistence
  lastModified: number;
  title: string;
  genre: string;
  premise: string;
  creativeSettings: CreativeSettings;
  worldGenConfig: WorldGenConfig; // New World Builder specific settings
  characters: Character[];
  worldSettings: WorldSetting[];
  plotOutline?: string;
  plotNodes: PlotNode[]; // NEW: Structured plot card system
  plotHistory: PlotVersion[];
  drafts: Draft[]; // New: Store generated drafts
  chapters: Chapter[]; // New: Store official manuscript
  echoes: Echo[]; // NEW: Echo Engine pending state changes
  customPrompts: Record<string, string>;
  timeline: TimelineEvent[]; // NEW: Chronological history of the world
  currentWorldDate: string; // NEW: Current in-world date
  activeBranchId?: string; // NEW Task 2.2: Track current active sandbox branch
  availableBranches?: string[]; // NEW Task 2.2: List of all sandbox branches
}

export interface NarrativeInsight {
  type: 'ALLIANCE_POTENTIAL' | 'CONFLICT_WARNING' | 'SECRET_CONNECTION' | 'FACTION_SHIFT';
  description: string;
  involvedEntities: string[];
  logic: string;
}

export type PolishMode = 'SENSORY' | 'CINEMATIC' | 'PSYCHOLOGICAL' | 'MINIMALIST' | 'WEB_MEME';

export type ViewMode = 'FORGE' | 'MANUSCRIPT';

export interface LogicConflict {
  type: 'LOCATION_MISMATCH' | 'RELATIONSHIP_CONFLICT' | 'FACTUAL_INCONSISTENCY';
  description: string;
  truthInGraph: string;
  extractedFact: string;
}
