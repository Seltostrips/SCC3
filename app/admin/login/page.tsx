"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function FirmPortalLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (res.ok) {
        // Smart Routing: Direct the user based on their specific Role
        if (data.user?.role === "STAFF") {
          router.push("/staff/dashboard");
        } else if (data.user?.role === "ADMIN") {
          router.push("/admin/dashboard");
        } else {
          setError("Unauthorized access. Clients must use the dedicated Client Portal.");
        }
      } else {
        setError(data.message || "Invalid credentials");
      }
    } catch (err) {
      setError("An error occurred during authentication.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md border border-slate-200">
        <h1 className="text-2xl font-bold text-center mb-2 text-slate-900">Internal Firm Portal</h1>
        <p className="text-center text-slate-500 text-sm mb-6">Secure access for Admins and Staff Auditors</p>
        
        {error && (
          <div className="bg-rose-50 text-rose-600 p-3 rounded-lg mb-4 text-sm font-medium border border-rose-200">
            {error}
          </div>
        )}
        
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-slate-700 text-sm font-bold mb-2">Username / Staff ID</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
              required
            />
          </div>
          <div>
            <label className="block text-slate-700 text-sm font-bold mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 text-white font-bold py-2.5 px-4 rounded-lg hover:bg-slate-800 transition-colors disabled:bg-slate-400"
          >
            {loading ? "Authenticating..." : "Secure Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
