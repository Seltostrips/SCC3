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

type TabType = "allocations" | "onboarding" | "settings";

export default function AdminDashboard() {
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<TabType>("allocations");

  // Core Data States
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [filteredAllocations, setFilteredAllocations] = useState<Allocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<string>("");
  
  // Administrative States
  const [newPassword, setNewPassword] = useState("");
  const [newAdminUsername, setNewAdminUsername] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [adminMessage, setAdminMessage] = useState<string | null>(null);

  // File Upload Handling (Allocations)
  const [allocationFile, setAllocationFile] = useState<File | null>(null);
  const [uploadingAllocations, setUploadingAllocations] = useState(false);
  const [allocationMessage, setAllocationMessage] = useState<string | null>(null);

  // File Upload Handling (Staff/Clients User Profiles)
  const [userFile, setUserFile] = useState<File | null>(null);
  const [uploadingUsers, setUploadingUsers] = useState(false);
  const [userMessage, setUserMessage] = useState<string | null>(null);

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
      if (!response.ok) throw new Error("Failed to fetch current allocation maps.");
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
      if (!response.ok) throw new Error("Status routing state modification rejected.");
      await fetchAllocations();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleReject = async (allocationId: string) => {
    const comments = prompt("Provide diagnostic context / rejection reason:");
    if (comments) {
      await handleStatusUpdate(allocationId, "Rejected", comments);
    }
  };

  const downloadAllocationTemplate = () => {
    const headers = "PAN,StaffID,AssessmentYear\n";
    const sample = "ABCDE1234F,staff_username,2026-27\n"; 
    const blob = new Blob([headers + sample], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "allocation_template.csv";
    a.click();
  };

  const downloadUserTemplate = () => {
    const headers = "role,username,password,name,pan,email,phone\n";
    const sampleStaff = "staff,tax_expert_1,securePass123,Rahul Sharma,,,rahul@firm.com,9876543210\n";
    const sampleClient = "client,client_abc,,,Alpha Corp,ABCDE1234F,contact@alpha.com,\n";
    const blob = new Blob([headers + sampleStaff + sampleClient], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "user_onboarding_template.csv";
    a.click();
  };

  const handleAllocationUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allocationFile) {
      setAllocationMessage("Execution halted: Missing target CSV file payload.");
      return;
    }
    setUploadingAllocations(true);
    setAllocationMessage("Processing parser stream...");
    const formData = new FormData();
    formData.append("csvFile", allocationFile);

    try {
      const res = await fetch("/api/admin/upload-allocations", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setAllocationMessage("Data parsed and upserted successfully.");
        setAllocationFile(null);
        fetchAllocations();
      } else {
        setAllocationMessage(data.message || "Parsing error or schema rejection encountered.");
      }
    } catch (err) {
      setAllocationMessage("Network execution context crashed.");
    } finally {
      setUploadingAllocations(false);
    }
  };

  const handleUserUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userFile) {
      setUserMessage("Execution halted: Missing target profile CSV payload.");
      return;
    }
    setUploadingUsers(true);
    setUserMessage("Streaming user ingestion parameters...");
    const formData = new FormData();
    formData.append("csvFile", userFile);

    try {
      const res = await fetch("/api/admin/upload-users", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setUserMessage(`Ingestion successful: ${data.count || 0} entities synchronized.`);
        setUserFile(null);
      } else {
        setUserMessage(data.error || "Profile validation mapping exception.");
      }
    } catch (err) {
      setUserMessage("Gateway processing transaction timed out.");
    } finally {
      setUploadingUsers(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminMessage("Evaluating security assertion...");
    try {
      const res = await fetch("/api/admin/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });
      if (res.ok) {
        setAdminMessage("Root administrative credentials modified successfully.");
        setNewPassword("");
      } else {
        setAdminMessage("Credential mutation rejected.");
      }
    } catch (err) {
      setAdminMessage("Context processing failure.");
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminMessage("Provisioning auxiliary identity...");
    try {
      const res = await fetch("/api/admin/create-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: newAdminUsername, password: newAdminPassword }),
      });
      if (res.ok) {
        setAdminMessage("Secondary administrator profile initialized.");
        setNewAdminUsername("");
        setNewAdminPassword("");
      } else {
        setAdminMessage("Profile setup execution error.");
      }
    } catch (err) {
      setAdminMessage("Gateway failure mapping.");
    }
  };

  if (loading) return <div className="text-center py-12 font-medium text-gray-500">Retrieving analytical telemetry...</div>;
  if (error) return <div className="text-center py-12 text-red-500 font-semibold">Error Context Break: {error}</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 text-slate-800">
      <header className="mb-8 text-center md:text-left md:flex md:items-center md:justify-between border-b pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">SCC Administration</h1>
          <p className="text-sm text-slate-500 mt-1">Management, allocation indexing, and onboarding engines.</p>
        </div>
      </header>

      {/* State Tracking Notification Banner */}
      {adminMessage && (
        <div className="mb-6 p-4 rounded-xl border bg-blue-50 border-blue-200 text-blue-800 text-sm font-medium">
          {adminMessage}
        </div>
      )}

      {/* Navigation Tab Bar */}
      <div className="flex border-b border-slate-200 mb-8 space-x-2">
        <button
          onClick={() => setActiveTab("allocations")}
          className={`py-2 px-4 font-semibold text-sm border-b-2 transition-all ${
            activeTab === "allocations"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          }`}
        >
          Allocation Matrix
        </button>
        <button
          onClick={() => setActiveTab("onboarding")}
          className={`py-2 px-4 font-semibold text-sm border-b-2 transition-all ${
            activeTab === "onboarding"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          }`}
        >
          User Onboarding Pipeline
        </button>
        <button
          onClick={() => setActiveTab("settings")}
          className={`py-2 px-4 font-semibold text-sm border-b-2 transition-all ${
            activeTab === "settings"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          }`}
        >
          Access Controls & Security
        </button>
      </div>

      {/* TAB 1: ALLOCATION TRACKER MATRIX */}
      {activeTab === "allocations" && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Ingest Allocation Structure</h2>
                <p className="text-xs text-slate-400">Map processing records inside the master matrix ledger.</p>
              </div>
              <button
                onClick={downloadAllocationTemplate}
                className="text-blue-600 hover:text-blue-800 underline text-xs font-semibold self-start sm:self-center"
              >
                Get Allocation CSV Schema Layout
              </button>
            </div>
            <form onSubmit={handleAllocationUpload} className="flex flex-col sm:flex-row items-center gap-4">
              <input
                type="file"
                accept=".csv"
                onChange={(e) => setAllocationFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg border file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
              />
              <button
                type="submit"
                disabled={!allocationFile || uploadingAllocations}
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-semibold text-sm py-2 px-6 rounded-lg transition-all whitespace-nowrap"
              >
                {uploadingAllocations ? "Parsing System File..." : "Execute Mass Upload"}
              </button>
            </form>
            {allocationMessage && (
              <p className={`mt-3 text-xs font-medium ${allocationMessage.includes("successful") ? "text-green-600" : "text-red-600"}`}>
                {allocationMessage}
              </p>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <h3 className="font-bold text-slate-900 text-sm">Tracking State Monitor</h3>
              <div className="flex items-center space-x-2">
                <label htmlFor="yearFilter" className="text-xs text-slate-500 font-medium whitespace-nowrap">Scope Ledger Block:</label>
                <select
                  id="yearFilter"
                  className="bg-white border text-xs rounded-lg py-1 px-2 text-slate-700 font-medium focus:outline-none"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                >
                  <option value="">Full Compilation Matrix</option>
                  {ALL_ASSESSMENT_YEARS.map((year) => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
            </div>

            {filteredAllocations.length === 0 ? (
              <p className="text-center py-12 text-slate-400 text-sm">Zero metrics match current filter configuration scope.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-left">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="py-3 px-4 text-xs font-bold text-slate-500 tracking-wider">Idx</th>
                      <th className="py-3 px-4 text-xs font-bold text-slate-500 tracking-wider">Client PAN</th>
                      <th className="py-3 px-4 text-xs font-bold text-slate-500 tracking-wider">Assigned Auditor</th>
                      <th className="py-3 px-4 text-xs font-bold text-slate-500 tracking-wider">State Code</th>
                      <th className="py-3 px-4 text-xs font-bold text-slate-500 tracking-wider">System Pipeline Hooks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white text-sm">
                    {filteredAllocations.map((allocation, index) => (
                      <tr key={allocation.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 text-slate-400 font-medium">{index + 1}</td>
                        <td className="py-3 px-4 font-mono font-semibold text-slate-700">{allocation.clientPAN}</td>
                        <td className="py-3 px-4 text-slate-600 font-medium">{allocation.staffID}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            allocation.status === "Filed" ? "bg-green-100 text-green-800" :
                            allocation.status === "Rejected" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"
                          }`}>
                            {allocation.status}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {allocation.status === "COI_Ready" && (
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleStatusUpdate(allocation.id, "Ready_to_upload")}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-1 px-3 rounded-md text-xs transition-colors"
                              >
                                Route Verification
                              </button>
                              <button
                                onClick={() => handleReject(allocation.id)}
                                className="bg-rose-600 hover:bg-rose-700 text-white font-semibold py-1 px-3 rounded-md text-xs transition-colors"
                              >
                                Trigger Reject
                              </button>
                            </div>
                          )}
                          {allocation.status === "Rejected" && (
                            <p className="text-rose-600 text-xs italic max-w-xs truncate">Log: {allocation.comments}</p>
                          )}
                          {allocation.status === "Filed" && (
                            <p className="text-slate-400 text-xs">Immutable Record State Set.</p>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: STAFF & CLIENTS USER PROFILE ONBOARDING */}
      {activeTab === "onboarding" && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm max-w-4xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 border-b pb-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Onboard Users Pool</h2>
              <p className="text-xs text-slate-400 mt-1">Batch construct staff auditor profiles and corporate operational scopes.</p>
            </div>
            <button
              onClick={downloadUserTemplate}
              className="text-blue-600 hover:text-blue-800 underline text-xs font-semibold self-start sm:self-center"
            >
              Get User Upload Layout Sheet
            </button>
          </div>

          <form onSubmit={handleUserUpload} className="space-y-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-dashed border-slate-300 flex flex-col items-center justify-center py-8">
              <input
                type="file"
                accept=".csv"
                onChange={(e) => setUserFile(e.target.files?.[0] || null)}
                className="block text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg border file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
              />
              <p className="text-[11px] text-slate-400 mt-2">Processes both Roles: "staff" and "client" natively.</p>
            </div>
            
            <button
              type="submit"
              disabled={!userFile || uploadingUsers}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-semibold text-sm py-2 px-6 rounded-lg transition-all"
            >
              {uploadingUsers ? "Syncing Identity Clusters..." : "Commit Batch Onboarding"}
            </button>
          </form>

          {userMessage && (
            <div className={`mt-4 p-3 rounded-lg text-xs font-medium ${userMessage.includes("Ingestion successful") ? "bg-green-50 text-green-800 border border-green-200" : "bg-rose-50 text-rose-800 border border-rose-200"}`}>
              {userMessage}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: SECURITY CONTROLS & AUTHENTICATION MUTATION */}
      {activeTab === "settings" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl">
          {/* Box A: Root Administrative Mutation Hooks */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">Reset Account Master Password</h3>
              <p className="text-xs text-slate-400 mb-4">Mutates current session hashing mechanisms securely.</p>
              <form onSubmit={handleResetPassword} className="space-y-3">
                <div>
                  <label htmlFor="pass" className="block text-slate-500 text-xs font-bold mb-1">Set Password Target</label>
                  <input
                    type="password"
                    id="pass"
                    className="w-full bg-slate-50 border rounded-lg py-2 px-3 text-sm focus:outline-none focus:bg-white transition-colors"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold py-2 px-4 rounded-lg transition-colors">
                  Authorize Credential Reset
                </button>
              </form>
            </div>
          </div>

          {/* Box B: Auxiliary Account Allocation */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">Initialize Secondary Admin</h3>
              <p className="text-xs text-slate-400 mb-4">Provision localized access keys for auxiliary operational units.</p>
              <form onSubmit={handleCreateAdmin} className="space-y-3">
                <div>
                  <label htmlFor="auxUser" className="block text-slate-500 text-xs font-bold mb-1">Username Identifier</label>
                  <input
                    type="text"
                    id="auxUser"
                    className="w-full bg-slate-50 border rounded-lg py-2 px-3 text-sm focus:outline-none focus:bg-white transition-colors"
                    value={newAdminUsername}
                    onChange={(e) => setNewAdminUsername(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="auxPass" className="block text-slate-500 text-xs font-bold mb-1">Target Account Key Phrase</label>
                  <input
                    type="password"
                    id="auxPass"
                    className="w-full bg-slate-50 border rounded-lg py-2 px-3 text-sm focus:outline-none focus:bg-white transition-colors"
                    value={newAdminPassword}
                    onChange={(e) => setNewAdminPassword(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-2 px-4 rounded-lg transition-colors">
                  Provision Administrative Account
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
