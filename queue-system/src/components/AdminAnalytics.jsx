import { useState, useEffect, useRef } from 'react'

// ── Palette ──────────────────────────────────────────
const C = {
  bg:      '#34271F',
  surface: '#3E2F25',
  border:  'rgba(221,197,162,0.1)',
  tan:     '#DDC5A2',
  cream:   '#EEE2D1',
  muted:   'rgba(238,226,209,0.35)',
  faint:   'rgba(238,226,209,0.08)',
  grid:    'rgba(221,197,162,0.05)',
  green:   '#A8D5A2',
}

export default function AdminAnalytics({ history }) {
  const [view, setView] = useState('weekly')
  const revenueRef   = useRef(null)
  const peakRef      = useRef(null)
  const revenueChart = useRef(null)
  const peakChart    = useRef(null)

  const getWeekStart = (weeksAgo = 0) => {
    const d = new Date()
    const day = d.getDay()
    const monday = new Date(d)
    monday.setDate(d.getDate() - ((day + 6) % 7) - weeksAgo * 7)
    monday.setHours(0, 0, 0, 0)
    return monday
  }

  const getRevenueData = () => {
    if (view === 'weekly') {
      const days = []
      for (let i = 6; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        days.push({
          label: i === 0 ? 'Today' : d.toLocaleDateString('en-MY', { weekday: 'short' }),
          dateStr: d.toDateString(),
          revenue: 0, customers: 0
        })
      }
      history.forEach(entry => {
        if (!entry.servedAt) return
        const entryDate = entry.servedAt.toDate
          ? entry.servedAt.toDate().toDateString()
          : new Date(entry.servedAt).toDateString()
        const day = days.find(d => d.dateStr === entryDate)
        if (day) { day.revenue += Number(entry.price) || 0; day.customers += 1 }
      })
      return days
    } else {
      const weeks = []
      for (let i = 3; i >= 0; i--) {
        const start = getWeekStart(i)
        const end = i === 0
          ? new Date()
          : (() => { const e = new Date(getWeekStart(i - 1)); e.setSeconds(e.getSeconds() - 1); return e })()
        const startLabel = start.toLocaleDateString('en-MY', { day: '2-digit', month: 'short' })
        const endLabel   = end.toLocaleDateString('en-MY', { day: '2-digit', month: 'short' })
        weeks.push({ label: i === 0 ? 'This Week' : `${startLabel}–${endLabel}`, start, end, revenue: 0, customers: 0 })
      }
      history.forEach(entry => {
        if (!entry.servedAt) return
        const entryDate = entry.servedAt.toDate ? entry.servedAt.toDate() : new Date(entry.servedAt)
        const week = weeks.find(w => entryDate >= w.start && entryDate <= w.end)
        if (week) { week.revenue += Number(entry.price) || 0; week.customers += 1 }
      })
      return weeks.map(({ label, revenue, customers }) => ({ label, revenue, customers }))
    }
  }

  const getPeakData = () => {
    const hours = Array.from({ length: 24 }, (_, i) => ({
      label: i === 0 ? '12a' : i < 12 ? `${i}a` : i === 12 ? '12p' : `${i - 12}p`,
      count: 0
    }))
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29)
    history.forEach(entry => {
      if (!entry.servedAt) return
      const entryDate = entry.servedAt.toDate ? entry.servedAt.toDate() : new Date(entry.servedAt)
      if (entryDate < thirtyDaysAgo) return
      hours[entryDate.getHours()].count += 1
    })
    return hours
  }

  const revenueData = getRevenueData()
  const peakData    = getPeakData()

  const totalRevenue   = revenueData.reduce((a, d) => a + d.revenue, 0)
  const totalCustomers = revenueData.reduce((a, d) => a + d.customers, 0)
  const peakHour       = peakData.reduce((best, h) => h.count > best.count ? h : best, { label: '—', count: 0 })

  // Revenue chart
  useEffect(() => {
    if (!revenueRef.current) return
    if (revenueChart.current) revenueChart.current.destroy()
    import('chart.js/auto').then(({ default: Chart }) => {
      revenueChart.current = new Chart(revenueRef.current, {
        type: 'bar',
        data: {
          labels: revenueData.map(d => d.label),
          datasets: [{
            data: revenueData.map(d => d.revenue),
            backgroundColor: 'rgba(221,197,162,0.25)',
            hoverBackgroundColor: C.tan,
            borderRadius: 6,
            borderSkipped: false
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: {
              grid: { display: false },
              border: { color: C.grid },
              ticks: { color: C.muted, font: { size: 10 } }
            },
            y: {
              beginAtZero: true,
              grid: { color: C.grid },
              border: { color: C.grid },
              ticks: { color: C.muted, callback: v => 'RM ' + v }
            }
          }
        }
      })
    })
  }, [view, history])

  // Peak hour chart
  useEffect(() => {
    if (!peakRef.current) return
    if (peakChart.current) peakChart.current.destroy()
    const maxCount = Math.max(...peakData.map(h => h.count))
    import('chart.js/auto').then(({ default: Chart }) => {
      peakChart.current = new Chart(peakRef.current, {
        type: 'bar',
        data: {
          labels: peakData.map(h => h.label),
          datasets: [{
            data: peakData.map(h => h.count),
            backgroundColor: peakData.map(h =>
              h.count === maxCount && maxCount > 0 ? C.tan : 'rgba(221,197,162,0.12)'
            ),
            borderRadius: 3,
            borderSkipped: false
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: {
              grid: { display: false },
              border: { color: C.grid },
              ticks: { color: C.muted, font: { size: 9 }, autoSkip: false, maxRotation: 0 }
            },
            y: {
              beginAtZero: true,
              grid: { color: C.grid },
              border: { color: C.grid },
              ticks: { color: C.muted, stepSize: 1 }
            }
          }
        }
      })
    })
  }, [history])

  return (
    <div className="space-y-4 pb-4">

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: view === 'weekly' ? 'Last 7 Days' : 'Last 4 Weeks', value: `RM ${totalRevenue.toLocaleString()}`, color: C.green },
          { label: 'Served',    value: totalCustomers,  color: C.cream },
          { label: 'Peak Hour', value: peakHour.label,  color: C.tan },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-2xl p-4"
            style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}>
            <p className="text-[9px] uppercase font-bold mb-1" style={{ color: C.muted }}>{label}</p>
            <p className="text-lg font-black" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Toggle */}
      <div className="flex gap-2">
        {['weekly', 'monthly'].map(v => (
          <button key={v} onClick={() => setView(v)}
            className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
            style={{
              backgroundColor: view === v ? C.tan : 'transparent',
              color:           view === v ? C.bg  : C.muted,
              border:          view === v ? 'none' : `1px solid ${C.border}`
            }}>
            {v}
          </button>
        ))}
      </div>

      {/* Revenue Chart */}
      <div className="rounded-3xl p-6" style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}>
        <p className="text-[10px] uppercase tracking-widest font-bold mb-4" style={{ color: C.muted }}>
          Revenue (RM)
        </p>
        <div className="relative h-48">
          <canvas ref={revenueRef} />
        </div>
      </div>

      {/* Peak Hour Chart */}
      <div className="rounded-3xl p-6" style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}>
        <p className="text-[10px] uppercase tracking-widest font-bold mb-1" style={{ color: C.muted }}>
          Crowd Analysis
        </p>
        <p className="text-[9px] mb-4" style={{ color: 'rgba(238,226,209,0.2)' }}>
          Peak times — tan bar is the busiest hour
        </p>
        <div className="relative h-48">
          <canvas ref={peakRef} />
        </div>
      </div>

      {/* History Table */}
      <div className="rounded-3xl overflow-hidden" style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}>
        <div className="px-5 py-4" style={{ borderBottom: `1px solid ${C.border}` }}>
          <p className="text-[10px] uppercase tracking-widest font-bold" style={{ color: C.muted }}>
            Recent Service History
          </p>
        </div>
        <div>
          {history.length === 0 ? (
            <p className="text-center text-xs py-10 italic" style={{ color: 'rgba(238,226,209,0.15)' }}>
              No history found
            </p>
          ) : (
            history.slice(0, 10).map((entry, index) => (
              <div key={entry.id} className="px-5 py-3 flex items-center justify-between"
                style={{ borderBottom: index < 9 ? `1px solid ${C.border}` : 'none' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs"
                    style={{ backgroundColor: C.faint, color: C.muted, border: `1px solid ${C.border}` }}>
                    {String(entry.ticket || '—').padStart(3, '0')}
                  </div>
                  <div>
                    <p className="text-sm font-bold" style={{ color: C.cream }}>{entry.name}</p>
                    <p className="text-[10px] uppercase" style={{ color: C.muted }}>
                      {entry.servedAt?.toDate
                        ? entry.servedAt.toDate().toLocaleDateString('en-MY', { day: '2-digit', month: 'short' })
                        : 'Today'}
                      {entry.waitMinutes ? ` · waited ${entry.waitMinutes}m` : ''}
                    </p>
                  </div>
                </div>
                <p className="text-sm font-black" style={{ color: C.green }}>
                  RM {entry.price || 0}
                </p>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  )
}