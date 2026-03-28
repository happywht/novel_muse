/**
 * Feature Flag Hook
 * Checks if a feature is enabled in global config
 */

import { useState, useEffect } from 'react';
import { getGlobalConfig } from '../config/global';

type FeatureFlag =
    | 'enableEchoSystem'
    | 'enableKnowledgeGraph'
    | 'enableChapterBalance'
    | 'enableConflictVisualization'
    | 'enableVirtualScrolling'
    | 'enableInkosIntegration'
    | 'debugMode';

/**
 * Check if a feature is enabled in global config
 * @param feature - The feature flag to check
 * @returns boolean indicating if the feature is enabled
 */
export function useFeature(feature: FeatureFlag): boolean {
    const [enabled, setEnabled] = useState(false);

    useEffect(() => {
        getGlobalConfig().then(config => {
            setEnabled(config.features[feature]);
        });
    }, [feature]);

    return enabled;
}

/**
 * Get all feature flags
 * @returns object with all feature flags
 */
export function useFeatures() {
    const [features, setFeatures] = useState({
        enableEchoSystem: true,
        enableKnowledgeGraph: true,
        enableChapterBalance: true,
        enableConflictVisualization: true,
        enableVirtualScrolling: true,
        enableInkosIntegration: false,
        debugMode: false,
    });

    useEffect(() => {
        getGlobalConfig().then(config => {
            setFeatures(config.features);
        });
    }, []);

    return features;
}
