"use client";

import { useState, useEffect } from "react";
// import { getAdminInfo } from "@/lib/auth"; // Assuming an auth utility

interface Allocation {
  id: string;
  clientPAN: string;
  staffID: string;
  assessmentYear: string;
  status: string;
  billingStatus: string;
  comments?: string;
}

const ALL_ASSESSMENT_YEARS = [
  "2026-27",
  "2025-26",
  "2024-25",
  "2023-24",
  "2022-23",
];

export default function AdminDashboard() {
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [filteredAllocations, setFilteredAllocations] = useState<Allocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [newPassword, setNewPassword] = useState("");
  const [newAdminUsername, setNewAdminUsername] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [adminMessage, setAdminMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchAllocations();
  }, []);

  useEffect(() => {
    if (selectedYear) {
      setFilteredAllocations(allocations.filter((a) => a.assessmentYear === selectedYear));
    } else {
      setFilteredAllocations(allocations);
    }
  }, [selectedYear, allocations]);

  const fetchAllocations = async () => {
    try {
      setLoading(true);
      // In a real app, this would be an authenticated API call
      // For now, we\'ll simulate an API call
      const response = await fetch("/api/admin/allocations");
      if (!response.ok) {
        throw new Error("Failed to fetch allocations");
      }
      const data: Allocation[] = await response.json();
      setAllocations(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (allocationId: string, newStatus: string, comments?: string) => {
    try {
      const response = await fetch("/api/admin/update-allocation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allocationId, newStatus, comments }),
      });

      if (!response.ok) {
        throw new Error("Failed to update allocation status");
      }

      await fetchAllocations(); // Refresh allocations
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleReject = async (allocationId: string) => {
    const comments = prompt("Enter rejection comments:");
    if (comments) {
      await handleStatusUpdate(allocationId, "Rejected", comments);
    }
  };

  if (loading) return <div className="text-center py-8">Loading dashboard...</div>;
  if (error) return <div className="text-center py-8 text-red-500">Error: {error}</div>;

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <h1 className="text-3xl font-bold mb-8 text-center">Admin Tracker Dashboard</h1>

      <div className="mb-6">
        <label htmlFor="assessmentYear" className="block text-gray-700 text-sm font-bold mb-2">
          Filter by Assessment Year:
        </label>
        <select
          id="assessmentYear"
          className="shadow border rounded py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          value={selectedYear}
          onChange={(e) => setSelectedYear(e.target.value)}
        >
          <option value="">All Years</option>
          {ALL_ASSESSMENT_YEARS.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </div>

      {adminMessage && (
        <div className="mb-4 p-3 rounded-lg bg-blue-100 text-blue-800 text-center">
          {adminMessage}
        </div>
      )}

      {filteredAllocations.length === 0 ? (
        <p className="text-center text-gray-600">No allocations found.</p>
      ) : (
        <div className="overflow-x-auto bg-white p-6 rounded-lg shadow-md">
          <table className="min-w-full bg-white border border-gray-200">
            <thead>
              <tr className="bg-gray-100">
                <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">Sno</th>
                <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">Client Name</th>
                <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">PAN</th>
                <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">Allocated to Staff</th>
                <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">Status</th>
                <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">Comments/Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAllocations.map((allocation, index) => (
                <tr key={allocation.id} className="hover:bg-gray-50">
                  <td className="py-2 px-4 border-b text-sm text-gray-800">{index + 1}</td>
                  {/* You would typically fetch client name based on clientPAN */}
                  <td className="py-2 px-4 border-b text-sm text-gray-800">Client Name Placeholder</td>
                  <td className="py-2 px-4 border-b text-sm text-gray-800">{allocation.clientPAN}</td>
                  <td className="py-2 px-4 border-b text-sm text-gray-800">{allocation.staffID}</td>
                  <td className="py-2 px-4 border-b text-sm text-gray-800">{allocation.status}</td>
                  <td className="py-2 px-4 border-b text-sm text-gray-800">
                    {allocation.status === "COI Ready" && (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleStatusUpdate(allocation.id, "Ready to upload")}
                          className="bg-green-500 hover:bg-green-700 text-white font-bold py-1 px-3 rounded text-sm"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(allocation.id)}
                          className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-3 rounded text-sm"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                    {allocation.status === "Rejected" && (
                      <p className="text-red-500 text-sm">Rejected: {allocation.comments}</p>
                    )}
                    {allocation.status === "Filed" && (
                      <p className="text-green-600 text-sm">Automatically flagged as complete.</p>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Admin Settings Section */}
      <div className="mt-8 bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-semibold mb-4">Admin Settings</h2>

        {/* Form A: Reset My Password */}
        <div className="mb-6 p-4 border rounded-lg">
          <h3 className="text-xl font-medium mb-3">Reset My Password</h3>
          <form onSubmit={handleResetPassword}>
            <div className="mb-4">
              <label htmlFor="newPassword" className="block text-gray-700 text-sm font-bold mb-2">
                New Password
              </label>
              <input
                type="password"
                id="newPassword"
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            >
              Reset Password
            </button>
          </form>
        </div>

        {/* Form B: Create New Admin */}
        <div className="p-4 border rounded-lg">
          <h3 className="text-xl font-medium mb-3">Create New Admin</h3>
          <form onSubmit={handleCreateAdmin}>
            <div className="mb-4">
              <label htmlFor="newAdminUsername" className="block text-gray-700 text-sm font-bold mb-2">
                New Username
              </label>
              <input
                type="text"
                id="newAdminUsername"
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                value={newAdminUsername}
                onChange={(e) => setNewAdminUsername(e.target.value)}
                required
              />
            </div>
            <div className="mb-4">
              <label htmlFor="newAdminPassword" className="block text-gray-700 text-sm font-bold mb-2">
                New Password
              </label>
              <input
                type="password"
                id="newAdminPassword"
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                value={newAdminPassword}
                onChange={(e) => setNewAdminPassword(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            >
              Create Admin
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
