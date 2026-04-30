import type { ReactNode } from 'react'
import { useEffect, useRef } from 'react'
import { ApolloProvider } from '@apollo/client'
import { ErrorBoundary } from 'react-error-boundary'
import { NuqsAdapter } from 'nuqs/adapters/react'
import { apolloClient } from '@/lib/apollo/client'
import { ErrorFallback } from '@/app/ErrorFallback'
import { TooltipProvider } from '@/components/ui/tooltip'
import { FeatureFlagsProvider } from '@/lib/feature-flags/provider'
import { emit, events } from '@/lib/telemetry'

export function Providers({ children }: { children: ReactNode }) {
  const hasEmittedSessionRef = useRef(false)

  useEffect(() => {
    if (hasEmittedSessionRef.current) {
      return
    }
    hasEmittedSessionRef.current = true
    emit(events.appSessionStarted())
  }, [])

  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={(error) => {
        emit(
          events.errorBoundaryTriggered(
            'root',
            error instanceof Error ? error.message : String(error),
          ),
        )
      }}
    >
      <ApolloProvider client={apolloClient}>
        <NuqsAdapter>
          <FeatureFlagsProvider>
            <TooltipProvider>{children}</TooltipProvider>
          </FeatureFlagsProvider>
        </NuqsAdapter>
      </ApolloProvider>
    </ErrorBoundary>
  )
}
