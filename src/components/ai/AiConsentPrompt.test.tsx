import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AiConsentPrompt } from './AiConsentPrompt'

describe('AiConsentPrompt', () => {
  it('renders the title and description', () => {
    render(<AiConsentPrompt onConsentGrant={vi.fn()} onConsentDeny={vi.fn()} />)
    expect(screen.getByText('AI Activity Insights')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Allow' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'No thanks' })).toBeInTheDocument()
  })

  it('calls onConsentGrant when Allow is clicked', () => {
    const handleGrantConsent = vi.fn(() => Promise.resolve())
    render(<AiConsentPrompt onConsentGrant={handleGrantConsent} onConsentDeny={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Allow' }))
    expect(handleGrantConsent).toHaveBeenCalledTimes(1)
  })

  it('calls onConsentDeny when No thanks is clicked', () => {
    const handleDenyConsent = vi.fn()
    render(<AiConsentPrompt onConsentGrant={vi.fn()} onConsentDeny={handleDenyConsent} />)
    fireEvent.click(screen.getByRole('button', { name: 'No thanks' }))
    expect(handleDenyConsent).toHaveBeenCalledTimes(1)
  })

  it('disables both buttons and changes Allow label when isLoading is true', () => {
    render(<AiConsentPrompt onConsentGrant={vi.fn()} onConsentDeny={vi.fn()} isLoading />)
    expect(screen.getByRole('button', { name: 'Authorizing…' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'No thanks' })).toBeDisabled()
  })

  it('shows Allow (not Authorizing) when isLoading is false', () => {
    render(<AiConsentPrompt onConsentGrant={vi.fn()} onConsentDeny={vi.fn()} isLoading={false} />)
    expect(screen.getByRole('button', { name: 'Allow' })).not.toBeDisabled()
  })
})
