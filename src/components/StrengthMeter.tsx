import { useMemo } from 'react'
import { cn } from '../lib/utils'
import { scorePassword, strengthColor } from '../lib/strength'

export function StrengthMeter({
  password,
  compact = false,
  className,
}: {
  password: string
  compact?: boolean
  className?: string
}) {
  const strength = useMemo(() => scorePassword(password), [password])
  const color = strengthColor(strength.score)

  return (
    <div className={cn('strength', compact && 'strength--compact', className)}>
      <div className="strength-line">
        <div className="strength__track" aria-hidden="true">
          {[0, 1, 2, 3, 4].map((index) => {
            const active = index <= strength.score && password.length > 0
            return (
              <span
                key={index}
                className="strength__seg"
                style={{
                  background: active ? color : undefined,
                  boxShadow: active ? `0 0 9px ${color}66` : undefined,
                }}
              />
            )
          })}
        </div>
        <span className="strength__label" style={{ color: password ? color : undefined }}>
          {strength.label}
        </span>
      </div>
      {!compact && password.length > 0 && (
        <div className="strength__meta">
          <span>
            {strength.entropy} bits · {strength.crackTime} to crack
          </span>
          {strength.warnings[0] && <span className="truncate">{strength.warnings[0]}</span>}
        </div>
      )}
    </div>
  )
}
