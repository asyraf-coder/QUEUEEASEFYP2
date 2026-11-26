import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import { auth, db } from './firebase';
import {
  collection, onSnapshot, addDoc, query, orderBy,
  deleteDoc, doc, setDoc, getDocs, getDoc, serverTimestamp,
  runTransaction
} from 'firebase/firestore';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';

// Pages
import CustomerHome    from './pages/CustomerHome';
import CustomerSuccess from './pages/CustomerSuccess';
import AdminLogin      from './pages/AdminLogin';
import AdminDashboard  from './pages/AdminDashboard';
import queueImage      from './beratur-new.jpg';

// ── Wait time helper ──────────────────────────────────────
// The Gemini API call was removed for security: an API key placed in
// frontend code is visible to anyone who opens the page, and a leaked
// key was reported in this repo (April 2026) and has been deleted.
// Never put an API key in this file or anywhere in the frontend.
// If AI estimates are wanted again, call Gemini from a backend /
// Firebase Function that keeps the key on the server only.
const getAIWaitTime = async (count, avgSpeed) => {
  const speedDisplay = avgSpeed > 0 ? Math.round(avgSpeed) : 20;
  return count === 0
    ? "You're next! Please be ready. 💈"
    : `Estimated wait: ${count * speedDisplay} minutes. Please stay nearby.`;
};

// ── Protected route wrapper ───────────────────────────────
function RequireAdmin({ adminUser, children }) {
  if (!adminUser) return <Navigate to="/admin" replace />;
  return children;
}

// ── Session helpers ──
const session = {
  getTicket: () => sessionStorage.getItem('myTicket'),
  getId:     () => sessionStorage.getItem('myId'),
  save:      (ticket, id) => {
    sessionStorage.setItem('myTicket', ticket);
    sessionStorage.setItem('myId', id);
  },
  clear:     () => {
    sessionStorage.removeItem('myTicket');
    sessionStorage.removeItem('myId');
  },
  hasTicket: () => !!sessionStorage.getItem('myTicket'),
}

