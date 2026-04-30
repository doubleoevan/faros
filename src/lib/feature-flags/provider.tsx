import type { ReactNode } from 'react'
import { FeatureFlagsContext } from './context'
import { defaultFeatureFlags } from './flags'

/**
 * Supplies the default feature-flag values to descendants via FeatureFlagsContext.
 */
export function FeatureFlagsProvider({ children }: { children: ReactNode }) {
  return (
    <FeatureFlagsContext.Provider value={defaultFeatureFlags}>
      {children}
    </FeatureFlagsContext.Provider>
  )
}
