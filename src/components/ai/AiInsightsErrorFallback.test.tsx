import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AiInsightsErrorFallback } from './AiInsightsErrorFallback'

function Crash({ when }: { when: boolean }) {
  if (when) {
    throw new Error('AI boom')
  }
  return <div>healthy</div>
}

function CrashHarness() {
  const [crashed, setCrashed] = useState(true)
  return (
    <ErrorBoundary FallbackComponent={AiInsightsErrorFallback} onReset={() => setCrashed(false)}>
      <Crash when={crashed} />
    </ErrorBoundary>
  )
}

describe('AiInsightsErrorFallback', () => {
  it('renders the alert with a try-again button when the subtree throws', () => {
    render(
      <ErrorBoundary FallbackComponent={AiInsightsErrorFallback}>
        <Crash when={true} />
      </ErrorBoundary>,
    )
    expect(screen.getByRole('alert')).toHaveTextContent(/unexpected error/i)
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
  })

  it('clicking Try again remounts the children and removes the alert', async () => {
    const user = userEvent.setup()
    render(<CrashHarness />)

    expect(screen.getByRole('alert')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /try again/i }))

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByText('healthy')).toBeInTheDocument()
  })
})
