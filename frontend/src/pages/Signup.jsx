import React, { useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { FaUser, FaEnvelope, FaLock } from "react-icons/fa";
import backgroundImg from "../assets/signup-bg.png"; // Add your image in src/assets

export default function Signup() {
  const { signup } = useContext(AuthContext);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("USER");

  const handleSubmit = async (e) => {
    e.preventDefault();
    await signup(name, email, password, role);
  };

  return (
    <div
      className="flex justify-center items-center min-h-screen bg-cover bg-center"
      style={{ backgroundImage: `url(${backgroundImg})` }}
    >
      <form
        onSubmit={handleSubmit}
        className="bg-white bg-opacity-90 shadow-lg rounded-lg p-8 w-full max-w-md"
      >
        <h2 className="text-3xl font-bold text-center mb-6 text-purple-700">
          Create Account
        </h2>

        <div className="flex items-center mb-4 border-b border-gray-300">
          <FaUser className="text-purple-500 mr-3" />
          <input
            type="text"
            placeholder="Full Name"
            className="w-full py-2 bg-transparent focus:outline-none"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="flex items-center mb-4 border-b border-gray-300">
          <FaEnvelope className="text-purple-500 mr-3" />
          <input
            type="email"
            placeholder="Email Address"
            className="w-full py-2 bg-transparent focus:outline-none"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="flex items-center mb-4 border-b border-gray-300">
          <FaLock className="text-purple-500 mr-3" />
          <input
            type="password"
            placeholder="Password"
            className="w-full py-2 bg-transparent focus:outline-none"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <div className="mb-6">
          <label className="block mb-2 text-gray-700">Role</label>
          <select
            className="w-full p-2 border rounded"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="USER">User</option>
            <option value="EDITOR">Editor</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>

        <button
          type="submit"
          className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold"
        >
          Sign Up
        </button>
      </form>
    </div>
  );
}
