import { useContext } from 'react'
import { FeatureFlagsContext } from './context'
import type { FeatureFlagName } from './flags'

export function useFeatureFlag(name: FeatureFlagName): boolean {
  const flags = useContext(FeatureFlagsContext)
  return flags[name]
}
