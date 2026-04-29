export type FeatureFlagName = 'ai-insights'

export const defaultFeatureFlags: Record<FeatureFlagName, boolean> = {
  'ai-insights': import.meta.env.VITE_AI_FLAG_DEFAULT !== 'false',
}
