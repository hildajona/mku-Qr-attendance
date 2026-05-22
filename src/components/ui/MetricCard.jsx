import React from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

export default function MetricCard({
  label,
  value,
  icon: Icon,
  iconColor = 'text-green-600',
  iconBg = 'bg-green-50',
  trend,        // number: positive = up, negative = down, 0 = flat
  trendLabel,
  className = '',
}) {
  const trendColor = trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-500' : 'text-slate-400'
  const TrendIcon  = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus

  return (
    <div className={`bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-shadow ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-slate-500 font-medium">{label}</p>
          <p className="text-3xl font-bold text-slate-800 mt-1">{value}</p>
          {trend !== undefined && (
            <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${trendColor}`}>
              <TrendIcon size={13} />
              <span>{trendLabel || `${Math.abs(trend)}%`}</span>
            </div>
          )}
        </div>
        {Icon && (
          <div className={`p-3 rounded-xl ${iconBg}`}>
            <Icon size={22} className={iconColor} />
          </div>
        )}
      </div>
    </div>
  )
}
