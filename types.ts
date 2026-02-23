
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

export interface Draft {
  id: string;
  title: string;
  content: string;
  relatedPlotPoint?: string;
  lastModified: number;
}

export interface Chapter {
  id: string;
  title: string;
  content: string;
  order: number;
  lastModified: number;
}

export interface CreativeSettings {
  tone: string;      // e.g., "Dark", "Humorous", "Epic"
  style: string;     // e.g., "Descriptive", "Concise", "Poetic"
  creativity: number; // 0.0 to 1.0 (Temperature)
  targetAudience: string;
}

export interface WorldGenConfig {
  detailLevel: 'Brief' | 'Standard' | 'Detailed'; // 简短, 标准, 详尽
  focus: 'Sensory' | 'Logic' | 'History' | 'Balanced'; // 感官, 逻辑, 历史, 平衡
}

export enum AppSection {
  DASHBOARD = 'DASHBOARD',
  WORLD = 'WORLD',
  CHARACTERS = 'CHARACTERS',
  PLOT = 'PLOT',
  DRAFTING = 'DRAFTING',
  ECHOES = 'ECHOES',
  GRAPH = 'GRAPH',
  STATS = 'STATS'
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
  plotHistory: PlotVersion[];
  drafts: Draft[]; // New: Store generated drafts
  chapters: Chapter[]; // New: Store official manuscript
  echoes: Echo[]; // NEW: Echo Engine pending state changes
  timeline: TimelineEvent[]; // NEW: Chronological history of the world
  currentWorldDate: string; // NEW: Current in-world date
}