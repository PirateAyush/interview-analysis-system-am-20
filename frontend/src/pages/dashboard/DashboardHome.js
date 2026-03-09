import React from 'react';

const DashboardHome = ({ user }) => {
  return (
    <div className="space-y-6">

      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl p-6 text-white shadow-lg">
        <p className="text-indigo-200 text-sm font-medium mb-1">Welcome back 👋</p>
        <h2 className="text-2xl font-bold mb-1">
          {user?.fullname || `${user?.firstname} ${user?.lastname}`}
        </h2>
        <p className="text-indigo-200 text-sm capitalize">{user?.type} · {user?.organization_id}</p>
      </div>

      {/* User + Org cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* User Details */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
            Your Profile
          </h3>
          <div className="flex items-center gap-4 mb-5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-xl font-bold shadow">
              {user?.firstname?.[0]}{user?.lastname?.[0]}
            </div>
            <div>
              <p className="text-lg font-bold text-slate-800">{user?.fullname || `${user?.firstname} ${user?.lastname}`}</p>
              <span className="text-xs font-semibold px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full capitalize">{user?.type}</span>
            </div>
          </div>
          <div className="space-y-3">
            {[
              { label: 'Email', value: user?.email },
              { label: 'Mobile', value: `+91 ${user?.mobile}` },
              { label: 'Status', value: user?.status },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">
                <span className="text-sm text-slate-400">{label}</span>
                <span className="text-sm font-medium text-slate-700 capitalize">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Organization Details */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
            Organization
          </h3>
          <div className="bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-100 rounded-xl p-4 mb-4">
            <p className="text-xs text-indigo-400 font-medium mb-1">Organization ID</p>
            <p className="font-mono font-bold text-indigo-700 text-lg tracking-wider">{user?.organization_id}</p>
          </div>
          <p className="text-sm text-slate-500 leading-relaxed">
            Share this Organization ID with your colleagues so they can join your workspace on InterviewAI.
          </p>
          <button
            onClick={() => navigator.clipboard.writeText(user?.organization_id)}
            className="mt-4 w-full py-2 text-sm font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors"
          >
            Copy Organization ID
          </button>
        </div>
      </div>

      {/* Coming soon modules */}
      <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-8 text-center">
        <div className="text-4xl mb-3">📊</div>
        <p className="text-slate-500 font-medium">Activity & Analytics</p>
        <p className="text-slate-400 text-sm mt-1">Stats and recent interview activity will appear here soon.</p>
      </div>

    </div>
  );
};

export default DashboardHome;