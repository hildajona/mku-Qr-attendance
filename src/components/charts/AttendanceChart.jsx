import React from 'react'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement,
  Title, Tooltip, Legend
} from 'chart.js'
import { Bar } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

export default function AttendanceChart({ data = [], title = 'Attendance by Unit' }) {
  const labels  = data.map(d => d.unit_name || d.label)
  const present = data.map(d => d.present ?? d.value ?? 0)
  const absent  = data.map(d => d.absent ?? 0)

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Present',
        data: present,
        backgroundColor: 'rgba(22, 163, 74, 0.85)',
        borderRadius: 6,
        borderSkipped: false,
      },
      ...(absent.some(v => v > 0) ? [{
        label: 'Absent',
        data: absent,
        backgroundColor: 'rgba(239, 68, 68, 0.75)',
        borderRadius: 6,
        borderSkipped: false,
      }] : []),
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          font: { family: 'Plus Jakarta Sans', size: 12 },
          usePointStyle: true,
          pointStyleWidth: 8,
        },
      },
      title: {
        display: !!title,
        text: title,
        font: { family: 'Plus Jakarta Sans', size: 14, weight: '600' },
        color: '#1E293B',
        padding: { bottom: 16 },
      },
      tooltip: {
        backgroundColor: '#0F172A',
        titleFont: { family: 'Plus Jakarta Sans' },
        bodyFont: { family: 'Plus Jakarta Sans' },
        cornerRadius: 8,
        padding: 10,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { family: 'Plus Jakarta Sans', size: 11 }, color: '#64748B' },
      },
      y: {
        beginAtZero: true,
        grid: { color: '#F1F5F9' },
        ticks: { font: { family: 'Plus Jakarta Sans', size: 11 }, color: '#64748B' },
      },
    },
  }

  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
        No data available
      </div>
    )
  }

  return (
    <div style={{ height: 280 }}>
      <Bar data={chartData} options={options} />
    </div>
  )
}
