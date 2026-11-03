const COMMON_PASSWORDS = new Set(
  `password password1 password123 123456 123456789 12345678 qwerty qwerty123 abc123 letmein
  welcome admin admin123 iloveyou monkey dragon sunshine princess football baseball shadow
  master superman batman trustno1 passw0rd p@ssw0rd p@ssword 111111 000000 123123 654321
  qwertyuiop asdfghjkl zxcvbnm 1q2w3e4r 1qaz2wsx qazwsx 1234 12345 1234567 1234567890
  password12 password! Password1 Password123 welcome1 hello hello123 freedom whatever
  starwars pokemon naruto jordan23 harley hunter ranger buster soccer hockey killer george
  michelle jessica charlie andrew daniel thomas robert matthew jennifer summer winter
  flower lovely secret secrets login guest root toor changeme default test testing
  austin mustang access ninja azerty loveme angel friends michael`
    .split(/\s+/)
    .filter(Boolean),
)

const SEQUENCES = ['abcdefghijklmnopqrstuvwxyz', '01234567890', 'qwertyuiop', 'asdfghjkl', 'zxcvbnm']

export interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4
  label: string
  percent: number
  entropy: number
  crackTime: string
  warnings: string[]
  suggestions: string[]
}

function poolSize(password: string, hasSymbols = true) {
  let pool = 0
  if (/[a-z]/.test(password)) pool += 26
  if (/[A-Z]/.test(password)) pool += 26
  if (/[0-9]/.test(password)) pool += 10
  if (/[^A-Za-z0-9]/.test(password)) pool += hasSymbols ? 33 : 0
  return pool || 1
}

function charEntropy(password: string) {
  return password.length * Math.log2(poolSize(password))
}

function hasSequence(password: string) {
  const lower = password.toLowerCase()
  const reversed = [...SEQUENCES].map((s) => [...s].reverse().join(''))
  return [...SEQUENCES, ...reversed].some((sequence) => {
    for (let i = 0; i + 3 <= sequence.length; i += 1) {
      if (lower.includes(sequence.slice(i, i + 4))) return true
    }
    return false
  })
}

export function humanCrackTime(seconds: number) {
  if (!Number.isFinite(seconds)) return 'essentially forever'
  if (seconds < 1) return 'instantly'
  const units: [number, string][] = [
    [60, 'seconds'],
    [3600, 'minutes'],
    [86400, 'hours'],
    [2592000, 'days'],
    [31536000, 'months'],
    [31536000 * 100, 'years'],
    [31536000 * 1e6, 'millennia'],
  ]
  if (seconds < 60) return `${Math.round(seconds)} seconds`
  if (seconds < 3600) return `${Math.round(seconds / 60)} minutes`
  if (seconds < 86400) return `${Math.round(seconds / 3600)} hours`
  if (seconds < 2592000) return `${Math.round(seconds / 86400)} days`
  if (seconds < 31536000) return `${Math.round(seconds / 2592000)} months`
  if (seconds < 31536000 * 100) return `${Math.round(seconds / 31536000)} years`
  if (seconds < 31536000 * 1e6) return `${Math.round(seconds / (31536000 * 100))} centuries`
  return 'essentially forever'
}

export function scorePassword(password: string): PasswordStrength {
  if (!password) {
    return {
      score: 0,
      label: 'Empty',
      percent: 0,
      entropy: 0,
      crackTime: 'instantly',
      warnings: [],
      suggestions: ['Add a password to see its strength.'],
    }
  }

  const warnings: string[] = []
  const suggestions: string[] = []
  let entropy = charEntropy(password)
  let penalty = 0
  const lower = password.toLowerCase()

  if (COMMON_PASSWORDS.has(lower)) {
    penalty += 45
    warnings.push('This is one of the most common passwords in the world.')
    suggestions.push('Choose something unique — never a dictionary word.')
  }

  if (hasSequence(password)) {
    penalty += 12
    warnings.push('Contains a predictable sequence.')
  }

  if (/^(.)\1+$/.test(password)) {
    penalty += 30
    warnings.push('Uses a single repeated character.')
  }

  if (/^[a-z]+$/.test(password) || /^[0-9]+$/.test(password)) {
    penalty += 10
    suggestions.push('Mix letters, numbers and symbols.')
  }

  if (/(19|20)\d{2}/.test(password)) {
    penalty += 8
    warnings.push('Contains a year, which is easy to guess.')
  }

  if (password.length < 10) {
    penalty += 18
    suggestions.push('Use at least 12 characters.')
  }

  if (password.length >= 20) penalty -= 4

  const effective = Math.max(0, entropy - penalty)
  entropy = Math.round(effective)

  let score: PasswordStrength['score'] = 0
  if (password.length >= 8 && effective >= 36) score = 1
  if (password.length >= 10 && effective >= 52) score = 2
  if (password.length >= 12 && effective >= 68) score = 3
  if (password.length >= 14 && effective >= 84) score = 4
  if (COMMON_PASSWORDS.has(lower)) score = 0

  const labels = ['Critical', 'Weak', 'Fair', 'Strong', 'Excellent']
  const guessesPerSecond = 1e11
  const seconds = Math.pow(2, Math.max(0, effective - 1)) / guessesPerSecond
  const crackTime = humanCrackTime(seconds)

  if (score >= 3 && !warnings.length) suggestions.push('Great password. Store it and move on.')

  return {
    score,
    label: labels[score],
    percent: Math.min(100, Math.round((score + Math.min(0.99, effective / 120)) * 20)),
    entropy,
    crackTime,
    warnings,
    suggestions: suggestions.slice(0, 3),
  }
}

export function strengthColor(score: number) {
  switch (score) {
    case 0:
      return 'var(--danger)'
    case 1:
      return 'var(--warn)'
    case 2:
      return 'var(--amber)'
    case 3:
      return 'var(--good)'
    default:
      return 'var(--accent)'
  }
}
