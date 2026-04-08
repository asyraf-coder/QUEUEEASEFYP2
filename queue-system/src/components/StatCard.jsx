import React from 'react';

const StatCard = ({ title, value, icon: Icon, colorClass }) => {
  return (
    <div className="bg-[#1e293b] p-5 rounded-2xl border border-white/5 flex flex-col items-center">
      <div className={`p-3 rounded-lg mb-2 ${colorClass}`}>
        <Icon size={20} />
      </div>
      <p className="text-[10px] text-white/40 uppercase font-bold mb-1">{title}</p>
      <p className="text-2xl font-black">{value}</p>
    </div>
  );
};

export default StatCard;