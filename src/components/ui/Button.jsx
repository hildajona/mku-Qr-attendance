import React from 'react'
import { Loader2 } from 'lucide-react'

const variants = {
  primary:   'btn btn-primary',
  secondary: 'btn btn-secondary',
  danger:    'btn btn-danger',
  outline:   'btn btn-outline',
  ghost:     'btn hover:bg-slate-100 text-slate-600',
}

const sizes = {
  sm:  'px-3 py-1.5 text-xs',
  md:  'px-5 py-2.5 text-sm',
  lg:  'px-6 py-3 text-base',
  icon:'p-2',
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className = '',
  leftIcon,
  rightIcon,
  ...props
}) {
  return (
    <button
      className={`${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading
        ? <Loader2 size={16} className="animate-spin" />
        : leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  )
}
