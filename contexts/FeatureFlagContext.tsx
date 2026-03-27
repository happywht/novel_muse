/**
 * Feature Flag Context
 * React Context for feature flags and user tier management
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { FeatureFlagService, UserTier, FeatureFlags, TIER_FEATURES } from '../config/featureFlags';

interface FeatureFlagContextValue {
  tier: UserTier;
  flags: FeatureFlags;
  setTier: (tier: UserTier) => void;
  isEnabled: (feature: keyof FeatureFlags) => boolean;
  isLoading: boolean;
}

const FeatureFlagContext = createContext<FeatureFlagContextValue | null>(null);

export const FeatureFlagProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tier, setTierState] = useState<UserTier>('FREE');
  const [flags, setFlags] = useState<FeatureFlags>(TIER_FEATURES.FREE);
  const [isLoading, setIsLoading] = useState(true);
  const service = FeatureFlagService.getInstance();

  useEffect(() => {
    const initializeService = async () => {
      try {
        await service.initialize();
        const currentTier = service.getTier();
        setTierState(currentTier);
        setFlags(TIER_FEATURES[currentTier]);
      } catch (error) {
        console.error('Failed to initialize feature flags:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeService();
  }, [service]);

  const setTier = useCallback((newTier: UserTier) => {
    service.setTier(newTier);
    setTierState(newTier);
    setFlags(TIER_FEATURES[newTier]);
  }, [service]);

  const isEnabled = useCallback((feature: keyof FeatureFlags): boolean => {
    return flags[feature];
  }, [flags]);

  const value: FeatureFlagContextValue = {
    tier,
    flags,
    setTier,
    isEnabled,
    isLoading,
  };

  return (
    <FeatureFlagContext.Provider value={value}>
      {children}
    </FeatureFlagContext.Provider>
  );
};

/**
 * Hook to access feature flags
 */
export const useFeatureFlags = (): FeatureFlagContextValue => {
  const context = useContext(FeatureFlagContext);
  if (!context) {
    throw new Error('useFeatureFlags must be used within FeatureFlagProvider');
  }
  return context;
};

/**
 * Component wrapper for premium-only features
 * Shows fallback content for free users
 */
export const PremiumOnly: React.FC<{
  children: React.ReactNode;
  fallback?: React.ReactNode;
}> = ({ children, fallback = null }) => {
  const { tier } = useFeatureFlags();

  if (tier === 'PREMIUM') {
    return <>{children}</>;
  }

  return <>{fallback}</>;
};

/**
 * Component wrapper for features gated by specific feature flag
 */
export const FeatureGate: React.FC<{
  feature: keyof FeatureFlags;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}> = ({ feature, children, fallback = null }) => {
  const { isEnabled } = useFeatureFlags();

  if (isEnabled(feature)) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
};

/**
 * HOC for wrapping components with premium feature check
 */
export function withPremiumFeature<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  FallbackComponent?: React.ComponentType
) {
  return function WithPremiumFeatureWrapper(props: P) {
    const { tier } = useFeatureFlags();

    if (tier === 'PREMIUM') {
      return <WrappedComponent {...props} />;
    }

    if (FallbackComponent) {
      return <FallbackComponent />;
    }

    return null;
  };
}
