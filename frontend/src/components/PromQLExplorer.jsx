// src/components/PromQLExplorer.jsx
import React, { useContext, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL || 'http://grepmind.sritechhub.com/api';

export default function PromQLExplorer() {
  const { accessToken, user } = useContext(AuthContext);
  const role = user?.role || 'viewer';

  const [query, setQuery] = useState('up');
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState('');

  const run = async () => {
    try {
      setStatus('Running…');
      const headers = { Authorization: `Bearer ${accessToken}`, 'x-user-role': role };
      const res = await axios.post(`${API}/analytics/query`, { query }, { headers });
      setResult(res.data.data);
      setStatus('OK');
    } catch (e) {
      setResult(null);
      setStatus('Failed: ' + (e.response?.data?.details || e.message));
    }
  };

  return (
    <div className="border rounded-2xl p-4 space-y-3 bg-white shadow">
      <div className="font-semibold">PromQL Explorer</div>
      <input
        className="w-full border rounded-xl px-3 py-2"
        placeholder="PromQL query"
        value={query}
        onChange={e => setQuery(e.target.value)}
      />
      <div className="flex gap-2">
        <button onClick={run} className="px-3 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700">
          Run
        </button>
        <span className="text-sm text-gray-500">{status}</span>
      </div>
      {result && (
        <pre className="text-xs bg-gray-50 p-3 rounded-xl overflow-x-auto">{JSON.stringify(result, null, 2)}</pre>
      )}
    </div>
  );
}