function App() {
  const navigate = useNavigate();

  const [currentServing, setCurrentServing] = useState(0);
  const [queueCount, setQueueCount]         = useState(0);
  const [myNumber, setMyNumber] = useState(() => Number(session.getTicket()) || null);
  const [myId, setMyId]         = useState(() => session.getId() || null);
  const [customers, setCustomers]           = useState([]);
  const [history, setHistory]               = useState([]);
  const [aiEstimate, setAiEstimate]         = useState('');
  const [avgSpeed, setAvgSpeed]             = useState(20);
  const [lastResetTime, setLastResetTime]   = useState(null);
  const [isJoining, setIsJoining]           = useState(false);

  const lastProcessedAheadCount = useRef(null);

  const [name, setName]               = useState('');
  const [phone, setPhone]             = useState('');
  const [email, setEmail]             = useState('');
  const [password, setPassword]       = useState('');
  const [authError, setAuthError]     = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authReady, setAuthReady]     = useState(false);
  const [adminUser, setAdminUser]     = useState(null);

  // 1. UPDATED AUTH LISTENER WITH RETRY LOGIC
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setAdminUser(null);
        setAuthReady(true);
        return;
      }

      const verifyRole = async (retries = 0) => {
        const profileRef = doc(db, 'users', user.uid);
        const profileSnapshot = await getDoc(profileRef);

        if (profileSnapshot.exists() && profileSnapshot.data()?.role === 'admin') {
          setAdminUser({ uid: user.uid, email: user.email, ...profileSnapshot.data() });
          setAuthReady(true);
        } else if (retries < 3) {
          // Wait 1.5s and retry to allow Firestore to sync after registration
          setTimeout(() => verifyRole(retries + 1), 1500);
        } else {
          await signOut(auth);
          setAdminUser(null);
          setAuthReady(true);
        }
      };

      verifyRole();
    });
    return () => unsubscribe();
  }, []);

  // 2. Real-time status listener
  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'status', 'current_info'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setCurrentServing(Number(data.serving) || 0);
        setLastResetTime(data.lastResetAt?.toDate() || new Date(0));
      }
    });
    return () => unsubscribe();
  }, []);

  // 3. Real-time queue + history
  useEffect(() => {
    const qQueue = query(collection(db, 'queue'), orderBy('timestamp', 'asc'));
    const unsubQ = onSnapshot(qQueue, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setCustomers(data);
      setQueueCount(data.length);

      if (session.hasTicket()) {
        const myTicket = Number(session.getTicket());
        const stillInQueue = data.some(c => Number(c.ticket) === myTicket);
        if (!stillInQueue && myTicket > 0) {
          const serving = Number(sessionStorage.getItem('lastServing')) || 0;
          if (serving !== myTicket) {
            session.clear();
            setMyNumber(null);
            setMyId(null);
          }
        }
      }
    });

    const qHistory = query(collection(db, 'history'), orderBy('servedAt', 'desc'));
    const unsubH   = onSnapshot(qHistory, (snapshot) => {
      setHistory(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { unsubQ(); unsubH(); };
  }, []);

  // 4. Live AI update
  useEffect(() => {
    if (myNumber && currentServing < myNumber) {
      const peopleAhead = customers.filter(c => Number(c.ticket) < Number(myNumber)).length;
      if (peopleAhead !== lastProcessedAheadCount.current) {
        lastProcessedAheadCount.current = peopleAhead;
        getAIWaitTime(peopleAhead, avgSpeed).then(res => setAiEstimate(res));
      }
    }
  }, [currentServing, myNumber, customers, avgSpeed]);

  // 5. Turn trigger
  useEffect(() => {
    if (myNumber && Number(currentServing) === Number(myNumber)) {
      sessionStorage.setItem('lastServing', currentServing);
      setAiEstimate("✂️ It's your turn! Please head to the barber now! 💈");
    }
  }, [currentServing, myNumber]);

  // ── Handlers ──

  const handleJoinQueue = async () => {
    if (!name.trim() || !phone.trim() || isJoining) return;
    if (session.hasTicket()) { navigate('/queue'); return; }

    setIsJoining(true);
    try {
      const counterRef = doc(db, 'counters', 'ticket_counter');
      let nextNumber;

      await runTransaction(db, async (transaction) => {
        const counterSnap = await transaction.get(counterRef);
        const lastTicket  = counterSnap.exists() ? (Number(counterSnap.data().lastTicket) || 0) : 0;
        nextNumber = Math.max(lastTicket, Number(currentServing)) + 1;
        transaction.set(counterRef, { lastTicket: nextNumber }, { merge: true });
      });

      const docRef = await addDoc(collection(db, 'queue'), {
        name: name.trim(),
        phone: phone.trim(),
        ticket: nextNumber,
        timestamp: new Date(),
        status: 'waiting',
        price: 25,
        service: 'Haircut'
      });

      session.save(nextNumber, docRef.id);
      setMyNumber(nextNumber);
      setMyId(docRef.id);
      navigate('/queue');

    } catch (e) {
      alert("System busy. Try again.");
    } finally {
      setIsJoining(false);
    }
  };

  const handleCallNext = async () => {
    if (customers.length === 0) return;
    const firstCustomer = customers[0];
    const now = new Date();
    try {
      await setDoc(doc(db, 'status', 'current_info'), { serving: Number(firstCustomer.ticket) }, { merge: true });
      await addDoc(collection(db, 'history'), {
        ...firstCustomer,
        servedAt: now,
        status: 'completed',
        waitMinutes: firstCustomer.timestamp?.toDate ? Math.round((now - firstCustomer.timestamp.toDate()) / 60000) : 0
      });
      await deleteDoc(doc(db, 'queue', firstCustomer.id));
    } catch (e) { console.error(e); }
  };

  const handleResetQueue = async () => {
    if (!window.confirm("Reset all data for the new shift?")) return;
    try {
      await setDoc(doc(db, 'status', 'current_info'), { serving: 0, lastResetAt: serverTimestamp() }, { merge: true });
      await setDoc(doc(db, 'counters', 'ticket_counter'), { lastTicket: 0 });
      const snapshot = await getDocs(query(collection(db, 'queue')));
      await Promise.all(snapshot.docs.map(d => deleteDoc(doc(db, 'queue', d.id))));
      alert("Shift Reset! 📈");
    } catch (err) { console.error(err); }
  };

  // UPDATED ADMIN LOGIN HANDLER
  const handleAdminLogin = async () => {
    if (!email.trim() || !password.trim()) { setAuthError('Credentials required.'); return; }
    setAuthLoading(true);
    setAuthError('');
    try {
      const credentials = await signInWithEmailAndPassword(auth, email.trim(), password);
      const profileSnap = await getDoc(doc(db, 'users', credentials.user.uid));
      
      if (profileSnap.exists() && profileSnap.data()?.role === 'admin') {
        setAdminUser({ uid: credentials.user.uid, email: credentials.user.email, ...profileSnap.data() });
        navigate('/admin/dashboard');
      } else {
        await signOut(auth);
        setAuthError('Access Denied: Admin role missing.');
      }
    } catch {
      setAuthError('Login failed. Check details.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setAdminUser(null);
    navigate('/');
  };

  const handleCancelTicket = async () => {
    const idToDelete = myId || session.getId();
    try {
      if (idToDelete) await deleteDoc(doc(db, 'queue', idToDelete));
    } catch (e) { console.error(e); }
    finally {
      session.clear();
      setMyNumber(null);
      setMyId(null);
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      <Routes>
        <Route path="/" element={
          <CustomerHome
            name={name} setName={setName}
            phone={phone} setPhone={setPhone}
            handlePhoneChange={(e) => /^\d*$/.test(e.target.value) && setPhone(e.target.value)}
            queueCount={queueCount}
            handleJoinQueue={handleJoinQueue}
            queueImage={queueImage}
            isJoining={isJoining}
            alreadyInQueue={session.hasTicket()}
            errors={{}} setErrors={() => {}}
          />
        } />

        <Route path="/queue" element={
          <CustomerSuccess
            myNumber={myNumber}
            currentServing={currentServing}
            customers={customers}
            aiEstimate={aiEstimate}
            onCancel={handleCancelTicket}
          />
        } />

        <Route path="/admin" element={
          adminUser 
            ? <Navigate to="/admin/dashboard" replace /> 
            : <AdminLogin
                email={email} setEmail={setEmail}
                password={password} setPassword={setPassword}
                onLogin={handleAdminLogin}
                onBack={() => navigate('/')}
                authError={authError}
                authLoading={authLoading || !authReady}
              />
        } />

        <Route path="/admin/dashboard" element={
          <RequireAdmin adminUser={adminUser}>
            <AdminDashboard
              currentServing={currentServing}
              queueCount={queueCount}
              customers={customers}
              history={history}
              lastResetTime={lastResetTime}
              handleCallNext={handleCallNext}
              handleResetQueue={handleResetQueue}
              handleRemoveCustomer={(id) => deleteDoc(doc(db, 'queue', id))}
              onLogout={handleLogout}
            />
          </RequireAdmin>
        } />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default App;
