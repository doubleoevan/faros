export type FeatureFlagName = 'ai-insights'

export const defaultFeatureFlags: Record<FeatureFlagName, boolean> = {
  'ai-insights': import.meta.env.VITE_FEATURE_AI_INSIGHTS !== 'false',
}
