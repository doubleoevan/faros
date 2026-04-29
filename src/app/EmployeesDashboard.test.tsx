import { describe, expect, it } from 'vitest'
import { render, screen } from '@/test/render'
import { EmployeesDashboard } from './EmployeesDashboard'

describe('EmployeesDashboard', () => {
  it('renders the dashboard heading', () => {
    render(<EmployeesDashboard />)
    expect(
      screen.getByRole('heading', { name: /employee insights dashboard/i }),
    ).toBeInTheDocument()
  })
})
