import { useState, useEffect, useRef } from 'react'
import { getWeeklyRevenue, getMonthlyRevenue, getPeakHours } from '../services/analyticsService'

export default function AnalyticsDashboard() {
  const [view, setView]               = useState('weekly')
  const [revenueData, setRevenueData] = useState([])
  const [peakData, setPeakData]       = useState([])
  const [loading, setLoading]         = useState(true)

  const revenueRef    = useRef(null)
  const peakRef       = useRef(null)
  const revenueChart  = useRef(null)
  const peakChart     = useRef(null)

  // Load data whenever view toggles
  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const [rev, peak] = await Promise.all([
        view === 'weekly' ? getWeeklyRevenue() : getMonthlyRevenue(),
        getPeakHours()
      ])
      setRevenueData(rev)
      setPeakData(peak)
      setLoading(false)
    }
    load()
  }, [view])

  // Revenue chart
  useEffect(() => {
    if (!revenueData.length || !revenueRef.current) return
    if (revenueChart.current) revenueChart.current.destroy()

    import('chart.js/auto').then(({ default: Chart }) => {
      revenueChart.current = new Chart(revenueRef.current, {
        type: 'bar',
        data: {
          labels: revenueData.map(d => d.label),
          datasets: [{
            data: revenueData.map(d => d.revenue),
            backgroundColor: '#1D9E75',
            borderRadius: 4,
            borderSkipped: false
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { display: false } },
            y: {
              beginAtZero: true,
              ticks: { callback: v => 'RM ' + v }
            }
          }
        }
      })
    })
  }, [revenueData])

  // Peak hour chart
  useEffect(() => {
    if (!peakData.length || !peakRef.current) return
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
              h.count === maxCount && maxCount > 0 ? '#D85A30' : '#7F77DD'
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
              ticks: { font: { size: 10 }, autoSkip: false, maxRotation: 0 }
            },
            y: { beginAtZero: true, ticks: { stepSize: 1 } }
          }
        }
      })
    })
  }, [peakData])

  // Summary numbers
  const totalRevenue   = revenueData.reduce((a, d) => a + d.revenue, 0)
  const totalCustomers = revenueData.reduce((a, d) => a + d.customers, 0)
  const peakHour       = peakData.reduce(
    (best, h) => h.count > best.count ? h : best,
    { label: '—', count: 0 }
  )

  return (
    <div className="p-4">

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-xs text-gray-400 mb-1">
            {view === 'weekly' ? 'Revenue this week' : 'Revenue this month'}
          </p>
          <p className="text-2xl font-medium text-gray-800">
            RM {totalRevenue.toLocaleString()}
          </p>
        </div>
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-xs text-gray-400 mb-1">Customers served</p>
          <p className="text-2xl font-medium text-gray-800">{totalCustomers}</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-xs text-gray-400 mb-1">Busiest hour</p>
          <p className="text-2xl font-medium text-gray-800">{peakHour.label}</p>
        </div>
      </div>

      {/* Weekly / Monthly toggle */}
      <div className="flex gap-2 mb-5">
        {['weekly', 'monthly'].map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-4 py-1.5 rounded-lg text-sm capitalize transition-colors
              ${view === v
                ? 'bg-teal-600 text-white'
                : 'border border-gray-200 text-gray-500 hover:bg-gray-50'
              }`}
          >
            {v}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center text-gray-400 py-16 text-sm">
          Loading analytics...
        </div>
      ) : (
        <>
          {/* Revenue chart */}
          <p className="text-sm font-medium text-gray-700 mb-2">Revenue (RM)</p>
          <div className="relative h-52 mb-8">
            <canvas ref={revenueRef} />
          </div>

          {/* Peak hour chart */}
          <p className="text-sm font-medium text-gray-700 mb-1">
            Customers by hour
            <span className="ml-2 text-xs font-normal text-gray-400">
              last 30 days — orange = busiest
            </span>
          </p>
          <div className="relative h-52">
            <canvas ref={peakRef} />
          </div>
        </>
      )}
    </div>
  )
}