/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_FEATURE_AI_INSIGHTS: string
  readonly VITE_TELEMETRY_ENABLED: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
