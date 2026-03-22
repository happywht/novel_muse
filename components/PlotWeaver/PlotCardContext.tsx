import React, { createContext, useContext } from 'react';
import { PlotNode, ProjectState } from '../../types';

interface PlotCardContextValue {
    // Data
    node: PlotNode;
    idx: number;
    project: ProjectState;
    focusedNodeId: string | null;
    editingNodeId: string | null;
    draftNodeContent: string | null;
    iterationFeedback: string;
    showEntitySelector: { id: string; type: 'CHARACTER' | 'LOCATION' } | null;
    showConflictConfigurator: string | null;
    isIterating: boolean;

    // Actions
    setFocusedNodeId: (id: string | null) => void;
    handleUpdateCard: (id: string, data: Partial<PlotNode>) => void;
    handleRemoveCard: (id: string) => void;
    handleGenerateNodeAI: (id: string) => void;
    handleQuickDraft: (id: string) => void;
    handleIterateNode: () => void;
    handleAcceptDraftNode: () => void;
    setDraftNodeContent: (content: string | null) => void;
    setEditingNodeId: (id: string | null) => void;
    setIterationFeedback: (feedback: string) => void;
    setShowEntitySelector: (state: { id: string; type: 'CHARACTER' | 'LOCATION' } | null) => void;
    setShowConflictConfigurator: (id: string | null) => void;
    toggleEntityRelation: (nodeId: string, entityType: 'CHARACTER' | 'LOCATION', entityId: string) => void;
}

const PlotCardContext = createContext<PlotCardContextValue | null>(null);

export const usePlotCard = () => {
    const context = useContext(PlotCardContext);
    if (!context) throw new Error('usePlotCard must be used within PlotCardProvider');
    return context;
};

export const PlotCardProvider: React.FC<{
    children: React.ReactNode;
    value: PlotCardContextValue;
}> = ({ children, value }) => {
    return (
        <PlotCardContext.Provider value={value}>
            {children}
        </PlotCardContext.Provider>
    );
};

export type { PlotCardContextValue };
