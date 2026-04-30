import { describe, expect, it } from 'vitest'
import { containsPii, filterPii } from './pii'

describe('containsPii', () => {
  it('returns false for clean professional text', () => {
    expect(
      containsPii('Harry Potter has been actively contributing across Frontend and Backend.'),
    ).toBe(false)
  })

  it('detects phone numbers in (xxx) xxx-xxxx format', () => {
    expect(containsPii('Their personal phone is (555) 123-4567.')).toBe(true)
  })

  it('detects SSNs in xxx-xx-xxxx format', () => {
    expect(containsPii('Note: SSN on file is 306-16-2083.')).toBe(true)
  })

  it('detects email addresses', () => {
    expect(containsPii('Personal email: harry.personal42@gmail.com was found.')).toBe(true)
  })

  it('detects dates of birth in M/D/YYYY format', () => {
    expect(containsPii('Date of birth: 3/15/1985.')).toBe(true)
  })

  it('detects US street addresses', () => {
    expect(containsPii('Home address: 1234 Oak Street, Springfield, IL 62701.')).toBe(true)
  })
})

describe('filterPii', () => {
  it('returns clean text unchanged with hasPii false', () => {
    const text = 'Employee contributes across the platform team.'
    const result = filterPii(text)
    expect(result.text).toBe(text)
    expect(result.hasPii).toBe(false)
  })

  it('redacts phone numbers and sets hasPii true', () => {
    const result = filterPii('Their personal phone is (555) 123-4567.')
    expect(result.text).toBe('Their personal phone is [REDACTED].')
    expect(result.hasPii).toBe(true)
  })

  it('redacts SSNs', () => {
    const result = filterPii('Note: SSN on file is 306-16-2083.')
    expect(result.text).toBe('Note: SSN on file is [REDACTED].')
    expect(result.hasPii).toBe(true)
  })

  it('redacts email addresses', () => {
    const result = filterPii('Email: harry.personal42@gmail.com found in communications.')
    expect(result.text).toBe('Email: [REDACTED] found in communications.')
    expect(result.hasPii).toBe(true)
  })

  it('redacts dates of birth', () => {
    const result = filterPii('Date of birth: 3/15/1985.')
    expect(result.text).toBe('Date of birth: [REDACTED].')
    expect(result.hasPii).toBe(true)
  })

  it('redacts US street addresses', () => {
    const result = filterPii('Home address: 1234 Oak Street, Springfield, IL 62701.')
    expect(result.text).toBe('Home address: [REDACTED].')
    expect(result.hasPii).toBe(true)
  })

  it('redacts multiple PII types in one string', () => {
    const text = 'Phone: (555) 123-4567. Email: test@example.com.'
    const result = filterPii(text)
    expect(result.text).toBe('Phone: [REDACTED]. Email: [REDACTED].')
    expect(result.hasPii).toBe(true)
  })

  it('redacts all occurrences of the same PII type', () => {
    const result = filterPii('Call (555) 111-2222 or (555) 333-4444.')
    expect(result.text).toBe('Call [REDACTED] or [REDACTED].')
    expect(result.hasPii).toBe(true)
  })

  it('does not false-positive on ISO dates with hyphens', () => {
    const result = filterPii('Last reviewed on 2024-01-15.')
    expect(result.hasPii).toBe(false)
  })

  it('does not false-positive on PR counts that contain digit ranges', () => {
    const result = filterPii('Pull request throughput of 18 PRs/month is above team median.')
    expect(result.hasPii).toBe(false)
  })
})
