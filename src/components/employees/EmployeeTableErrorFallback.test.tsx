import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { EmployeeTableErrorFallback } from './EmployeeTableErrorFallback'

function Crash({ when }: { when: boolean }) {
  if (when) {
    throw new Error('Render boom')
  }
  return <div>healthy</div>
}

function CrashHarness() {
  const [crashed, setCrashed] = useState(true)
  return (
    <ErrorBoundary FallbackComponent={EmployeeTableErrorFallback} onReset={() => setCrashed(false)}>
      <Crash when={crashed} />
    </ErrorBoundary>
  )
}

describe('EmployeeTableErrorFallback', () => {
  it('renders the alert with the error message and a retry button', () => {
    render(
      <ErrorBoundary FallbackComponent={EmployeeTableErrorFallback}>
        <Crash when={true} />
      </ErrorBoundary>,
    )
    expect(screen.getByRole('alert')).toHaveTextContent(/couldn't load the employees table/i)
    expect(screen.getByRole('alert')).toHaveTextContent('Render boom')
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
  })

  it('clicking Try again calls onReset and re-mounts the children', async () => {
    const user = userEvent.setup()
    render(<CrashHarness />)

    expect(screen.getByRole('alert')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /try again/i }))

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByText('healthy')).toBeInTheDocument()
  })
})
