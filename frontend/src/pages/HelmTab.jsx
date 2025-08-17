import React, { useEffect, useState } from 'react';
import HelmReleaseDrawer from '../components/HelmReleaseDrawer';

const API_BASE = import.meta.env.VITE_API_BASE || '';

async function apiFetch(path, opts={}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json' }
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export default function HelmTab({ namespace }) {
  const [releases, setReleases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [search, setSearch] = useState('');

  const loadReleases = async () => {
    setLoading(true);
    try {
      const data = await apiFetch(`/api/helm/releases?namespace=${namespace}`);
      setReleases(data.items || []);
    } catch(e) {
      console.error(e);
      setReleases([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadReleases(); }, [namespace]);

  const filtered = releases.filter(r => r.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Helm Releases ({namespace})</h2>
        <input 
          type="text" placeholder="Search releases..."
          value={search} onChange={e=>setSearch(e.target.value)}
          className="border rounded px-2 py-1"
        />
      </div>

      <div className="overflow-x-auto border rounded shadow-sm">
        <table className="min-w-full">
          <thead>
            <tr className="bg-indigo-600 text-white text-left">
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Chart</th>
              <th className="px-3 py-2">App Version</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Last Updated</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={5} className="text-center py-4">Loading…</td></tr>}
            {!loading && filtered.length===0 && <tr><td colSpan={5} className="text-center py-4">No releases found.</td></tr>}
            {!loading && filtered.map((r,i)=>(
              <tr key={i} className="hover:bg-indigo-50 cursor-pointer" onClick={()=>{setSelected(r); setDrawerOpen(true);}}>
                <td className="px-3 py-2">{r.name}</td>
                <td className="px-3 py-2">{r.chart}</td>
                <td className="px-3 py-2">{r.app_version}</td>
                <td className="px-3 py-2">{r.status}</td>
                <td className="px-3 py-2">{r.updated}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {drawerOpen && selected && (
        <HelmReleaseDrawer
          open={drawerOpen}
          release={selected}
          onClose={()=>setDrawerOpen(false)}
          onActionDone={loadReleases}
        />
      )}
    </div>
  );
}
