import { VerificationStatus, VERIFICATION_LEVELS } from '@/lib/types/verification'

interface VerificationBadgeProps {
  status: VerificationStatus
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function VerificationBadge({ status, showLabel = true, size = 'md' }: VerificationBadgeProps) {
  const level = VERIFICATION_LEVELS[status]

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base',
  }

  const colorClasses = {
    gray: 'bg-gray-100 text-gray-800 border-gray-300',
    blue: 'bg-blue-100 text-blue-800 border-blue-300',
    green: 'bg-green-100 text-green-800 border-green-300',
    purple: 'bg-purple-100 text-purple-800 border-purple-300',
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${
        sizeClasses[size]
      } ${colorClasses[level.badge.color as keyof typeof colorClasses]}`}
    >
      <span>{level.badge.icon}</span>
      {showLabel && <span>{level.label}</span>}
    </span>
  )
}
