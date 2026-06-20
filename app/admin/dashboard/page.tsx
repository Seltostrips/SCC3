"use client";

import { useState, useEffect } from "react";

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

  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);

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

      await fetchAllocations();
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

  const downloadTemplate = () => {
    const headers = "PAN,StaffID,AssessmentYear\n";
    const sample = "ABCDE1234F,staff_username,2026-27\n"; 
    const blob = new Blob([headers + sample], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "allocation_template.csv";
    a.click();
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      setUploadMessage("Please select a file first.");
      return;
    }
    setUploading(true);
    setUploadMessage("Uploading...");
    const formData = new FormData();
    formData.append("csvFile", uploadFile);

    try {
      const res = await fetch("/api/admin/upload-allocations", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setUploadMessage("Upload successful!");
        setUploadFile(null);
        fetchAllocations();
      } else {
        setUploadMessage(data.message || "Upload failed");
      }
    } catch (err) {
      setUploadMessage("An error occurred during upload.");
    } finally {
      setUploading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminMessage("Processing password reset...");
    try {
      const res = await fetch("/api/admin/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setAdminMessage("Password updated successfully!");
        setNewPassword("");
      } else {
        setAdminMessage(data.error || "Failed to update password");
      }
    } catch (err) {
      setAdminMessage("An error occurred.");
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminMessage("Creating new admin...");
    try {
      const res = await fetch("/api/admin/create-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: newAdminUsername, password: newAdminPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setAdminMessage("Admin created successfully!");
        setNewAdminUsername("");
        setNewAdminPassword("");
      } else {
        setAdminMessage(data.error || "Failed to create admin");
      }
    } catch (err) {
      setAdminMessage("An error occurred.");
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

      {/* Upload Allocations Section */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold">Upload Allocations CSV</h2>
          <button
            onClick={downloadTemplate}
            className="text-blue-600 hover:text-blue-800 underline text-sm font-medium"
          >
            Download CSV Template
          </button>
        </div>
        <form onSubmit={handleFileUpload} className="flex flex-col sm:flex-row items-center gap-4">
          <input
            type="file"
            accept=".csv"
            onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded border file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
          />
          <button
            type="submit"
            disabled={!uploadFile || uploading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-2 px-6 rounded whitespace-nowrap"
          >
            {uploading ? "Uploading..." : "Upload"}
          </button>
        </form>
        {uploadMessage && (
          <p className={`mt-3 text-sm font-medium ${uploadMessage.includes("successful") ? "text-green-600" : "text-red-600"}`}>
            {uploadMessage}
          </p>
        )}
      </div>

      {filteredAllocations.length === 0 ? (
        <p className="text-center text-gray-600">No allocations found.</p>
      ) : (
        <div className="overflow-x-auto bg-white p-6 rounded-lg shadow-md mb-8">
          <table className="min-w-full bg-white border border-gray-200">
            <thead>
              <tr className="bg-gray-100">
                <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">Sno</th>
                <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">Client PAN</th>
                <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">Allocated to Staff</th>
                <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">Status</th>
                <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">Comments/Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAllocations.map((allocation, index) => (
                <tr key={allocation.id} className="hover:bg-gray-50">
                  <td className="py-2 px-4 border-b text-sm text-gray-800">{index + 1}</td>
                  <td className="py-2 px-4 border-b text-sm text-gray-800">{allocation.clientPAN}</td>
                  <td className="py-2 px-4 border-b text-sm text-gray-800">{allocation.staffID}</td>
                  <td className="py-2 px-4 border-b text-sm text-gray-800">{allocation.status}</td>
                  <td className="py-2 px-4 border-b text-sm text-gray-800">
                    {allocation.status === "COI_Ready" && (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleStatusUpdate(allocation.id, "Ready_to_upload")}
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
      <div className="bg-white p-6 rounded-lg shadow-md">
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
