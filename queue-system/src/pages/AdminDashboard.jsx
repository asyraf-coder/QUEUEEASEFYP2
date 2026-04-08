import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Scissors, Megaphone, RotateCcw, Trash2, 
  MessageSquare, BarChart3, Download, LogOut 
} from 'lucide-react';
import AdminAnalytics from '../components/AdminAnalytics'; 
import { jsPDF } from 'jspdf'; 
import autoTable from 'jspdf-autotable';

// ── Palette ──────────────────────────────────────────
const C = {
  bg:        '#34271F',   // dark brown — main background
  surface:   '#3E2F25',   // slightly lighter brown — cards
  border:    'rgba(221,197,162,0.1)',
  tan:       '#DDC5A2',   // warm tan — primary accent
  cream:     '#EEE2D1',   // light cream — headings & important text
  muted:     'rgba(238,226,209,0.35)',
  faint:     'rgba(238,226,209,0.12)',
  green:     '#A8D5A2',   // soft green for revenue
}

const AdminDashboard = ({ 
  currentServing, 
  queueCount, 
  customers, 
  history, 
  lastResetTime,
  handleCallNext, 
  handleResetQueue,
  handleRemoveCustomer,
  onLogout 
}) => {
  const [time, setTime] = useState(new Date().toLocaleTimeString());
  const [activeTab, setActiveTab] = useState('overview'); 
  const [showResetSummary, setShowResetSummary] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const currentShiftHistory = history.filter(item => {
    if (!lastResetTime) return true;
    const servedDate = item.servedAt?.toDate ? item.servedAt.toDate() : new Date(item.servedAt);
    return servedDate >= lastResetTime;
  });

  const totalRevenue = currentShiftHistory.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
  const totalServed  = currentShiftHistory.length;
  const avgWait      = totalServed > 0 
    ? Math.round(currentShiftHistory.reduce((sum, item) => sum + (item.waitMinutes || 0), 0) / totalServed)
    : 0;

  const handleFinalReset = async () => {
    if (isResetting) return;
    setIsResetting(true);
    try {
      await handleResetQueue();
      setShowResetSummary(false);
    } catch (err) {
      alert("Error: Failed to reset shift.");
    } finally {
      setIsResetting(false);
    }
  };

  const downloadDailyReport = () => {
    try {
      const doc = new jsPDF();
      const dateStr = new Date().toLocaleDateString();
      doc.setFontSize(22);
      doc.setTextColor(52, 39, 31);
      doc.text("BRO Z BARBERSHOP", 14, 20);
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`SHIFT PERFORMANCE REPORT: ${dateStr}`, 14, 28);
      autoTable(doc, {
        startY: 40,
        head: [['Metric', 'Shift Value']],
        body: [
          ['Shift Revenue', `RM ${totalRevenue}`],
          ['Customers Served', `${totalServed} pax`],
          ['Average Wait', `${avgWait} minutes`],
        ],
        theme: 'grid',
        headStyles: { fillColor: [52, 39, 31] },
      });
      const tableRows = currentShiftHistory.map(item => [
        item.ticket || 'N/A',
        item.name || 'Customer',
        item.service || "Standard Cut",
        `RM ${item.price || 0}`,
        `${item.waitMinutes || 0}m`
      ]);
      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 15,
        head: [['Ticket', 'Customer Name', 'Service', 'Price', 'Wait Time']],
        body: tableRows,
        headStyles: { fillColor: [62, 47, 37] },
      });
      doc.save(`BroZ_Shift_Report_${dateStr}.pdf`);
    } catch (err) {
      alert("Failed to generate PDF.");
    }
  };

  const triggerResetSequence = () => {
    if (customers.length > 0) {
      if (window.confirm("Customers are still waiting. Close shift anyway?")) {
        setShowResetSummary(true);
      }
    } else {
      setShowResetSummary(true);
    }
  };

  const pingCustomer = (phone, name) => {
    const message = `Hello ${name}! You are next in line at Bro Z Barbershop. Please be ready!`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <div className="min-h-screen font-sans flex flex-col" style={{ backgroundColor: C.bg, color: C.cream }}>

      {/* Header */}
      <header className="px-6 py-4 flex justify-between items-center sticky top-0 z-40"
        style={{ backgroundColor: C.surface, borderBottom: `1px solid ${C.border}` }}>
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg" style={{ backgroundColor: C.tan }}>
            <Scissors className="w-5 h-5" style={{ color: C.bg }} />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight" style={{ color: C.cream }}>Bro Z Admin</h1>
            <p className="text-[9px] font-bold uppercase tracking-tighter" style={{ color: C.muted }}>
              {activeTab === 'overview' ? 'Shift Dashboard' : 'Historical Analytics'}
            </p>
          </div>
        </div>
        <p className="text-sm font-bold" style={{ color: C.muted }}>{time}</p>
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-4 pb-28">
        {activeTab === 'overview' ? (
          <>
            {/* Current Ticket Hero */}
            <div className="rounded-3xl p-8 text-center relative overflow-hidden"
              style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}>
              <p className="text-[10px] uppercase tracking-[0.3em] mb-2" style={{ color: C.muted }}>
                Now Serving
              </p>
              <div className="text-9xl font-black mb-6 leading-none" style={{ color: C.cream }}>
                {String(currentServing).padStart(3, '0')}
              </div>
              <button 
                onClick={handleCallNext}
                className="w-full py-5 rounded-2xl font-black text-xl flex items-center justify-center gap-3 active:scale-95 transition-all"
                style={{ backgroundColor: C.tan, color: C.bg }}
              >
                <Megaphone className="w-6 h-6" /> CALL NEXT
              </button>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Waiting',    value: customers.length,  color: C.cream },
                { label: 'Revenue',    value: `RM ${totalRevenue}`, color: C.green },
                { label: 'Avg Wait',   value: `${avgWait}m`,     color: C.tan },
              ].map(({ label, value, color }) => (
                <div key={label} className="p-4 rounded-2xl text-center"
                  style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}>
                  <p className="text-[9px] uppercase font-bold mb-1" style={{ color: C.muted }}>{label}</p>
                  <p className="text-xl font-black" style={{ color }}>{value}</p>
                </div>
              ))}
            </div>

            {/* Live Queue List */}
            <div className="rounded-3xl overflow-hidden"
              style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}>
              <div className="px-6 py-4 flex justify-between items-center"
                style={{ borderBottom: `1px solid ${C.border}` }}>
                <h3 className="font-bold text-xs uppercase tracking-widest" style={{ color: C.muted }}>
                  Live Queue
                </h3>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: C.faint, color: C.muted }}>
                  {customers.length} waiting
                </span>
              </div>
              <div>
                {customers.length === 0 ? (
                  <div className="p-12 text-center text-sm italic" style={{ color: C.faint }}>
                    No customers in line.
                  </div>
                ) : (
                  customers.map((cust, index) => (
                    <div key={cust.id} className="p-5 flex items-center justify-between"
                      style={{ borderBottom: index < customers.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                      <div className="flex items-center gap-4">
                        {/* First in line gets tan badge */}
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-sm"
                          style={{
                            backgroundColor: index === 0 ? C.tan : C.faint,
                            color:           index === 0 ? C.bg  : C.muted,
                            border:          index === 0 ? 'none' : `1px solid ${C.border}`
                          }}>
                          {String(cust.ticket).padStart(3, '0')}
                        </div>
                        <div>
                          <p className="font-bold text-sm" style={{ color: C.cream }}>{cust.name}</p>
                          <p className="text-[10px] uppercase" style={{ color: C.muted }}>{cust.phone}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => pingCustomer(cust.phone, cust.name)}
                          className="p-2 rounded-lg transition-colors hover:bg-white/5"
                          style={{ color: C.muted }}>
                          <MessageSquare size={18} />
                        </button>
                        <button onClick={() => handleRemoveCustomer(cust.id)}
                          className="p-2 rounded-lg transition-colors hover:bg-white/5"
                          style={{ color: C.muted }}>
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        ) : (
          <AdminAnalytics history={history} />
        )}
      </main>

      {/* Reset Summary Modal */}
      {showResetSummary && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6"
          style={{ backgroundColor: 'rgba(52,39,31,0.92)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl"
            style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}>
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
                style={{ backgroundColor: C.faint }}>
                <RotateCcw size={28} style={{ color: C.tan }} />
              </div>
              <h2 className="text-xl font-black" style={{ color: C.cream }}>Shift Closeout</h2>
              <p className="text-[10px] uppercase tracking-widest mt-1" style={{ color: C.muted }}>
                Shift Summary
              </p>
            </div>

            <div className="space-y-3 mb-8">
              {[
                { label: 'Shift Revenue', value: `RM ${totalRevenue}`, color: C.green },
                { label: 'Customers',     value: `${totalServed} pax`, color: C.cream },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex justify-between items-center p-4 rounded-2xl"
                  style={{ backgroundColor: C.faint, border: `1px solid ${C.border}` }}>
                  <span className="text-xs font-bold uppercase" style={{ color: C.muted }}>{label}</span>
                  <span className="text-xl font-black" style={{ color }}>{value}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-3">
              <button onClick={downloadDailyReport}
                className="w-full py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 active:scale-95 transition-all"
                style={{ backgroundColor: C.tan, color: C.bg }}>
                <Download size={18} /> DOWNLOAD SHIFT REPORT
              </button>
              <button onClick={handleFinalReset} disabled={isResetting}
                className="w-full py-4 rounded-2xl font-black text-sm transition-all"
                style={{
                  backgroundColor: C.faint,
                  color: isResetting ? C.muted : C.cream,
                  border: `1px solid ${C.border}`
                }}>
                {isResetting ? 'RESETTING...' : 'CONFIRM RESET SHIFT'}
              </button>
              <button onClick={() => !isResetting && setShowResetSummary(false)}
                className="w-full py-2 font-bold text-[10px] uppercase tracking-widest"
                style={{ color: C.muted }}>
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 px-4 py-3 pb-6 flex justify-around items-center z-50"
        style={{ backgroundColor: C.surface, borderTop: `1px solid ${C.border}` }}>
        {[
          { id: 'overview',   icon: <LayoutDashboard size={22} />, label: 'Queue',    action: () => setActiveTab('overview') },
          { id: 'analytics',  icon: <BarChart3 size={22} />,       label: 'Analytics', action: () => setActiveTab('analytics') },
          { id: 'reset',      icon: <RotateCcw size={22} />,       label: 'Reset',     action: triggerResetSequence },
          { id: 'logout',     icon: <LogOut size={22} />,          label: 'Logout',    action: onLogout },
        ].map(({ id, icon, label, action }) => (
          <button key={id} onClick={action}
            className="flex flex-col items-center gap-1 transition-all"
            style={{
              color: activeTab === id ? C.tan
                : id === 'reset'  ? 'rgba(221,197,162,0.4)'
                : id === 'logout' ? 'rgba(238,226,209,0.3)'
                : C.muted
            }}>
            {icon}
            <span className="text-[9px] font-bold uppercase">{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};

export default AdminDashboard;