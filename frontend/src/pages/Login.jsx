import React, { useState, useContext } from 'react'
import { AuthContext } from '../context/AuthContext'

export default function Login() {
  const { login } = useContext(AuthContext)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState(null)

  const submit = async (e) => {
    e.preventDefault()
    try {
      await login(email, password)
      alert('Logged in')
    } catch (err) {
      setErr(err.response?.data?.error || 'Login failed')
    }
  }

  return (
    <form onSubmit={submit} className="space-y-2">
      {err && <div className="text-red-600">{err}</div>}
      <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" className="w-full p-2 border" />
      <input value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password" type="password" className="w-full p-2 border" />
      <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">Login</button>
    </form>
  )
}
