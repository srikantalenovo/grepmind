import React, { useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Signup() {
  const { signup } = useContext(AuthContext);
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [role, setRole] = useState("viewer");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      await signup(name, email, password, role);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.error || "Signup failed");
    }
  };

  return (
    <div className="flex h-screen">
      {/* Left side */}
      <div className="w-1/2 bg-gradient-to-br from-indigo-600 to-purple-500 flex flex-col justify-center items-center text-white p-10">
        <h1 className="text-5xl font-bold mb-4">Create Account</h1>
        <p className="text-lg opacity-80">Join us and explore</p>
      </div>

      {/* Right side */}
      <div className="w-1/2 flex justify-center items-center p-10">
        <form className="w-full max-w-sm space-y-5" onSubmit={handleSubmit}>
          <h2 className="text-2xl font-bold">Sign Up</h2>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <input
            type="text"
            placeholder="Name"
            className="w-full border p-2 rounded"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <input
            type="email"
            placeholder="Email"
            className="w-full border p-2 rounded"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Password"
            className="w-full border p-2 rounded"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <select
            className="w-full border p-2 rounded"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="admin">ADMIN</option>
            <option value="editor">EDITOR</option>
            <option value="viewer">VIEWER</option>
          </select>

          <button
            type="submit"
            className="w-full bg-purple-600 text-white py-2 rounded hover:bg-purple-700"
          >
            Sign Up
          </button>

          <p className="text-sm">
            Already have an account?{" "}
            <a href="/login" className="text-purple-600 hover:underline">
              Login
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}
