"use client";

import { useState, useEffect, useMemo } from "react";
import JSZip from "jszip";
import * as xlsx from "xlsx";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface Allocation {
  id: string; clientPAN: string; staffID: string; assessmentYear: string; status: string; billingStatus: string; comments?: string; client?: { name: string }; staff?: { name: string };
}
interface User { id: string; username: string; name: string; role: string; }
interface AuditLog { id: string; clientPAN: string; staffID: string; assessmentYear: string; filename: string; folder: number; action: string; timestamp: string; }

const ALL_ASSESSMENT_YEARS = ["2026-27", "2025-26", "2024-25", "2023-24", "2022-23"];
type TabType = "monitor" | "allocations" | "audit" | "onboarding" | "directory" | "settings";

const COLORS = { Active: "#3b82f6", Completed: "#10b981", Rejected: "#ef4444", OnHold: "#f59e0b" };

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<TabType>("monitor");
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [filteredAllocations, setFilteredAllocations] = useState<Allocation[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Search & Filters
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  
  const [expandedDocs, setExpandedDocs] = useState<Record<string, any[]>>({});
  const [usersList, setUsersList] = useState<User[]>([]);
  
  const [newPassword, setNewPassword] = useState("");
  const [newAdminUsername, setNewAdminUsername] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [adminMessage, setAdminMessage] = useState<string | null>(null);

  const [allocationFile, setAllocationFile] = useState<File | null>(null);
  const [uploadingAllocations, setUploadingAllocations] = useState(false);
  const [allocationMessage, setAllocationMessage] = useState<string | null>(null);

  const [userFile, setUserFile] = useState<File | null>(null);
  const [uploadingUsers, setUploadingUsers] = useState(false);
  const [userMessage, setUserMessage] = useState<string | null>(null);

  useEffect(() => { fetchAllocations(); fetchAuditLogs(); }, []);
  useEffect(() => { if (activeTab === "directory" && usersList.length === 0) fetchUsers(); }, [activeTab]);

  useEffect(() => {
    let result = allocations;
    if (selectedYear) result = result.filter((a) => a.assessmentYear === selectedYear);
    if (statusFilter) result = result.filter((a) => a.status === statusFilter);
    if (searchQuery.trim() !== "") {
      const lower = searchQuery.toLowerCase();
      result = result.filter((a) => a.clientPAN.toLowerCase().includes(lower) || (a.client?.name || "").toLowerCase().includes(lower) || a.staffID.toLowerCase().includes(lower) || (a.staff?.name || "").toLowerCase().includes(lower));
    }
    setFilteredAllocations(result);
  }, [selectedYear, searchQuery, statusFilter, allocations]);

  // KPIs & PIE CHART
  const chartData = useMemo(() => {
    let active = 0, completed = 0, rejected = 0, onHold = 0;
    allocations.forEach(a => {
      if (["Filed", "Ready_to_upload"].includes(a.status)) completed++;
      else if (["LateFilling", "PendingWithClient"].includes(a.status)) onHold++;
      else if (a.status === "Rejected") rejected++;
      else active++; 
    });
    return [
      { name: "Active / Processing", value: active, color: COLORS.Active },
      { name: "Completed", value: completed, color: COLORS.Completed },
      { name: "Rejected", value: rejected, color: COLORS.Rejected },
      { name: "On Hold (Late/Pending)", value: onHold, color: COLORS.OnHold }
    ].filter(d => d.value > 0);
  }, [allocations]);

  const dashboardMetrics = useMemo(() => {
    const totalAssigned = allocations.length;
    const totalCompleted = allocations.filter(a => ["Filed"].includes(a.status)).length;
    const totalPending = allocations.filter(a => !["Filed", "Rejected"].includes(a.status)).length;
    return { totalAssigned, totalCompleted, totalPending };
  }, [allocations]);

  const staffStats = useMemo(() => {
    const stats: Record<string, any> = {};
    allocations.forEach(a => {
      const staffKey = a.staffID;
      if (!stats[staffKey]) stats[staffKey] = { staffName: a.staff?.name || a.staffID, allocated: 0, completed: 0, pending: 0, rejected: 0 };
      stats[staffKey].allocated += 1;
      if (["Filed"].includes(a.status)) stats[staffKey].completed += 1;
      else if (a.status === "Rejected") stats[staffKey].rejected += 1;
      else stats[staffKey].pending += 1;
    });
    return Object.values(stats).map(s => ({ ...s, completionPct: s.allocated > 0 ? ((s.completed / s.allocated) * 100).toFixed(1) : 0, rejectedPct: s.allocated > 0 ? ((s.rejected / s.allocated) * 100).toFixed(1) : 0 })).sort((a, b) => b.completionPct - a.completionPct);
  }, [allocations]);

  // API Methods
  const fetchAllocations = async () => {
    try { setLoading(true); const res = await fetch("/api/admin/allocations"); setAllocations(await res.json()); } 
    catch (err) {} finally { setLoading(false); }
  };
  const fetchUsers = async () => {
    try { const res = await fetch("/api/admin/users"); setUsersList(await res.json()); } catch (err) {}
  };
  const fetchAuditLogs = async () => {
    try { const res = await fetch("/api/admin/audit-logs"); setAuditLogs(await res.json()); } catch (err) {}
  };

  const handleStatusChange = async (allocationId: string, newStatus: string) => {
    let comments = "";
    if (newStatus === "Rejected") {
      const reason = prompt("Enter Rejection Reason for Staff:");
      if (reason === null) return;
      comments = reason;
    }
    
    try {
      await fetch("/api/admin/update-allocation", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allocationId, newStatus, comments }),
      });
      fetchAllocations();
    } catch (err) {}
  };

  // EXPORT TRACKERS
  const handleExportTracker = () => {
    const exportData = filteredAllocations.map(a => ({
      "Client Name": a.client?.name || "Unknown", "PAN": a.clientPAN, "Staff Name": a.staff?.name || "Unknown", "Staff ID": a.staffID, "Year": a.assessmentYear, "Status": a.status, "Feedback": a.comments || ""
    }));
    const ws = xlsx.utils.json_to_sheet(exportData);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "Tracker");
    xlsx.writeFile(wb, "Admin_Status_Tracker.xlsx");
  };

  const handleExportAuditLogs = () => {
    const ws = xlsx.utils.json_to_sheet(auditLogs.map(log => ({
      "Timestamp": new Date(log.timestamp).toLocaleString(), "Action": log.action, "Staff ID": log.staffID, "Client PAN": log.clientPAN, "Folder": `Folder ${log.folder}`, "Filename": log.filename
    })));
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "AuditTrail");
    xlsx.writeFile(wb, "Staff_Upload_Audit_Trail.xlsx");
  };

  const handleBulkDownload = async () => {
    if (!confirm("This will compile a ZIP file preserving the exact folder structure for all visible allocations. Are you sure?")) return;
    setAdminMessage("Compiling ZIP archive... Please leave this tab open.");
    try {
      const zip = new JSZip();
      let hasFiles = false;
      for (const alloc of filteredAllocations) {
        try {
          const res = await fetch(`/api/admin/allocation-files?id=${alloc.id}`);
          const data = await res.json();
          if (data.files && data.files.length > 0) {
            hasFiles = true;
            const panFolder = zip.folder(alloc.clientPAN);
            if (panFolder) {
              await Promise.all(data.files.map(async (f: any) => {
                try {
                  const fileRes = await fetch(f.url);
                  if (!fileRes.ok) throw new Error("Fetch failed");
                  panFolder.file(`Folder-${f.folder}/${f.name}`, await fileRes.blob());
                } catch (e) {}
              }));
            }
          }
        } catch (err) {}
      }
      if (!hasFiles) { setAdminMessage("No files found."); setTimeout(() => setAdminMessage(null), 4000); return; }
      
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const downloadUrl = window.URL.createObjectURL(zipBlob);
      const a = document.createElement("a"); a.href = downloadUrl; a.download = `SCC_Bulk_Export.zip`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a); window.URL.revokeObjectURL(downloadUrl);
      setAdminMessage("Bulk download completed!"); setTimeout(() => setAdminMessage(null), 5000);
    } catch (error) { setAdminMessage("Error generating ZIP."); }
  };

  const handleViewFiles = async (allocationId: string) => {
    if (expandedDocs[allocationId]) {
      const newDocs = { ...expandedDocs }; 
      delete newDocs[allocationId]; 
      setExpandedDocs(newDocs); 
      return;
    }
    try {
      const res = await fetch(`/api/admin/allocation-files?id=${allocationId}`);
      const payload = await res.json();
      setExpandedDocs(prev => ({ ...prev, [allocationId]: payload.files || [] }));
    } catch (err) {}
  };

  const handleDeleteFile = async (allocationId: string, folder: number, filename: string) => {
    if (!confirm(`Permanently delete ${filename}?`)) return;
    await fetch("/api/admin/delete-document", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ allocationId, folder, filename }) });
    handleViewFiles(allocationId);
  };

  const handleAllocationUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allocationFile) return;
    setUploadingAllocations(true); setAllocationMessage("Processing stream...");
    const formData = new FormData(); formData.append("file", allocationFile);
    try {
      const res = await fetch("/api/admin/upload-allocations", { method: "POST", body: formData });
      if (res.ok) { 
        setAllocationMessage("Upserted successfully."); 
        setAllocationFile(null); 
        fetchAllocations(); 
      } else {
        const errData = await res.json();
        setAllocationMessage(errData.message);
      }
    } catch (err) { setAllocationMessage("Crashed."); } finally { setUploadingAllocations(false); }
  };

  const handleUserUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userFile) return;
    setUploadingUsers(true);
    setUserMessage("Streaming user ingestion parameters...");
    const formData = new FormData(); formData.append("file", userFile);
    try {
      const res = await fetch("/api/admin/upload-users", { method: "POST", body: formData });
      if (res.ok) { 
        setUserMessage(`Ingestion successful. Users synchronized.`);
        setUserFile(null); 
        fetchUsers(); 
      } else {
        const errData = await res.json();
        setUserMessage(errData.message || "Profile validation mapping exception.");
      }
    } catch (err) { setUserMessage("Gateway processing transaction timed out."); } finally { setUploadingUsers(false); }
  };

  // RESTORED: Access Control Pipeline Mutators
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

  const downloadAllocationTemplate = () => {
    const ws = xlsx.utils.json_to_sheet([{ PAN: "BYMPP7794N", "Client Name": "Client Sharma", StaffID: "Staff_1", AssessmentYear: "2026-27" }]);
    const wb = xlsx.utils.book_new(); xlsx.utils.book_append_sheet(wb, ws, "Allocations"); xlsx.writeFile(wb, "allocation_template.xlsx");
  };
  const downloadUserTemplate = () => {
    const ws = xlsx.utils.json_to_sheet([{ role: "staff", username: "Staff_1", password: "Staff_1@123", name: "Staff Verma", pan: "", email: "staff@gmail.com", phone: "9999999999" }, { role: "client", username: "Client_1", password: "Client_1@123", name: "Client Sharma", pan: "BYMPP7794N", email: "client@gmail.com", phone: "112233445" }]);
    const wb = xlsx.utils.book_new(); xlsx.utils.book_append_sheet(wb, ws, "Users"); xlsx.writeFile(wb, "user_onboarding_template.xlsx");
  };

  if (loading) return <div className="text-center py-12 text-gray-500">Retrieving telemetry...</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 text-slate-800">
      <header className="mb-8 text-center md:text-left md:flex md:items-center md:justify-between border-b pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">SCC Administration</h1>
          <p className="text-sm text-slate-500 mt-1">Management, indexing, and onboarding engines.</p>
        </div>
      </header>

      {adminMessage && <div className="mb-6 p-4 rounded-xl border bg-blue-50 border-blue-200 text-blue-800 text-sm font-medium">{adminMessage}</div>}

      <div className="flex border-b border-slate-200 mb-8 space-x-2 overflow-x-auto">
        {["monitor", "allocations", "audit", "onboarding", "directory", "settings"].map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab as TabType)} className={`py-2 px-4 font-semibold text-sm border-b-2 transition-all whitespace-nowrap capitalize ${activeTab === tab ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
            {tab.replace("-", " ")} {tab === "audit" && "Trail"}
          </button>
        ))}
      </div>

      {activeTab === "monitor" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center">
                <span className="text-sm font-bold text-slate-500 mb-1">Total Assigned</span><span className="text-4xl font-extrabold text-blue-600">{dashboardMetrics.totalAssigned}</span>
              </div>
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center">
                <span className="text-sm font-bold text-slate-500 mb-1">Fully Filed</span><span className="text-4xl font-extrabold text-emerald-600">{dashboardMetrics.totalCompleted}</span>
              </div>
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center">
                <span className="text-sm font-bold text-slate-500 mb-1">Work in Progress</span><span className="text-4xl font-extrabold text-amber-500">{dashboardMetrics.totalPending}</span>
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center">
              <h3 className="font-bold text-slate-700 text-xs mb-2">Global System Status</h3>
              <div className="w-full h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={chartData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={5} dataKey="value">
                      {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" height={20} iconSize={8} wrapperStyle={{ fontSize: '10px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200"><h3 className="font-bold text-slate-900 text-sm">Staff Leaderboard</h3></div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left">
                <thead className="bg-slate-50"><tr><th className="py-3 px-4 text-xs font-bold text-slate-500">Rank</th><th className="py-3 px-4 text-xs font-bold text-slate-500">Staff Name</th><th className="py-3 px-4 text-xs font-bold text-slate-500">Allocated</th><th className="py-3 px-4 text-xs font-bold text-slate-500">Fully Complete</th><th className="py-3 px-4 text-xs font-bold text-slate-500">Completion %</th><th className="py-3 px-4 text-xs font-bold text-slate-500">Pending</th><th className="py-3 px-4 text-xs font-bold text-slate-500">% Rejected</th></tr></thead>
                <tbody className="divide-y divide-slate-200 bg-white text-sm">
                  {staffStats.map((staff, index) => (
                    <tr key={staff.staffName} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-bold text-slate-400">#{index + 1}</td><td className="py-3 px-4 font-bold text-slate-800">{staff.staffName}</td><td className="py-3 px-4 font-medium text-slate-600">{staff.allocated}</td><td className="py-3 px-4 font-medium text-emerald-600">{staff.completed}</td>
                      <td className="py-3 px-4"><span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${Number(staff.completionPct) >= 80 ? "bg-emerald-100 text-emerald-800" : Number(staff.completionPct) >= 40 ? "bg-amber-100 text-amber-800" : "bg-rose-100 text-rose-800"}`}>{staff.completionPct}%</span></td>
                      <td className="py-3 px-4 font-medium text-slate-600">{staff.pending}</td>
                      <td className="py-3 px-4"><span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${Number(staff.rejectedPct) > 20 ? "bg-rose-100 text-rose-800" : "bg-slate-100 text-slate-600"}`}>{staff.rejectedPct}%</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === "allocations" && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-slate-900">Ingest Allocation Structure</h2>
              <button onClick={downloadAllocationTemplate} className="text-blue-600 underline text-xs font-semibold">Get Excel Schema</button>
            </div>
            <form onSubmit={handleAllocationUpload} className="flex flex-col sm:flex-row items-center gap-4">
              <input type="file" accept=".xlsx, .xls" onChange={(e) => setAllocationFile(e.target.files?.[0] || null)} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg border file:bg-blue-50 file:text-blue-700 cursor-pointer" />
              <button type="submit" disabled={!allocationFile || uploadingAllocations} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm py-2 px-6 rounded-lg">{uploadingAllocations ? "Parsing..." : "Mass Upload"}</button>
            </form>
            {allocationMessage && <p className="mt-3 text-xs font-medium text-blue-600">{allocationMessage}</p>}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col xl:flex-row justify-between gap-3">
              <h3 className="font-bold text-slate-900 text-sm">Tracking State Monitor</h3>
              <div className="flex flex-wrap items-center gap-2">
                <input type="text" placeholder="Search PAN, Name, Staff..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="bg-white border text-xs rounded-lg py-1.5 px-3 w-48" />
                <select className="bg-white border text-xs rounded-lg py-1.5 px-2" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="">All Statuses</option>
                  <option value="Allocated">Allocated</option>
                  <option value="COI_Ready">COI Ready</option>
                  <option value="Ready_to_upload">Ready to Upload</option>
                  <option value="Filed">Filed</option>
                  <option value="LateFilling">Late Filling (On Hold)</option>
                  <option value="PendingWithClient">Pending With Client (On Hold)</option>
                  <option value="Rejected">Rejected</option>
                </select>
                <select className="bg-white border text-xs rounded-lg py-1.5 px-2" value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
                  <option value="">All Years</option>
                  {ALL_ASSESSMENT_YEARS.map((year) => <option key={year} value={year}>{year}</option>)}
                </select>
                <button onClick={handleExportTracker} className="bg-emerald-600 text-white text-xs font-bold py-1.5 px-3 rounded shadow">📥 Export Tracker</button>
                <button onClick={handleBulkDownload} className="bg-purple-600 text-white text-xs font-bold py-1.5 px-3 rounded shadow">📥 Bulk ZIP</button>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left">
                <thead className="bg-slate-50">
                  <tr><th className="py-3 px-4 text-xs font-bold text-slate-500">Client Info</th><th className="py-3 px-4 text-xs font-bold text-slate-500">Auditor</th><th className="py-3 px-4 text-xs font-bold text-slate-500">Admin Override Status</th><th className="py-3 px-4 text-xs font-bold text-slate-500">Documents</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white text-sm">
                  {filteredAllocations.map((allocation) => (
                    <tr key={allocation.id} className="hover:bg-slate-50 align-top">
                      <td className="py-4 px-4"><p className="font-bold">{allocation.client?.name}</p><p className="font-mono text-slate-500 text-xs">PAN: {allocation.clientPAN}</p></td>
                      <td className="py-4 px-4"><p className="font-bold">{allocation.staff?.name}</p><p className="text-slate-500 text-xs">ID: {allocation.staffID}</p></td>
                      <td className="py-4 px-4">
                        <select 
                          value={allocation.status} 
                          onChange={(e) => handleStatusChange(allocation.id, e.target.value)}
                          className={`border text-xs rounded p-1.5 font-bold mb-2 ${
                            ["LateFilling", "PendingWithClient"].includes(allocation.status) ? "bg-amber-50 text-amber-800" :
                            allocation.status === "Filed" ? "bg-emerald-50 text-emerald-800" : "bg-slate-50"
                          }`}
                        >
                          <option value="Allocated">Allocated</option>
                          <option value="COI_Ready">COI Ready</option>
                          <option value="Ready_to_upload">Ready to Upload (Approved)</option>
                          <option value="Filed">Filed (Complete)</option>
                          <option value="LateFilling">Late Filling (On Hold)</option>
                          <option value="PendingWithClient">Pending With Client (On Hold)</option>
                          <option value="Rejected">Rejected</option>
                        </select>
                        {allocation.status === "Rejected" && <p className="text-rose-600 text-[10px] italic max-w-[150px] leading-tight">Reason: {allocation.comments}</p>}
                      </td>
                      <td className="py-4 px-4">
                        <button onClick={() => handleViewFiles(allocation.id)} className="text-blue-600 text-xs font-bold">
                          {expandedDocs[allocation.id] ? "▼ Hide Docs" : "▶ Review Docs"}
                        </button>
                        {expandedDocs[allocation.id] && (
                          <div className="mt-2 p-2 bg-slate-100 rounded border border-slate-200 text-xs min-w-[200px]">
                            {expandedDocs[allocation.id].length === 0 ? <span className="text-slate-500">No files.</span> : 
                              expandedDocs[allocation.id].map((file: any, i: number) => (
                                <div key={i} className="flex justify-between items-center py-1 border-b gap-2">
                                  <span className="truncate max-w-[120px]" title={file.name}>[{file.folder}] {file.name}</span>
                                  <div className="flex gap-1"><a href={file.url} download target="_blank" className="text-blue-600 bg-blue-50 px-1 rounded">DL</a><button onClick={() => handleDeleteFile(allocation.id, file.folder, file.name)} className="text-red-600 bg-red-50 px-1 rounded">Del</button></div>
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
          </div>
        </div>
      )}

      {activeTab === "audit" && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Permanent File Audit Trail</h2>
              <p className="text-xs text-slate-500">Tracks exactly which staff member uploaded documents to client folders, persisting even through reassignments.</p>
            </div>
            <button onClick={handleExportAuditLogs} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 px-4 rounded shadow">
              📥 Export to Excel
            </button>
          </div>
          
          <div className="overflow-x-auto max-h-[600px]">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 sticky top-0">
                <tr><th className="py-3 px-4 font-bold text-slate-500">Timestamp</th><th className="py-3 px-4 font-bold text-slate-500">Staff ID</th><th className="py-3 px-4 font-bold text-slate-500">Client PAN</th><th className="py-3 px-4 font-bold text-slate-500">Folder</th><th className="py-3 px-4 font-bold text-slate-500">Filename</th><th className="py-3 px-4 font-bold text-slate-500">Action</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.length === 0 ? <tr><td colSpan={6} className="text-center py-6 text-slate-400">No logs found.</td></tr> : 
                  auditLogs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 text-xs text-slate-500">{new Date(log.timestamp).toLocaleString()}</td>
                      <td className="py-3 px-4 font-bold text-blue-700">{log.staffID}</td>
                      <td className="py-3 px-4 font-mono text-slate-700">{log.clientPAN}</td>
                      <td className="py-3 px-4 font-bold">F{log.folder}</td>
                      <td className="py-3 px-4 truncate max-w-[200px]" title={log.filename}>{log.filename}</td>
                      <td className="py-3 px-4"><span className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs font-bold">{log.action}</span></td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "onboarding" && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm max-w-4xl">
          <div className="flex justify-between mb-6 border-b pb-4">
            <h2 className="text-xl font-bold text-slate-900">Onboard Users Pool</h2>
            <button onClick={downloadUserTemplate} className="text-blue-600 text-xs font-semibold">Get Excel Layout</button>
          </div>
          <form onSubmit={handleUserUpload} className="space-y-4">
            <input type="file" accept=".xlsx, .xls" onChange={(e) => setUserFile(e.target.files?.[0] || null)} className="block w-full border p-4 bg-slate-50 rounded" />
            <button type="submit" disabled={!userFile || uploadingUsers} className="bg-blue-600 text-white font-semibold py-2 px-6 rounded-lg">{uploadingUsers ? "Syncing..." : "Commit Onboarding"}</button>
          </form>
          {userMessage && <p className={`mt-3 text-xs font-medium ${userMessage.includes("successful") ? "text-green-600" : "text-red-600"}`}>{userMessage}</p>}
        </div>
      )}
      
      {activeTab === "directory" && (
        <div className="bg-white p-6 rounded-xl shadow-sm"><h2 className="text-xl font-bold mb-4">System Directory</h2>
        <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50"><tr><th className="py-3 px-4 font-bold">Role</th><th className="py-3 px-4 font-bold">Username</th><th className="py-3 px-4 font-bold">Name</th></tr></thead><tbody>{usersList.map(u => (<tr key={u.id} className="border-b"><td className="py-3 px-4 font-bold">{u.role}</td><td className="py-3 px-4 font-mono">{u.username}</td><td className="py-3 px-4">{u.name}</td></tr>))}</tbody></table></div></div>
      )}

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
