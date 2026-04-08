import {
  collection, query, where,
  orderBy, getDocs, Timestamp
} from 'firebase/firestore'
import { db } from '../firebase'

// Get history entries between two dates
const getHistoryEntries = async (startDate, endDate) => {
  const q = query(
    collection(db, 'history'),
    where('servedAt', '>=', Timestamp.fromDate(startDate)),
    where('servedAt', '<=', Timestamp.fromDate(endDate)),
    orderBy('servedAt', 'asc')
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

// Daily revenue — last 7 days
export const getWeeklyRevenue = async () => {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - 6)
  start.setHours(0, 0, 0, 0)

  const entries = await getHistoryEntries(start, end)

  const days = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    days.push({
      label: d.toLocaleDateString('en-MY', { weekday: 'short' }),
      dateStr: d.toDateString(),
      revenue: 0,
      customers: 0
    })
  }

  entries.forEach(entry => {
    const entryDate = entry.servedAt.toDate().toDateString()
    const day = days.find(d => d.dateStr === entryDate)
    if (day) {
      day.revenue += Number(entry.price) || 0
      day.customers += 1
    }
  })

  return days
}

// Weekly revenue — last 4 weeks
export const getMonthlyRevenue = async () => {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - 27)
  start.setHours(0, 0, 0, 0)

  const entries = await getHistoryEntries(start, end)

  const weeks = [
    { label: 'Week 1', revenue: 0, customers: 0 },
    { label: 'Week 2', revenue: 0, customers: 0 },
    { label: 'Week 3', revenue: 0, customers: 0 },
    { label: 'Week 4', revenue: 0, customers: 0 },
  ]

  const now = new Date()
  entries.forEach(entry => {
    const daysAgo = Math.floor(
      (now - entry.servedAt.toDate()) / (1000 * 60 * 60 * 24)
    )
    const weekIndex = Math.min(3, Math.floor((27 - daysAgo) / 7))
    if (weekIndex >= 0) {
      weeks[weekIndex].revenue += Number(entry.price) || 0
      weeks[weekIndex].customers += 1
    }
  })

  return weeks
}

// Peak hours — last 30 days (uses queue collection timestamps)
export const getPeakHours = async () => {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - 29)
  start.setHours(0, 0, 0, 0)

  const q = query(
    collection(db, 'history'),
    where('servedAt', '>=', Timestamp.fromDate(start)),
    where('servedAt', '<=', Timestamp.fromDate(end)),
    orderBy('servedAt', 'asc')
  )
  const snap = await getDocs(q)

  const hours = Array.from({ length: 24 }, (_, i) => ({
    label: i === 0 ? '12a' : i < 12 ? `${i}a` : i === 12 ? '12p' : `${i - 12}p`,
    count: 0
  }))

  snap.docs.forEach(d => {
    const hour = d.data().servedAt.toDate().getHours()
    hours[hour].count += 1
  })

  return hours
}