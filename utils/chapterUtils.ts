import { Chapter, PlotNode } from '../types';

/**
 * Ensures all chapters have a consistent and sequential 'order' property
 * based on their logical position within PlotNodes and their own relative order.
 */
export const recalculateChapterOrders = (chapters: Chapter[], plotNodes: PlotNode[]): Chapter[] => {
    const nodeOrderMap = new Map(plotNodes.map(node => [node.id, node.order]));

    const sorted = [...chapters].sort((a, b) => {
        const orderA = a.plotNodeId ? (nodeOrderMap.get(a.plotNodeId) ?? 9999) : 9999;
        const orderB = b.plotNodeId ? (nodeOrderMap.get(b.plotNodeId) ?? 9999) : 9999;

        if (orderA !== orderB) {
            return orderA - orderB;
        }

        // Within the same node, use the chapter's own order
        return (a.order ?? 0) - (b.order ?? 0);
    });

    // Re-assign continuous order indices
    return sorted.map((ch, idx) => ({ ...ch, order: idx }));
};
