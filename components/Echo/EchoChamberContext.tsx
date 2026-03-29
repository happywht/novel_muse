import React, { createContext, useContext, useState, useMemo, useEffect, ReactNode } from 'react';
import { ProjectState, Character, WorldSetting, Echo } from '../../types';
import { deduceWorldConsequences, consolidateMemory } from '../../services/geminiService';
import {
  fetchRelationshipTimeline,
  fetchEchoForeshadowing,
  detectContradictions,
  API_BASE,
  syncProject,
} from '../../services/apiService';
import { useProjectStore } from '../../store/useProjectStore';
import { useToast } from '../../hooks/useToast';

// Graph Query State Types
export interface RelationshipTimelineItem {
  timestamp: number;
  echoId: string;
  relation: string;
  trajectory: string;
  weight: number;
  description: string;
}

export interface ForeshadowingItem {
  subject: string;
  relation: string;
  object: string;
  echoId: string;
  createdAt: number;
  relatedChapter?: string;
}

export interface ContradictionItem {
  type: 'RELATIONSHIP_CONFLICT' | 'STATE_MISMATCH' | 'TEMPORAL_ERROR';
  description: string;
  entities: string[];
  conflictingEchoes: string[];
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
}

type ViewFilter = 'PENDING' | 'HISTORY';

interface EchoChamberContextValue {
  // Props
  project: ProjectState;
  updateProject: (data: Partial<ProjectState>) => void;

  // UI State
  selectedEchoId: string | null;
  setSelectedEchoId: (id: string | null) => void;
  selectedEntityId: string | null;
  setSelectedEntityId: (id: string | null) => void;
  viewFilter: ViewFilter;
  setViewFilter: (filter: ViewFilter) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  showGraphPanel: boolean;
  setShowGraphPanel: (show: boolean) => void;
  showDeepReview: boolean;
  setShowDeepReview: (show: boolean) => void;
  showIntegrityReport: boolean;
  setShowIntegrityReport: (show: boolean) => void;
  showBatchHistory: boolean;
  setShowBatchHistory: (show: boolean) => void;

  // Loading States
  isDeducing: boolean;
  isConsolidating: boolean;
  isLoadingTimeline: boolean;
  isLoadingForeshadowing: boolean;
  isLoadingContradictions: boolean;
  undoingOperationId: string | null;

  // Graph Query State
  selectedChar1Id: string | null;
  setSelectedChar1Id: (id: string | null) => void;
  selectedChar2Id: string | null;
  setSelectedChar2Id: (id: string | null) => void;
  relationshipTimeline: RelationshipTimelineItem[];
  foreshadowingList: ForeshadowingItem[];
  contradictions: ContradictionItem[];

  // Computed Data
  filteredEchoes: Echo[];
  selectedEcho: Echo | null;
  targetEntity: { data: Character | WorldSetting; type: 'CHARACTER' | 'WORLD' } | null;
  entityHistory: Echo[];
  consolidationCandidates: Echo[];

  // Handlers
  handleAction: (echoId: string, status: 'ACCEPTED' | 'REJECTED') => void;
  handleDeduceFuture: () => Promise<void>;
  handleConsolidateMemory: () => Promise<void>;
  handleAcceptEchoToGraph: (echoId: string) => Promise<void>;
  handleAcceptEcho: (echo: Echo) => void;
  handleRejectEcho: (echo: Echo) => void;
  handleBatchAccept: (echoes: Echo[]) => void;
  handleBatchReject: (echoes: Echo[]) => void;
  loadForeshadowing: () => Promise<void>;
  loadRelationshipTimeline: () => Promise<void>;
  loadContradictions: () => Promise<void>;

  // Store
  batchOperationHistory: any[];
  loadBatchOperationHistory: () => Promise<void>;
  undoLastBatchOperation: (operationId: string) => Promise<void>;
  useBackend: boolean;
}

const EchoChamberContext = createContext<EchoChamberContextValue | null>(null);

interface EchoChamberProviderProps {
  project: ProjectState;
  updateProject: (data: Partial<ProjectState>) => void;
  children: ReactNode;
}

