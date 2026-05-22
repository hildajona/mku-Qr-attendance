import React from 'react'
import {
  Chart as ChartJS, ArcElement, Tooltip, Legend
} from 'chart.js'
import { Doughnut } from 'react-chartjs-2'

ChartJS.register(ArcElement, Tooltip, Legend)

export default function DoughnutChart({
  percentage = 0,
  label = 'Attendance',
  size = 180,
  showLegend = false,
}) {
  const clamped = Math.min(100, Math.max(0, percentage))
  const color = clamped >= 75 ? '#16A34A' : clamped >= 50 ? '#F59E0B' : '#EF4444'

  const data = {
    datasets: [{
      data: [clamped, 100 - clamped],
      backgroundColor: [color, '#F1F5F9'],
      borderWidth: 0,
      hoverOffset: 4,
    }],
    labels: ['Present', 'Absent'],
  }

  const options = {
    responsive: false,
    cutout: '72%',
    plugins: {
      legend: { display: showLegend },
      tooltip: {
        callbacks: {
          label: (ctx) => ` ${ctx.label}: ${ctx.raw}%`,
        },
        backgroundColor: '#0F172A',
        titleFont: { family: 'Plus Jakarta Sans' },
        bodyFont: { family: 'Plus Jakarta Sans' },
        cornerRadius: 8,
      },
    },
  }

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <Doughnut data={data} options={options} width={size} height={size} />
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-2xl font-bold" style={{ color }}>{clamped}%</span>
        <span className="text-xs text-slate-400 mt-0.5">{label}</span>
      </div>
    </div>
  )
}
