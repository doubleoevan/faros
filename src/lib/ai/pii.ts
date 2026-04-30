/** Result of running PII detection on a text string. */
export type PiiFilterResult = {
  text: string
  hasPii: boolean
}

// phone (xxx) xxx-xxxx, SSN xxx-xx-xxxx, email, DOB M/D/YYYY, US street address
const PII_PATTERNS: RegExp[] = [
  /\(\d{3}\) \d{3}-\d{4}/g,
  /\b\d{3}-\d{2}-\d{4}\b/g,
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  /\b\d{1,2}\/\d{1,2}\/\d{4}\b/g,
  /\b\d+\s+[A-Z][a-z]+\s+(?:Street|Avenue|Lane|Drive|Court),\s+[A-Za-z]+,\s+[A-Z]{2}\s+\d{5}\b/g,
]

/** Returns true if the text contains any detectable PII pattern. */
export function containsPii(text: string): boolean {
  return PII_PATTERNS.some((pattern) => {
    // reset before test — global regexes are stateful
    pattern.lastIndex = 0
    return pattern.test(text)
  })
}

/** Redacts all detectable PII in `text`; returns the sanitized string and a detection flag. */
export function filterPii(text: string): PiiFilterResult {
  let hasPii = false
  let result = text
  for (const pattern of PII_PATTERNS) {
    pattern.lastIndex = 0
    const redacted = result.replace(pattern, '[REDACTED]')
    if (redacted !== result) {
      hasPii = true
      result = redacted
    }
  }
  return { text: result, hasPii }
}
