import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Link } from 'react-router-dom';

export default function Signup() {
  const { signup } = useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    try {
      await signup(email, password, name);
      setMsg('Account created — you can now login');
    } catch (err) {
      setMsg(err.response?.data?.error || 'Signup failed');
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4 p-4 border rounded bg-white">
      <h2 className="text-lg font-semibold">Signup</h2>
      {msg && <div>{msg}</div>}
      <input value={name} onChange={e => setName(e.target.value)} placeholder="Name" className="w-full p-2 border" />
      <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="w-full p-2 border" />
      <input value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" type="password" className="w-full p-2 border" />
      <div className="flex gap-2">
        <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded">Signup</button>
        <Link to="/login" className="px-4 py-2 bg-gray-200 rounded">Login</Link>
      </div>
    </form>
  );
}
