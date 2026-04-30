import type { ReactNode } from 'react'
import { ApolloProvider } from '@apollo/client'
import { ErrorBoundary } from 'react-error-boundary'
import { NuqsAdapter } from 'nuqs/adapters/react'
import { apolloClient } from '@/lib/apollo/client'
import { ErrorFallback } from '@/components/feedback/ErrorFallback'
import { TooltipProvider } from '@/components/ui/tooltip'
import { FeatureFlagsProvider } from '@/lib/feature-flags/provider'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
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
