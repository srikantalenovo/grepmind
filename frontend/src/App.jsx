import React from 'react'
import { AuthProvider } from './context/AuthContext'
import Login from './pages/Login'
import Signup from './pages/Signup'

export default function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-md mx-auto py-8">
          <h1 className="text-2xl font-bold mb-4">GrepMind</h1>
          <Login />
          <hr className="my-4" />
          <Signup />
        </div>
      </div>
    </AuthProvider>
  )
}
