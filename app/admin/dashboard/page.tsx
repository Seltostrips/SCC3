"use client";

import { useState, useEffect, useMemo } from "react";

interface Allocation {
  id: string;
  clientPAN: string;
  staffID: string;
  assessmentYear: string;
  status: string;
  billingStatus: string;
  comments?: string;
  client?: { name: string };
  staff?: { name: string };
}

interface User {
  id: string;
  username: string;
  name: string;
  role: string;
}

const ALL_ASSESSMENT_YEARS = [
  "2026-27",
  "2025-26",
  "2024-25",
  "2023-24",
  "2022-23",
];

type TabType = "monitor" | "allocations" | "onboarding" | "directory" | "settings";

export default function AdminDashboard() {
  // Navigation Tabs (Monitor is now default)
  const [activeTab, setActiveTab] = useState<TabType>("monitor");

  // Core Data States
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [filteredAllocations, setFilteredAllocations] = useState<Allocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Search & Filter
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  
  // Document Viewer State
  const [expandedDocs, setExpandedDocs] = useState<Record<string, any[]>>({});

  // Directory States
  const [usersList, setUsersList] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Administrative States
  const [newPassword, setNewPassword] = useState("");
  const [newAdminUsername, setNewAdminUsername] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [adminMessage, setAdminMessage] = useState<string | null>(null);

  // File Upload Handling
  const [allocationFile, setAllocationFile] = useState<File | null>(null);
  const [uploadingAllocations, setUploadingAllocations] = useState(false);
  const [allocationMessage, setAllocationMessage] = useState<string | null>(null);

  const [userFile, setUserFile] = useState<File | null>(null);
  const [uploadingUsers, setUploadingUsers] = useState(false);
  const [userMessage, setUserMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchAllocations();
  }, []);

  useEffect(() => {
    if (activeTab === "directory" && usersList.length === 0) {
      fetchUsers();
    }
  }, [activeTab]);

  // Unified Filter Logic (Year + Search)
  useEffect(() => {
    let result = allocations;
    
    if (selectedYear) {
      result = result.filter((a) => a.assessmentYear === selectedYear);
    }
    
    if (searchQuery.trim() !== "") {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter((a) => 
        a.clientPAN.toLowerCase().includes(lowerQuery) ||
        (a.client?.name || "").toLowerCase().includes(lowerQuery) ||
        a.staffID.toLowerCase().includes(lowerQuery) ||
        (a.staff?.name || "").toLowerCase().includes(lowerQuery)
      );
    }
    
    setFilteredAllocations(result);
  }, [selectedYear, searchQuery, allocations]);

  // LEADERBOARD & METRIC CALCULATIONS
  const dashboardMetrics = useMemo(() => {
    const totalAssigned = allocations.length;
    const totalCompleted = allocations.filter(a => ["Filed", "Verified"].includes(a.status)).length;
    const totalPending = allocations.filter(a => !["Filed", "Verified", "Rejected"].includes(a.status)).length;
    return { totalAssigned, totalCompleted, totalPending };
  }, [allocations]);

  const staffStats = useMemo(() => {
    const stats: Record<string, any> = {};
    allocations.forEach(a => {
      const staffKey = a.staffID;
      if (!stats[staffKey]) {
        stats[staffKey] = {
          staffName: a.staff?.name || a.staffID,
          allocated: 0,
          completed: 0,
          pending: 0,
          rejected: 0
        };
      }
      stats[staffKey].allocated += 1;
      
      if (["Filed", "Verified"].includes(a.status)) {
        stats[staffKey].completed += 1;
      } else if (a.status === "Rejected") {
        stats[staffKey].rejected += 1;
      } else {
        stats[staffKey].pending += 1;
      }
    });

    return Object.values(stats).map(s => ({
      ...s,
      completionPct: s.allocated > 0 ? ((s.completed / s.allocated) * 100).toFixed(1) : 0,
      rejectedPct: s.allocated > 0 ? ((s.rejected / s.allocated) * 100).toFixed(1) : 0
    })).sort((a, b) => b.completionPct - a.completionPct);
  }, [allocations]);

  // API Methods
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

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const response = await fetch("/api/admin/users");
      if (!response.ok) throw new Error("Failed to fetch users.");
      const data: User[] = await response.json();
      setUsersList(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingUsers(false);
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

  const handleBulkDownload = async () => {
    if (!confirm("This will trigger a sequential browser download for ALL files associated with the currently filtered allocations. Are you sure?")) return;
    setAdminMessage("Executing bulk download... Please ensure your browser allows multiple file downloads!");
    
    for (const alloc of filteredAllocations) {
      try {
        const res = await fetch(`/api/admin/allocation-files?id=${alloc.id}`);
        const data = await res.json();
        if (data.files && data.files.length > 0) {
          data.files.forEach((f: any) => {
            const a = document.createElement('a');
            a.href = f.url;
            a.download = f.name;
            a.target = "_blank";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
          });
        }
      } catch (err) {
        console.error("Bulk download error for allocation", alloc.id);
      }
    }
  };

  const handleViewFiles = async (allocationId: string, forceRefresh = false) => {
    if (expandedDocs[allocationId] && !forceRefresh) {
      const newDocs = { ...expandedDocs };
      delete newDocs[allocationId];
      setExpandedDocs(newDocs);
      return;
    }
    try {
      const res = await fetch(`/api/admin/allocation-files?id=${allocationId}`);
      const data = await res.json();
      setExpandedDocs(prev => ({ ...prev, [allocationId]: data.files || [] }));
    } catch (err) {
      console.error("Failed to fetch files");
    }
  };

  const handleDeleteFile = async (allocationId: string, folder: number, filename: string) => {
    if (!confirm(`Are you sure you want to permanently delete ${filename}?`)) return;
    try {
      const res = await fetch("/api/admin/delete-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allocationId, folder, filename })
      });
      if (res.ok) handleViewFiles(allocationId, true);
      else alert("Failed to delete file.");
    } catch (e) { alert("Error deleting file."); }
  };

  const downloadAllocationTemplate = () => {
    const headers = "PAN;Client Name;StaffID;AssessmentYear\n";
    const sample = "BYMPP7794N;Client Sharma;Staff_1;2026-27\n"; 
    const blob = new Blob([headers + sample], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "allocation_template.csv";
    a.click();
  };

  const downloadUserTemplate = () => {
    const headers = "role;username;password;name;pan;email;phone\n";
    const sampleStaff = "staff;Staff_1;Staff_1@123;Staff Verma;;staff@gmail.com;9999999999\n";
    const sampleClient = "client;Client_1;Client_1@123;Client Sharma;BYMPP7794N;client@gmail.com;112233445\n";
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
        setUserMessage(`Ingestion successful. Users synchronized.`);
        setUserFile(null);
        fetchUsers(); 
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
        fetchUsers(); 
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

      {adminMessage && (
        <div className="mb-6 p-4 rounded-xl border bg-blue-50 border-blue-200 text-blue-800 text-sm font-medium">
          {adminMessage}
        </div>
      )}

      {/* Navigation Tab Bar */}
      <div className="flex border-b border-slate-200 mb-8 space-x-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab("monitor")}
          className={`py-2 px-4 font-semibold text-sm border-b-2 transition-all whitespace-nowrap ${
            activeTab === "monitor" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          }`}
        >
          Status Monitor
        </button>
        <button
          onClick={() => setActiveTab("allocations")}
          className={`py-2 px-4 font-semibold text-sm border-b-2 transition-all whitespace-nowrap ${
            activeTab === "allocations" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          }`}
        >
          Allocation Matrix
        </button>
        <button
          onClick={() => setActiveTab("onboarding")}
          className={`py-2 px-4 font-semibold text-sm border-b-2 transition-all whitespace-nowrap ${
            activeTab === "onboarding" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          }`}
        >
          User Onboarding Pipeline
        </button>
        <button
          onClick={() => setActiveTab("directory")}
          className={`py-2 px-4 font-semibold text-sm border-b-2 transition-all whitespace-nowrap ${
            activeTab === "directory" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          }`}
        >
          System Directory
        </button>
        <button
          onClick={() => setActiveTab("settings")}
          className={`py-2 px-4 font-semibold text-sm border-b-2 transition-all whitespace-nowrap ${
            activeTab === "settings" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          }`}
        >
          Access Controls
        </button>
      </div>

      {/* TAB 0: STATUS MONITOR (NEW) */}
      {activeTab === "monitor" && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center">
              <span className="text-sm font-bold text-slate-500 mb-1">Total Assigned</span>
              <span className="text-4xl font-extrabold text-blue-600">{dashboardMetrics.totalAssigned}</span>
            </div>
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center">
              <span className="text-sm font-bold text-slate-500 mb-1">Total Completed</span>
              <span className="text-4xl font-extrabold text-emerald-600">{dashboardMetrics.totalCompleted}</span>
            </div>
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center">
              <span className="text-sm font-bold text-slate-500 mb-1">Total Pending</span>
              <span className="text-4xl font-extrabold text-amber-500">{dashboardMetrics.totalPending}</span>
            </div>
          </div>

          {/* Staff Leaderboard */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-sm">Staff Leaderboard</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="py-3 px-4 text-xs font-bold text-slate-500">Rank</th>
                    <th className="py-3 px-4 text-xs font-bold text-slate-500">Staff Name</th>
                    <th className="py-3 px-4 text-xs font-bold text-slate-500">Allocated</th>
                    <th className="py-3 px-4 text-xs font-bold text-slate-500">Fully Complete</th>
                    <th className="py-3 px-4 text-xs font-bold text-slate-500">Completion %</th>
                    <th className="py-3 px-4 text-xs font-bold text-slate-500">Pending</th>
                    <th className="py-3 px-4 text-xs font-bold text-slate-500">% Rejected</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white text-sm">
                  {staffStats.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-slate-400">No active staff allocations found.</td>
                    </tr>
                  ) : (
                    staffStats.map((staff, index) => (
                      <tr key={staff.staffName} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-400">#{index + 1}</td>
                        <td className="py-3 px-4 font-bold text-slate-800">{staff.staffName}</td>
                        <td className="py-3 px-4 font-medium text-slate-600">{staff.allocated}</td>
                        <td className="py-3 px-4 font-medium text-emerald-600">{staff.completed}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                            Number(staff.completionPct) >= 80 ? "bg-emerald-100 text-emerald-800" :
                            Number(staff.completionPct) >= 40 ? "bg-amber-100 text-amber-800" : "bg-rose-100 text-rose-800"
                          }`}>
                            {staff.completionPct}%
                          </span>
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-600">{staff.pending}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                            Number(staff.rejectedPct) > 20 ? "bg-rose-100 text-rose-800" : "bg-slate-100 text-slate-600"
                          }`}>
                            {staff.rejectedPct}%
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 1: ALLOCATIONS */}
      {activeTab === "allocations" && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Ingest Allocation Structure</h2>
              </div>
              <button onClick={downloadAllocationTemplate} className="text-blue-600 hover:text-blue-800 underline text-xs font-semibold">
                Get Allocation CSV Schema
              </button>
            </div>
            <form onSubmit={handleAllocationUpload} className="flex flex-col sm:flex-row items-center gap-4">
              <input type="file" accept=".csv" onChange={(e) => setAllocationFile(e.target.files?.[0] || null)} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg border file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer" />
              <button type="submit" disabled={!allocationFile || uploadingAllocations} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-semibold text-sm py-2 px-6 rounded-lg whitespace-nowrap">
                {uploadingAllocations ? "Parsing..." : "Execute Mass Upload"}
              </button>
            </form>
            {allocationMessage && <p className={`mt-3 text-xs font-medium ${allocationMessage.includes("successful") ? "text-green-600" : "text-red-600"}`}>{allocationMessage}</p>}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
              <h3 className="font-bold text-slate-900 text-sm">Tracking State Monitor</h3>
              <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-4 w-full xl:w-auto">
                {/* NEW: Universal Search Bar */}
                <input
                  type="text"
                  placeholder="Search PAN, Client, or Staff..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-white border text-xs rounded-lg py-1.5 px-3 text-slate-700 w-full sm:w-64 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button onClick={handleBulkDownload} className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold py-1.5 px-3 rounded shadow transition-colors w-full sm:w-auto whitespace-nowrap">
                  📥 Bulk Download All
                </button>
                <select className="bg-white border text-xs rounded-lg py-1.5 px-2 text-slate-700 w-full sm:w-auto" value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
                  <option value="">Full Compilation Matrix</option>
                  {ALL_ASSESSMENT_YEARS.map((year) => <option key={year} value={year}>{year}</option>)}
                </select>
              </div>
            </div>
            {filteredAllocations.length === 0 ? <p className="text-center py-12 text-slate-400 text-sm">No metrics match current filter.</p> : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-left">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="py-3 px-4 text-xs font-bold text-slate-500">Idx</th>
                      <th className="py-3 px-4 text-xs font-bold text-slate-500">Client Info</th>
                      <th className="py-3 px-4 text-xs font-bold text-slate-500">Assigned Auditor</th>
                      <th className="py-3 px-4 text-xs font-bold text-slate-500">State Code</th>
                      <th className="py-3 px-4 text-xs font-bold text-slate-500">System Pipeline Hooks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white text-sm">
                    {filteredAllocations.map((allocation, index) => (
                      <tr key={allocation.id} className="hover:bg-slate-50 align-top">
                        <td className="py-4 px-4 text-slate-400 font-medium">{index + 1}</td>
                        <td className="py-4 px-4">
                          {/* NEW: Displays Client Name over PAN */}
                          <p className="font-bold text-slate-800">{allocation.client?.name || "Unknown"}</p>
                          <p className="font-mono text-slate-500 text-xs mt-1">PAN: {allocation.clientPAN}</p>
                        </td>
                        <td className="py-4 px-4">
                          <p className="font-bold text-slate-800">{allocation.staff?.name || "Unknown"}</p>
                          <p className="text-slate-500 text-xs mt-1">ID: {allocation.staffID}</p>
                        </td>
                        <td className="py-4 px-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${allocation.status === "Filed" ? "bg-green-100 text-green-800" : allocation.status === "Rejected" ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-800"}`}>{allocation.status}</span>
                        </td>
                        <td className="py-4 px-4">
                          {allocation.status === "COI_Ready" && (
                            <div className="flex space-x-2 mb-2">
                              <button onClick={() => handleStatusUpdate(allocation.id, "Ready_to_upload")} className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-1 px-3 rounded-md text-xs">Approve</button>
                              <button onClick={() => handleReject(allocation.id)} className="bg-rose-600 hover:bg-rose-700 text-white font-semibold py-1 px-3 rounded-md text-xs">Reject</button>
                            </div>
                          )}
                          {allocation.status === "Rejected" && <p className="text-rose-600 text-xs italic mb-2">Log: {allocation.comments}</p>}
                          
                          <button onClick={() => handleViewFiles(allocation.id)} className="text-blue-600 hover:underline text-xs font-bold flex items-center mt-1">
                            {expandedDocs[allocation.id] ? "▼ Hide Documents" : "▶ Review Documents"}
                          </button>
                          
                          {expandedDocs[allocation.id] && (
                            <div className="mt-2 p-2 bg-slate-100 rounded border border-slate-200 text-xs w-max min-w-[250px]">
                              {expandedDocs[allocation.id].length === 0 ? <span className="text-slate-500 italic">No files uploaded yet.</span> : 
                                expandedDocs[allocation.id].map((file: any, i: number) => (
                                  <div key={i} className="flex justify-between items-center py-1.5 border-b border-slate-200 last:border-0 gap-4">
                                    <span className="truncate max-w-[200px] font-mono text-slate-700" title={file.name}>
                                      <span className="text-slate-400 mr-1">[{file.folder}]</span>
                                      {file.name}
                                    </span>
                                    <div className="flex space-x-2">
                                      <a href={file.url} download target="_blank" className="text-blue-600 hover:text-blue-800 font-bold whitespace-nowrap bg-blue-50 px-2 py-0.5 rounded">Download</a>
                                      <button onClick={() => handleDeleteFile(allocation.id, file.folder, file.name)} className="text-red-600 hover:text-red-800 font-bold bg-red-50 px-2 py-0.5 rounded">Delete</button>
                                    </div>
                                  </div>
                                ))
                              }
                            </div>
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

      {/* TAB 2: ONBOARDING */}
      {activeTab === "onboarding" && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm max-w-4xl">
          <div className="flex justify-between gap-4 mb-6 border-b pb-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Onboard Users Pool</h2>
            </div>
            <button onClick={downloadUserTemplate} className="text-blue-600 hover:text-blue-800 underline text-xs font-semibold">Get User Layout Sheet</button>
          </div>
          <form onSubmit={handleUserUpload} className="space-y-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-dashed border-slate-300 flex justify-center py-8">
              <input type="file" accept=".csv" onChange={(e) => setUserFile(e.target.files?.[0] || null)} className="block text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg border file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer" />
            </div>
            <button type="submit" disabled={!userFile || uploadingUsers} className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-semibold text-sm py-2 px-6 rounded-lg">
              {uploadingUsers ? "Syncing..." : "Commit Batch Onboarding"}
            </button>
          </form>
          {userMessage && <div className={`mt-4 p-3 rounded-lg text-xs font-medium ${userMessage.includes("Ingestion successful") ? "bg-green-50 text-green-800 border border-green-200" : "bg-rose-50 text-rose-800 border border-rose-200"}`}>{userMessage}</div>}
        </div>
      )}

      {/* TAB 3: SYSTEM DIRECTORY */}
      {activeTab === "directory" && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 border-b pb-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">System Directory</h2>
              <p className="text-xs text-slate-400 mt-1">View all provisioned Staff, Client, and Admin accounts.</p>
            </div>
            <button
              onClick={fetchUsers}
              disabled={loadingUsers}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm py-2 px-4 rounded-lg transition-all flex items-center gap-2"
            >
              {loadingUsers ? "Refreshing..." : "↻ Refresh Database"}
            </button>
          </div>

          {loadingUsers && usersList.length === 0 ? (
            <p className="text-center py-8 text-slate-400 text-sm">Loading user database...</p>
          ) : usersList.length === 0 ? (
            <p className="text-center py-8 text-slate-400 text-sm">No users found in the system. Upload some via the Onboarding Pipeline.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="py-3 px-4 text-xs font-bold text-slate-500 tracking-wider">Role Matrix</th>
                    <th className="py-3 px-4 text-xs font-bold text-slate-500 tracking-wider">Username / ID</th>
                    <th className="py-3 px-4 text-xs font-bold text-slate-500 tracking-wider">Full Name</th>
                    <th className="py-3 px-4 text-xs font-bold text-slate-500 tracking-wider">Internal System ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white text-sm">
                  {usersList.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold tracking-wide ${
                          user.role === "ADMIN" ? "bg-purple-100 text-purple-800" :
                          user.role === "STAFF" ? "bg-blue-100 text-blue-800" : "bg-emerald-100 text-emerald-800"
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-slate-700">{user.username}</td>
                      <td className="py-3 px-4 text-slate-600 font-medium">{user.name}</td>
                      <td className="py-3 px-4 text-xs text-slate-400 font-mono truncate max-w-[120px]">{user.id}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: SETTINGS */}
      {activeTab === "settings" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">Reset Account Master Password</h3>
              <form onSubmit={handleResetPassword} className="space-y-3 mt-4">
                <div>
                  <label className="block text-slate-500 text-xs font-bold mb-1">Set Password Target</label>
                  <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required className="w-full bg-slate-50 border rounded-lg py-2 px-3 text-sm focus:outline-none focus:bg-white" />
                </div>
                <button type="submit" className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold py-2 px-4 rounded-lg">Authorize Reset</button>
              </form>
            </div>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">Initialize Secondary Admin</h3>
              <form onSubmit={handleCreateAdmin} className="space-y-3 mt-4">
                <div>
                  <label className="block text-slate-500 text-xs font-bold mb-1">Username Identifier</label>
                  <input type="text" value={newAdminUsername} onChange={(e) => setNewAdminUsername(e.target.value)} required className="w-full bg-slate-50 border rounded-lg py-2 px-3 text-sm focus:outline-none focus:bg-white" />
                </div>
                <div>
                  <label className="block text-slate-500 text-xs font-bold mb-1">Target Account Key Phrase</label>
                  <input type="password" value={newAdminPassword} onChange={(e) => setNewAdminPassword(e.target.value)} required className="w-full bg-slate-50 border rounded-lg py-2 px-3 text-sm focus:outline-none focus:bg-white" />
                </div>
                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-2 px-4 rounded-lg">Provision Account</button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
