import React from 'react';

const TeamMembers = ({ user }) => {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center">
        <div className="text-5xl mb-4">👥</div>
        <h2 className="text-xl font-bold text-slate-700 mb-2">Team Members</h2>
        <p className="text-slate-400 max-w-sm mx-auto">
          All members of <strong>{user?.organization_id}</strong> will be listed here with their roles and details.
        </p>
        <span className="inline-block mt-4 text-xs font-semibold bg-amber-100 text-amber-700 px-3 py-1 rounded-full">
          Coming up next
        </span>
      </div>
    </div>
  );
};

export default TeamMembers;