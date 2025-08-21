import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL || 'http://grepmind.sritechhub.com/api';

export default function PromQLExplorer() {
  const { accessToken, user } = useContext(AuthContext);
  const role = user?.role || 'viewer';

  const [query, setQuery] = useState('');
  const [result, setResult] = useState([]);

  const runQuery = async () => {
    try {
      const res = await axios.post(`${API}/analytics/query`, { query }, {
        headers: { Authorization: `Bearer ${accessToken}`, 'x-user-role': role },
      });
      setResult(res.data.data || []);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || err.message);
    }
  };

  return (
    <div className="border p-4 rounded-lg bg-gray-50 mt-4">
      <h3 className="font-semibold mb-2">PromQL Explorer</h3>
      <input
        className="w-full border px-2 py-1 rounded mb-2"
        placeholder="Enter PromQL query"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <button className="px-3 py-1 bg-blue-600 text-white rounded" onClick={runQuery}>
        Run Query
      </button>
      {result.length > 0 && (
        <div className="mt-2 text-sm">
          {result.map((r, idx) => (
            <div key={idx}>{JSON.stringify(r)}</div>
          ))}
        </div>
      )}
    </div>
  );
}
