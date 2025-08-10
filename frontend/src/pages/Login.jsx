import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Link } from 'react-router-dom';

export default function Login() {
  const { login } = useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    try {
      await login(email, password);
    } catch (error) {
      setErr(error.response?.data?.error || 'Login failed');
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4 p-4 border rounded bg-white">
      <h2 className="text-lg font-semibold">Login</h2>
      {err && <div className="text-red-600">{err}</div>}
      <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="w-full p-2 border" />
      <input value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" type="password" className="w-full p-2 border" />
      <div className="flex gap-2">
        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">Login</button>
        <Link to="/signup" className="px-4 py-2 bg-gray-200 rounded">Signup</Link>
      </div>
    </form>
  );
}
