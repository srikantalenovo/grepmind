import React, { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

export default function Dashboard() {
  const { user, logout } = useContext(AuthContext);

  return (
    <div className="p-10">
      <h1 className="text-3xl font-bold">Welcome, {user?.name}!</h1>
      <p className="text-gray-600 mt-2">Role: {user?.role}</p>
      <button
        onClick={logout}
        className="mt-5 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
      >
        Logout
      </button>
    </div>
  );
}
