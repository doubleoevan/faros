import { describe, expect, it } from 'vitest'
import { render, screen } from '@/test/render'
import { EmployeesDashboard } from './EmployeesDashboard'

describe('EmployeesDashboard', () => {
  it('renders the dashboard heading and the employees table', async () => {
    render(<EmployeesDashboard />)
    expect(screen.getByRole('heading', { name: /employees/i })).toBeInTheDocument()
    expect(await screen.findByRole('columnheader', { name: /name/i })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /tracking status/i })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /teams/i })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /accounts connected/i })).toBeInTheDocument()
  })
})
