import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AccountIcons } from './AccountIcons'

describe('AccountIcons', () => {
  it('renders one icon per account, mapped to the schema label', () => {
    render(
      <AccountIcons
        accounts={[
          { type: 'vcs', source: 'GitHub', uid: 'gh_1' },
          { type: 'tms', source: 'Jira', uid: 'jira_1' },
          { type: 'cal', source: 'Google Calendar', uid: 'cal_1' },
        ]}
      />,
    )
    expect(screen.getByAltText('GitHub')).toBeInTheDocument()
    expect(screen.getByAltText('Jira')).toBeInTheDocument()
    expect(screen.getByAltText('Google Calendar')).toBeInTheDocument()
    expect(screen.queryByAltText('PagerDuty')).not.toBeInTheDocument()
    expect(screen.getAllByRole('img')).toHaveLength(3)
  })

  it('falls back to a plain "None" label when no accounts are connected', () => {
    render(<AccountIcons accounts={[]} />)
    expect(screen.getByText(/none/i)).toBeInTheDocument()
  })
})
