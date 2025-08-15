import React, { useState } from 'react';
import ProblemList from '../components/ProblemList.jsx';

const DEFAULT_ROLE = 'editor'; // change to 'admin' for testing admin mode

export default function Analyzer() {
  const [role] = useState(DEFAULT_ROLE);

  // Only allow editor or admin
  const allowedRoles = ['editor', 'admin'];
  if (!allowedRoles.includes(role)) {
    return (
      <div className="p-6 text-center text-red-600 font-semibold">
        Access Denied – You need to be an Editor or Admin to use the Analyzer.
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-bold text-indigo-800">Analyzer</h1>
        <span className="text-sm text-gray-500">
          Current Role: <span className="font-semibold">{role}</span>
        </span>
      </div>

      {/* Problem Scan List */}
      <ProblemList role={role} />
    </div>
  );
}
