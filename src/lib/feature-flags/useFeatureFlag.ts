import { useContext } from 'react'
import { FeatureFlagsContext } from './context'
import type { FeatureFlagName } from './flags'

/**
 * Reads a feature flag value from the FeatureFlagsContext.
 */
export function useFeatureFlag(name: FeatureFlagName): boolean {
  const flags = useContext(FeatureFlagsContext)
  return flags[name]
}
