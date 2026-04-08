import React from 'react';
import { Flower } from 'lucide-react';

const CustomerHome = ({ 
  name, 
  setName, 
  phone, 
  setPhone, 
  queueCount, 
  errors = {},
  handleJoinQueue, 
  handlePhoneChange, 
  queueImage,
  isJoining     = false,
  alreadyInQueue = false // ✅ true if sessionStorage has a ticket
}) => {

  // Button label and style based on state
  const buttonLabel = alreadyInQueue ? 'View My Queue' : isJoining ? 'Joining...' : 'Join Queue';
  const buttonDisabled = isJoining;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-10 px-6 font-sans">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-sm p-6 flex flex-col items-center text-center border border-gray-100">
        
        {/* Logo */}
        <div className="w-20 h-20 bg-[#0f172a] rounded-full flex items-center justify-center mb-4 shadow-md">
          <Flower className="w-10 h-10 text-yellow-500" strokeWidth={2.5} />
        </div>

        <h1 className="text-xl font-extrabold uppercase tracking-wide text-gray-900 mb-1">Bro Z Barber Shop</h1>

        <div className="w-full mb-6 bg-gray-900 rounded-2xl overflow-hidden border-4 border-white shadow-sm flex items-center justify-center" style={{ height: '180px' }}>
          <img src={queueImage} alt="Queue" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>

        <div className="mb-6">
          <p className="text-gray-600 font-medium text-sm">
            Customers in Queue: <span className="font-bold text-black text-lg">{queueCount}</span>
          </p>
        </div>

        <div className="w-full text-left">
          <h2 className="text-lg font-bold mb-4 text-gray-900 text-center">Enter Queue</h2>
          
          {/* Name Input — hidden if already in queue */}
          {!alreadyInQueue && (
            <div className="mb-4">
              <input 
                type="text" 
                placeholder="Name" 
                value={name} 
                onChange={(e) => setName(e.target.value)}
                disabled={isJoining}
                className={`w-full bg-gray-50 border px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 text-base ${errors?.name ? 'border-red-500 bg-red-50' : 'border-gray-200'}`} 
              />
              {errors?.name && <p className="text-red-500 text-xs mt-1 ml-1">Name is required</p>}
            </div>
          )}

          {/* Phone Input — hidden if already in queue */}
          {!alreadyInQueue && (
            <div className="mb-6">
              <div className={`flex w-full bg-gray-50 border rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-400 ${errors?.phone ? 'border-red-500 bg-red-50' : 'border-gray-200'}`}>
                <div className="bg-gray-100 border-r border-gray-200 text-gray-600 px-3 py-3 font-bold text-sm flex items-center shrink-0">+60</div>
                <input 
                  type="tel" 
                  placeholder="Mobile Number" 
                  value={phone} 
                  onChange={handlePhoneChange}
                  disabled={isJoining}
                  className="w-full bg-transparent text-gray-900 px-4 py-3 focus:outline-none text-base border-none" 
                />
              </div>
              {errors?.phone && <p className="text-red-500 text-xs mt-1 ml-1">Valid phone required</p>}
            </div>
          )}

          {/* Already in queue notice */}
          {alreadyInQueue && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-2xl text-sm text-blue-700 font-medium text-center">
              You already have an active ticket. Tap below to view your queue status.
            </div>
          )}

          {/* Join / View button */}
          <button 
            type="button"
            onClick={(e) => {
              e.preventDefault();
              handleJoinQueue();
            }}
            disabled={buttonDisabled}
            className={`w-full text-white font-bold py-4 rounded-full shadow-md text-lg transition-all
              ${buttonDisabled
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-black hover:bg-gray-800 active:scale-95'
              }`}
          >
            {buttonLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomerHome;