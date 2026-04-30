import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { render } from '@/test/render'
import { FeatureFlagsContext } from '@/lib/feature-flags'
import { EmployeeDetailPanel } from './EmployeeDetailPanel'

vi.mock('@/lib/ai', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/ai')>()
  return {
    ...actual,
    hasValidAiConsentToken: vi.fn(() => false),
    getAiConsentToken: vi.fn(() => Promise.resolve('test-token')),
  }
})

vi.mock('@/lib/telemetry', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/telemetry')>()
  return { ...actual, emit: vi.fn() }
})

import { emit } from '@/lib/telemetry'

function renderWithFlag(isAiEnabled: boolean) {
  return render(
    // FeatureFlagsContext.Provider is nested inside render()'s Providers wrapper;
    // React reads the nearest provider, so this value wins over the default.
    <FeatureFlagsContext.Provider value={{ 'ai-insights': isAiEnabled }}>
      <EmployeeDetailPanel />
    </FeatureFlagsContext.Provider>,
  )
}

describe('EmployeeDetailPanel — AI feature flag', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // open the detail panel for emp_1 (Lando Calrissian) via URL — default MSW handlers serve it.
    window.history.replaceState(null, '', '/?view=emp_1')
    window.dispatchEvent(new PopStateEvent('popstate'))
  })

  afterEach(() => {
    window.history.replaceState(null, '', '/')
  })

  it('shows a neutral placeholder and no consent prompt when the flag is off', async () => {
    renderWithFlag(false)

    await screen.findByText('Lando Calrissian')

    expect(screen.getByText('AI-powered insights are not available.')).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: /ai insights consent/i })).not.toBeInTheDocument()
  })

  it('emits ai.flag.evaluated with isEnabled false when the flag is off', async () => {
    renderWithFlag(false)

    await screen.findByText('Lando Calrissian')

    expect(emit).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'ai.flag.evaluated',
        properties: expect.objectContaining({ isEnabled: false }),
      }),
    )
  })

  it('shows the consent prompt when the flag is on', async () => {
    renderWithFlag(true)

    await screen.findByText('Lando Calrissian')
    expect(await screen.findByRole('region', { name: /ai insights consent/i })).toBeInTheDocument()
  })
})
