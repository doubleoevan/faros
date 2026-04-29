import type { ReactNode } from 'react'
import { FeatureFlagsContext } from './context'
import { defaultFeatureFlags } from './flags'

export function FeatureFlagsProvider({ children }: { children: ReactNode }) {
  return (
    <FeatureFlagsContext.Provider value={defaultFeatureFlags}>
      {children}
    </FeatureFlagsContext.Provider>
  )
}
