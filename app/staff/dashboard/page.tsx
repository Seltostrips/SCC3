"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface ClientData {
  name: string;
}

interface Allocation {
  id: string;
  clientPAN: string;
  assessmentYear: string;
  status: string;
  client: ClientData;
}

export default function StaffDashboard() {
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchAllocations();
  }, []);

  const fetchAllocations = async () => {
    try {
      const response = await fetch("/api/staff/allocations");
      if (response.ok) {
        const data = await response.json();
        setAllocations(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  "use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface ClientData {
  name: string;
}

interface Allocation {
  id: string;
  clientPAN: string;
  assessmentYear: string;
  status: string;
  client: ClientData;
}

export default function StaffDashboard() {
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchAllocations();
  }, []);

  const fetchAllocations = async () => {
    try {
      const response = await fetch("/api/staff/allocations");
      if (response.ok) {
        const data = await response.json();
        setAllocations(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (allocationId: string, newStatus: string) => {
    try {
      await fetch("/api/staff/update-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allocationId, newStatus }),
      });
      fetchAllocations(); // Refresh matrix
    } catch (err) {
      console.error("Failed to update status");
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
  };

  if (loading) return <div className="text-center py-12 text-slate-500">Loading Auditor Dashboard...</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <header className="mb-8 flex flex-col md:flex-row items-center justify-between border-b pb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Auditor Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Manage your assigned client portfolio and document requests.</p>
        </div>
        <button 
          onClick={handleLogout}
          className="mt-4 md:mt-0 bg-slate-200 hover:bg-slate-300 text-slate-800 text-sm font-bold py-2 px-6 rounded-lg transition-colors"
        >
          Sign Out
        </button>
      </header>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden max-w-6xl mx-auto">
        <div className="p-4 bg-slate-50 border-b border-slate-200">
          <h3 className="font-bold text-slate-900 text-sm">Active Assignments</h3>
        </div>
        
        {allocations.length === 0 ? (
          <p className="text-center py-12 text-slate-400 text-sm">No clients currently assigned to your ID.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left">
              <thead className="bg-slate-50">
                <tr>
                  <th className="py-3 px-4 text-xs font-bold text-slate-500">Client Name</th>
                  <th className="py-3 px-4 text-xs font-bold text-slate-500">PAN</th>
                  <th className="py-3 px-4 text-xs font-bold text-slate-500">Year</th>
                  <th className="py-3 px-4 text-xs font-bold text-slate-500">Status</th>
                  <th className="py-3 px-4 text-xs font-bold text-slate-500 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white text-sm">
                {allocations.map((allocation) => (
                  <tr key={allocation.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-semibold text-slate-800">{allocation.client?.name || "Unknown"}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">{allocation.clientPAN}</td>
                    <td className="py-3 px-4 text-slate-600">{allocation.assessmentYear}</td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {allocation.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {allocation.status === "Allocated" && (
                        <button 
                          onClick={() => updateStatus(allocation.id, "COI_Ready")}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-1.5 px-4 rounded-md text-xs transition-colors"
                        >
                          Request Documents
                        </button>
                      )}
                      {allocation.status === "COI_Ready" && (
                        <p className="text-xs text-amber-600 font-medium">Waiting on Client...</p>
                      )}
                      {/* Document upload dropzone will go here in the next step! */}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
  };

  if (loading) return <div className="text-center py-12 text-slate-500">Loading Auditor Dashboard...</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <header className="mb-8 flex flex-col md:flex-row items-center justify-between border-b pb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Auditor Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Manage your assigned client portfolio and document requests.</p>
        </div>
        <button 
          onClick={handleLogout}
          className="mt-4 md:mt-0 bg-slate-200 hover:bg-slate-300 text-slate-800 text-sm font-bold py-2 px-6 rounded-lg transition-colors"
        >
          Sign Out
        </button>
      </header>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden max-w-6xl mx-auto">
        <div className="p-4 bg-slate-50 border-b border-slate-200">
          <h3 className="font-bold text-slate-900 text-sm">Active Assignments</h3>
        </div>
        
        {allocations.length === 0 ? (
          <p className="text-center py-12 text-slate-400 text-sm">No clients currently assigned to your ID.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left">
              <thead className="bg-slate-50">
                <tr>
                  <th className="py-3 px-4 text-xs font-bold text-slate-500">Client Name</th>
                  <th className="py-3 px-4 text-xs font-bold text-slate-500">PAN</th>
                  <th className="py-3 px-4 text-xs font-bold text-slate-500">Year</th>
                  <th className="py-3 px-4 text-xs font-bold text-slate-500">Status</th>
                  <th className="py-3 px-4 text-xs font-bold text-slate-500 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white text-sm">
                {allocations.map((allocation) => (
                  <tr key={allocation.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-semibold text-slate-800">{allocation.client?.name || "Unknown"}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">{allocation.clientPAN}</td>
                    <td className="py-3 px-4 text-slate-600">{allocation.assessmentYear}</td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {allocation.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {allocation.status === "Allocated" && (
                        <button 
                          onClick={() => updateStatus(allocation.id, "COI_Ready")}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-1.5 px-4 rounded-md text-xs transition-colors"
                        >
                          Request Documents
                        </button>
                      )}
                      {allocation.status === "COI_Ready" && (
                        <p className="text-xs text-amber-600 font-medium">Waiting on Client...</p>
                      )}
                      {/* Document upload dropzone will go here in the next step! */}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
