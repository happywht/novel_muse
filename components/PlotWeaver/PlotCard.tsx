import React from 'react';
import { PlotNode, ProjectState } from '../../types';
import { PlotCardProvider, PlotCardContextValue } from './PlotCardContext';
import { PlotCardHeader } from './PlotCardHeader';
import { PlotCardBody } from './PlotCardBody';
import { PlotCardDraftZone } from './PlotCardDraftZone';
import { PlotCardActions } from './PlotCardActions';
import { PlotCardEntitySelector } from './PlotCardEntitySelector';
import { PlotCardConflictConfigurator } from './PlotCardConflictConfigurator';

interface PlotCardProps extends PlotCardContextValue {}

export const PlotCard: React.FC<PlotCardProps> = (props) => {
  const { node, focusedNodeId, setFocusedNodeId } = props;
  const isFocused = focusedNodeId === node.id;

  return (
    <PlotCardProvider value={props}>
      <div
        className={`bg-slate-900/50 border rounded-2xl p-6 transition-all duration-300 group relative ${
          isFocused
            ? 'border-muse-500 shadow-2xl shadow-muse-900/10'
            : node.conflictScenario
              ? 'border-red-800 shadow-lg shadow-red-900/20 animate-pulse'
              : 'border-slate-800 opacity-60 grayscale-[0.5] hover:opacity-100 hover:grayscale-0 hover:border-slate-700'
        }`}
        onFocus={() => setFocusedNodeId(node.id)}
        onBlur={() => setFocusedNodeId(null)}
        tabIndex={0}
      >
        <PlotCardHeader />
        <PlotCardBody />
        <PlotCardDraftZone />
        <PlotCardActions />
        <PlotCardEntitySelector />
        <PlotCardConflictConfigurator />
      </div>
    </PlotCardProvider>
  );
};

// Export types for external use
export type { PlotCardProps };
