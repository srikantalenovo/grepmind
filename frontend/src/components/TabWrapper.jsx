// src/components/TabWrapper.jsx
import React from "react";

export default function TabWrapper({ title, lastUpdated, toolbar, children }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <h2 className="text-xl font-bold text-indigo-700">{title}</h2>
        <div className="flex items-center gap-2">{toolbar}</div>
      </div>
      {lastUpdated && (
        <p className="text-sm text-gray-500 italic">
          Last updated: {lastUpdated.toLocaleTimeString()}
        </p>
      )}
      <div className="rounded-2xl border border-indigo-100 bg-white shadow-sm">
        {children}
      </div>
    </div>
  );
}
