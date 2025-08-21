import React, { useState } from 'react';
import axios from 'axios';
const API = import.meta.env.VITE_API_URL || 'http://grepmind.sritechhub.com/api';

export default function PromQLExplorer() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState(null);
  const accessToken = localStorage.getItem('accessToken');

  const runQuery = async () => {
    if (!query) return;
    try {
      const res = await axios.post(`${API}/analytics/query`, { query }, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setResult(res.data.data);
    } catch (e) {
      setResult({ error: e.message });
    }
  };

  return (
    <div className="border rounded-lg p-3 space-y-2">
      <h4 className="font-semibold">PromQL Explorer</h4>
      <input className="w-full border px-3 py-2 rounded-lg" placeholder="PromQL query" value={query} onChange={e => setQuery(e.target.value)} />
      <button className="px-3 py-2 bg-indigo-600 text-white rounded-lg" onClick={runQuery}>Run Query</button>
      {result && <pre className="bg-gray-100 p-2 rounded-lg max-h-64 overflow-auto">{JSON.stringify(result, null, 2)}</pre>}
    </div>
  );
}