export const EchoChamberProvider: React.FC<EchoChamberProviderProps> = ({
  project,
  updateProject,
  children,
}) => {
  const { toast } = useToast();

  // UI State
  const [selectedEchoId, setSelectedEchoId] = useState<string | null>(null);
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [viewFilter, setViewFilter] = useState<ViewFilter>('PENDING');
  const [isDeducing, setIsDeducing] = useState(false);
  const [isConsolidating, setIsConsolidating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Graph Query States
  const [selectedChar1Id, setSelectedChar1Id] = useState<string | null>(null);
  const [selectedChar2Id, setSelectedChar2Id] = useState<string | null>(null);
  const [relationshipTimeline, setRelationshipTimeline] = useState<RelationshipTimelineItem[]>([]);
  const [foreshadowingList, setForeshadowingList] = useState<ForeshadowingItem[]>([]);
  const [contradictions, setContradictions] = useState<ContradictionItem[]>([]);
  const [isLoadingTimeline, setIsLoadingTimeline] = useState(false);
  const [isLoadingForeshadowing, setIsLoadingForeshadowing] = useState(false);
  const [isLoadingContradictions, setIsLoadingContradictions] = useState(false);
  const [showGraphPanel, setShowGraphPanel] = useState(false);

  // Deep Review & Integrity Report States
  const [showDeepReview, setShowDeepReview] = useState(false);
  const [showIntegrityReport, setShowIntegrityReport] = useState(false);

  // Batch Operation History States
  const [showBatchHistory, setShowBatchHistory] = useState(false);
  const [undoingOperationId, setUndoingOperationId] = useState<string | null>(null);

  // Get batch operation history and actions from store
  const { batchOperationHistory, loadBatchOperationHistory, undoLastBatchOperation, useBackend } =
    useProjectStore();

  // --- Data Processing ---

  // Echoes for the main feed
  const filteredEchoes = useMemo(() => {
    return project.echoes
      .filter((e) => {
        if (viewFilter === 'PENDING') {
          return e.status === 'PENDING';
        } else {
          return e.status === 'ACCEPTED' || e.status === 'ARCHIVED';
        }
      })
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [project.echoes, viewFilter]);

  // Selected Echo
  const selectedEcho = useMemo(
    () => project.echoes.find((e) => e.id === selectedEchoId) || null,
    [project.echoes, selectedEchoId]
  );

  // Effective Target Entity (either from selected echo or manual selection)
  const effectiveTargetId = selectedEcho?.targetId || selectedEntityId;

  const targetEntity = useMemo(() => {
    if (!effectiveTargetId) return null;
    const char = project.characters.find((c) => c.id === effectiveTargetId);
    if (char) return { data: char, type: 'CHARACTER' as const };
    const setting = project.worldSettings.find((w) => w.id === effectiveTargetId);
    if (setting) return { data: setting, type: 'WORLD' as const };
    return null;
  }, [project, effectiveTargetId]);

  // Entity's full echo history
  const entityHistory = useMemo(() => {
    if (!effectiveTargetId) return [];
    return project.echoes
      .filter((e) => e.targetId === effectiveTargetId && e.status !== 'REJECTED')
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [project.echoes, effectiveTargetId]);

  const consolidationCandidates = useMemo(
    () => entityHistory.filter((e) => e.status === 'ACCEPTED'),
    [entityHistory]
  );

  // --- Graph Query Handlers ---

  // Load foreshadowing on mount
  useEffect(() => {
    if (showGraphPanel && foreshadowingList.length === 0) {
      loadForeshadowing();
    }
  }, [showGraphPanel]);

  const loadForeshadowing = async () => {
    setIsLoadingForeshadowing(true);
    try {
      const result = await fetchEchoForeshadowing(project.id);
      setForeshadowingList(result);
    } catch (err) {
      console.error('Failed to load foreshadowing:', err);
    } finally {
      setIsLoadingForeshadowing(false);
    }
  };

  const loadRelationshipTimeline = async () => {
    if (!selectedChar1Id || !selectedChar2Id) {
      toast.warning('请选择两个角色');
      return;
    }
    if (selectedChar1Id === selectedChar2Id) {
      toast.warning('请选择两个不同的角色');
      return;
    }

    setIsLoadingTimeline(true);
    try {
      const result = await fetchRelationshipTimeline(project.id, selectedChar1Id, selectedChar2Id);
      setRelationshipTimeline(result);
    } catch (err) {
      console.error('Failed to load relationship timeline:', err);
      toast.error('加载关系时间线失败');
    } finally {
      setIsLoadingTimeline(false);
    }
  };

  const loadContradictions = async () => {
    setIsLoadingContradictions(true);
    try {
      const result = await detectContradictions(project.id);
      setContradictions(result);
    } catch (err) {
      console.error('Failed to detect contradictions:', err);
      toast.error('矛盾检测失败');
    } finally {
      setIsLoadingContradictions(false);
    }
  };

  const handleAcceptEchoToGraph = async (echoId: string) => {
    try {
      const response = await fetch(`${API_BASE}/graph/${project.id}/echoes/${echoId}/accept`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to accept echo to graph');

      // Update local state
      handleAction(echoId, 'ACCEPTED');
      toast.success('Echo已采纳并同步到图谱');
    } catch (err) {
      console.error('Failed to accept echo:', err);
      toast.error('同步到图谱失败');
    }
  };

  // Deep Review Handlers
  const handleAcceptEcho = (echo: Echo) => {
    handleAction(echo.id, 'ACCEPTED');
  };

  const handleRejectEcho = (echo: Echo) => {
    handleAction(echo.id, 'REJECTED');
  };

  const handleBatchAccept = (echoes: Echo[]) => {
    const updatedEchoes = project.echoes.map((e) =>
      echoes.find((selected) => selected.id === e.id) ? { ...e, status: 'ACCEPTED' as const } : e
    );
    updateProject({ echoes: updatedEchoes });
  };

  const handleBatchReject = (echoes: Echo[]) => {
    const updatedEchoes = project.echoes.map((e) =>
      echoes.find((selected) => selected.id === e.id) ? { ...e, status: 'REJECTED' as const } : e
    );
    updateProject({ echoes: updatedEchoes });
  };

  // --- Handlers ---

  const handleAction = (echoId: string, status: 'ACCEPTED' | 'REJECTED') => {
    const updatedEchoes = project.echoes.map((e) => (e.id === echoId ? { ...e, status } : e));
    updateProject({ echoes: updatedEchoes });

    // If accepted, add to selected entity view immediately for feedback
    if (status === 'ACCEPTED') {
      const eco = project.echoes.find((e) => e.id === echoId);
      if (eco) setSelectedEntityId(eco.targetId);
    }
  };

  const handleDeduceFuture = async () => {
    setIsDeducing(true);
    try {
      const recommendations = await deduceWorldConsequences(
        project.id,
        project.activeBranchId || 'main',
        project.echoes,
        project.characters,
        project.worldSettings,
        project.genre
      );

      const newEchoes: Echo[] = recommendations.map((rec) => ({
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        targetId: rec.targetId,
        targetName: rec.targetName,
        type: rec.targetType,
        description: rec.suggestedUpdate,
        reason: rec.reason,
        status: 'PENDING',
        timestamp: Date.now(),
      }));

      updateProject({ echoes: [...project.echoes, ...newEchoes] });
      setViewFilter('PENDING'); // Ensure we see the results
    } catch (e) {
      console.error(e);
      toast.error('推演失败');
    } finally {
      setIsDeducing(false);
    }
  };

  const handleConsolidateMemory = async () => {
    if (!targetEntity || consolidationCandidates.length === 0) return;
    setIsConsolidating(true);
    try {
      const currentDesc =
        targetEntity.type === 'CHARACTER'
          ? (targetEntity.data as Character).description
          : (targetEntity.data as WorldSetting).content;

      const newDesc = await consolidateMemory(
        (targetEntity.data as any).name || (targetEntity.data as any).title || 'Unknown',
        targetEntity.type,
        currentDesc,
        consolidationCandidates
      );

      let updatedCharacters = [...project.characters];
      let updatedWorldSettings = [...project.worldSettings];

      if (targetEntity.type === 'CHARACTER') {
        updatedCharacters = updatedCharacters.map((c) =>
          c.id === effectiveTargetId ? { ...c, description: newDesc } : c
        );
      } else {
        updatedWorldSettings = updatedWorldSettings.map((w) =>
          w.id === effectiveTargetId ? { ...w, content: newDesc } : w
        );
      }

      const updatedEchoes = project.echoes.map((e) =>
        consolidationCandidates.find((c) => c.id === e.id)
          ? { ...e, status: 'ARCHIVED' as const }
          : e
      );

      const updatedProjectData = {
        ...project,
        characters: updatedCharacters,
        worldSettings: updatedWorldSettings,
        echoes: updatedEchoes,
      };

      updateProject(updatedProjectData);

      // Trigger sync
      syncProject(updatedProjectData).catch((err) => {
        console.error('Failed to sync consolidated memory:', err);
      });

      toast.success('记忆固化完成！短期记忆已转化为长期档案。');
    } catch (e) {
      console.error(e);
      toast.error('记忆固化失败');
    } finally {
      setIsConsolidating(false);
    }
  };

  const value: EchoChamberContextValue = {
    // Props
    project,
    updateProject,

    // UI State
    selectedEchoId,
    setSelectedEchoId,
    selectedEntityId,
    setSelectedEntityId,
    viewFilter,
    setViewFilter,
    searchQuery,
    setSearchQuery,
    showGraphPanel,
    setShowGraphPanel,
    showDeepReview,
    setShowDeepReview,
    showIntegrityReport,
    setShowIntegrityReport,
    showBatchHistory,
    setShowBatchHistory,

    // Loading States
    isDeducing,
    isConsolidating,
    isLoadingTimeline,
    isLoadingForeshadowing,
    isLoadingContradictions,
    undoingOperationId,

    // Graph Query State
    selectedChar1Id,
    setSelectedChar1Id,
    selectedChar2Id,
    setSelectedChar2Id,
    relationshipTimeline,
    foreshadowingList,
    contradictions,

    // Computed Data
    filteredEchoes,
    selectedEcho,
    targetEntity,
    entityHistory,
    consolidationCandidates,

    // Handlers
    handleAction,
    handleDeduceFuture,
    handleConsolidateMemory,
    handleAcceptEchoToGraph,
    handleAcceptEcho,
    handleRejectEcho,
    handleBatchAccept,
    handleBatchReject,
    loadForeshadowing,
    loadRelationshipTimeline,
    loadContradictions,

    // Store
    batchOperationHistory,
    loadBatchOperationHistory,
    undoLastBatchOperation,
    useBackend,
  };

  return <EchoChamberContext.Provider value={value}>{children}</EchoChamberContext.Provider>;
};

export const useEchoChamber = () => {
  const context = useContext(EchoChamberContext);
  if (!context) {
    throw new Error('useEchoChamber must be used within an EchoChamberProvider');
  }
  return context;
};
