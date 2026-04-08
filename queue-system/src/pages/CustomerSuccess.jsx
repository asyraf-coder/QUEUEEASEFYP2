import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, BellRing, Volume2 } from 'lucide-react';

const CustomerSuccess = ({ myNumber, currentServing, customers = [], onCancel, aiEstimate }) => {
  const navigate    = useNavigate();
  const [notifyMe, setNotifyMe]     = useState(false);
  const [alertLabel, setAlertLabel] = useState('');
  const audioCtxRef = useRef(null);

  const ticket  = Number(myNumber) || Number(sessionStorage.getItem('myTicket')) || 0;
  const serving = Number(currentServing) || 0;
  const isMyTurn = serving === ticket && ticket !== 0;

  // ✅ Real queue position — count actual people ahead, not ticket subtraction
  // This stays accurate even when people cancel and leave gaps in ticket numbers
  const peopleAhead = customers.filter(c => Number(c.ticket) < ticket).length;

  // Save ticket to sessionStorage for refresh survival
  useEffect(() => {
    if (myNumber) sessionStorage.setItem('myTicket', myNumber);
  }, [myNumber]);

  // Redirect home if no ticket
  useEffect(() => {
    if (!ticket) navigate('/', { replace: true });
  }, [ticket]);

  // Detect alert capability
  useEffect(() => {
    const hasVibrate      = 'vibrate' in navigator;
    const hasNotification = 'Notification' in window;
    const hasAudio        = !!(window.AudioContext || window.webkitAudioContext);

    if (hasVibrate && hasNotification) setAlertLabel('Vibrate + Notification');
    else if (hasVibrate)               setAlertLabel("Vibrate when it's your turn");
    else if (hasAudio)                 setAlertLabel('Sound alert (iPhone friendly)');
    else                               setAlertLabel('Visual alert only');
  }, []);

  // Request notification permission
  useEffect(() => {
    if (!notifyMe) return;
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [notifyMe]);

  // Play two-tone beep
  const playBeep = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      audioCtxRef.current = ctx;
      [[520, 0], [660, 0.5]].forEach(([freq, delay]) => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.3, ctx.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.4);
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + 0.4);
      });
    } catch (err) {
      console.warn('Audio alert failed:', err);
    }
  };

  const triggerAlert = () => {
    try { if ('vibrate' in navigator) navigator.vibrate([300, 100, 300, 100, 300]); } catch (_) {}
    playBeep();
    try {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Bro Z Barbershop ✂️', {
          body: "It's your turn! Please head to the barber now. 💈",
          icon: '/favicon.ico',
        });
      }
    } catch (_) {}
  };

  useEffect(() => {
    if (notifyMe && isMyTurn) triggerAlert();
  }, [isMyTurn, notifyMe]);

  const handleToggle = () => {
    const next = !notifyMe;
    setNotifyMe(next);
    if (next) setTimeout(() => playBeep(), 200);
  };

  const handleCancel = () => {
    sessionStorage.removeItem('myTicket');
    onCancel();
  };

  if (!ticket) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">

        {/* Header */}
        <div className="bg-black p-6 text-center">
          <h1 className="text-white font-bold text-lg">Queue Status</h1>
          <p className="text-gray-400 text-xs mt-1">Your Ticket #{String(ticket).padStart(3, '0')}</p>
        </div>

        <div className="p-8 text-center flex flex-col items-center">

          {/* Current serving */}
          <div className="mb-8">
            <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-2">Current Serving</p>
            <p className="text-8xl font-black text-gray-900 leading-none tracking-tighter">
              {String(serving).padStart(3, '0')}
            </p>
          </div>

          {/* Turn status badge */}
          {isMyTurn ? (
            <div className="p-4 rounded-2xl w-full mb-4 bg-green-100 border border-green-200">
              <p className="font-bold text-sm text-green-700">IT IS YOUR TURN! 🎉</p>
            </div>
          ) : (
            <div className="p-4 rounded-2xl w-full mb-4 bg-black">
              {/* ✅ Shows real count of people ahead, not ticket number math */}
              <p className="font-bold text-sm text-white">
                People ahead: {peopleAhead}
              </p>
            </div>
          )}

          {/* AI estimate */}
          {!isMyTurn && (
            <div className="w-full bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-100 p-4 rounded-2xl mb-6">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-purple-500" />
                <span className="text-[10px] font-bold text-purple-400 uppercase tracking-tighter">Smart AI Estimate</span>
              </div>
              <p className="text-sm text-gray-700 italic leading-relaxed text-left">
                {aiEstimate || "Recalculating your wait time..."}
              </p>
            </div>
          )}

          {/* Alert toggle */}
          <div className="w-full rounded-2xl mb-8 overflow-hidden border border-gray-100">
            <div className="flex justify-between items-center p-4 bg-gray-50">
              <div className="flex items-center gap-3 text-left">
                <div className={`p-2 rounded-xl transition-colors ${notifyMe ? 'bg-black' : 'bg-gray-200'}`}>
                  {notifyMe
                    ? <Volume2 className="w-4 h-4 text-white" />
                    : <BellRing className="w-4 h-4 text-gray-400" />}
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-800">Alert Me</p>
                  <p className="text-[10px] text-gray-400">{alertLabel}</p>
                </div>
              </div>
              <button
                onClick={handleToggle}
                className={`relative w-12 h-6 rounded-full transition-colors duration-300 focus:outline-none ${notifyMe ? 'bg-black' : 'bg-gray-300'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-300 ${notifyMe ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
            </div>
            {notifyMe && (
              <div className="px-4 py-2 bg-black/5 border-t border-gray-100">
                <p className="text-[10px] text-gray-400 text-left">
                  🔔 A sound will play when it's your turn. Keep this page open for best results.
                </p>
              </div>
            )}
          </div>

          {/* Cancel */}
          <button
            onClick={handleCancel}
            className="text-sm font-medium text-red-500 hover:text-red-700 transition-colors underline decoration-red-200 underline-offset-4"
          >
            Cancel Ticket
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomerSuccess;