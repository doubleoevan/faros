import { createContext } from 'react'
import { defaultFeatureFlags, type FeatureFlagName } from './flags'

export const FeatureFlagsContext =
  createContext<Record<FeatureFlagName, boolean>>(defaultFeatureFlags)
