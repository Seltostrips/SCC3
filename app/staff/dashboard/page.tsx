"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import * as xlsx from "xlsx";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface ClientData { name: string; }
interface Allocation { id: string; clientPAN: string; assessmentYear: string; status: string; comments?: string; client: ClientData; }

const COLORS = {
  Active: "#3b82f6", // Blue
  Completed: "#10b981", // Green
  Rejected: "#ef4444", // Red
  OnHold: "#f59e0b" // Amber/Orange
};

export default function StaffDashboard() {
  const [activeTab, setActiveTab] = useState<"assignments" | "history">("assignments");
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [filteredAllocations, setFilteredAllocations] = useState<Allocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [expandedDocs, setExpandedDocs] = useState<Record<string, any[]>>({});
  
  // NEW: Status Filter
  const [statusFilter, setStatusFilter] = useState<string>("");
  const router = useRouter();

  useEffect(() => { fetchAllocations(); }, []);

  useEffect(() => {
    if (statusFilter) {
      setFilteredAllocations(allocations.filter(a => a.status === statusFilter));
    } else {
      setFilteredAllocations(allocations);
    }
  }, [statusFilter, allocations]);

  // KPI calculations for Staff Pie Chart
  const chartData = useMemo(() => {
    let active = 0, completed = 0, rejected = 0, onHold = 0;
    allocations.forEach(a => {
      if (["Filed", "Ready_to_upload"].includes(a.status)) completed++;
      else if (["LateFilling", "PendingWithClient"].includes(a.status)) onHold++;
      else if (a.status === "Rejected") rejected++;
      else active++; // Allocated, COI_Ready
    });
    return [
      { name: "Active / Processing", value: active, color: COLORS.Active },
      { name: "Completed", value: completed, color: COLORS.Completed },
      { name: "Rejected", value: rejected, color: COLORS.Rejected },
      { name: "On Hold / Pending Client", value: onHold, color: COLORS.OnHold } // Pushed to bottom conceptually
    ].filter(d => d.value > 0);
  }, [allocations]);

  const fetchAllocations = async () => {
    try {
      const response = await fetch("/api/staff/allocations");
      if (response.ok) {
        const data = await response.json();
        setAllocations(data);
      }
    } catch (err) {} finally { setLoading(false); }
  };

  const updateStatus = async (allocationId: string, newStatus: string) => {
    try {
      const formData = new FormData();
      formData.append("allocationId", allocationId);
      formData.append("newStatus", newStatus);
      const response = await fetch("/api/staff/update-status", { method: "POST", body: formData });
      if (response.ok) fetchAllocations();
    } catch (err) { console.error("Status error"); }
  };

  // EXPORT TRACKER
  const handleExportTracker = () => {
    const exportData = filteredAllocations.map(a => ({
      "Client Name": a.client?.name || "Unknown",
      "PAN": a.clientPAN,
      "Assessment Year": a.assessmentYear,
      "Status": a.status,
      "Admin Feedback": a.comments || "N/A"
    }));
    const ws = xlsx.utils.json_to_sheet(exportData);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "Tracker");
    xlsx.writeFile(wb, "Staff_Status_Tracker.xlsx");
  };

  const handleViewFiles = async (allocationId: string, forceRefresh = false) => {
    if (expandedDocs[allocationId] && !forceRefresh) {
      const newDocs = { ...expandedDocs };
      delete newDocs[allocationId];
      setExpandedDocs(newDocs);
      return;
    }
    try {
      const res = await fetch(`/api/staff/allocation-files?id=${allocationId}`);
      const data = await res.json();
      setExpandedDocs(prev => ({ ...prev, [allocationId]: data.files || [] }));
    } catch (err) {}
  };

  const handleDeleteFile = async (allocationId: string, folder: number, filename: string) => {
    if (!confirm(`Are you sure you want to permanently delete ${filename}?`)) return;
    try {
      const res = await fetch("/api/staff/delete-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allocationId, folder, filename })
      });
      if (res.ok) handleViewFiles(allocationId, true);
    } catch (e) {}
  };

  const handleFileUpload = async (allocationId: string, files: FileList, folder: string) => {
    setUploadingId(allocationId);
    try {
      const formData = new FormData();
      formData.append("allocationId", allocationId);
      formData.append("folder", folder);
      Array.from(files).forEach((file, index) => { formData.append(`file_${index}`, file); });

      const res = await fetch("/api/staff/upload-document", { method: "POST", body: formData });
      if (res.ok) {
        alert("✅ Upload Successful");
        handleViewFiles(allocationId, true); 
      } else alert("❌ Upload failed");
    } catch (err) {} finally { setUploadingId(null); }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
  };

  if (loading) return <div className="text-center py-12 text-slate-500">Loading...</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <header className="mb-6 flex flex-col md:flex-row items-center justify-between border-b pb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Auditor Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Manage assignments and document routing.</p>
        </div>
        <button onClick={handleLogout} className="mt-4 md:mt-0 bg-slate-200 hover:bg-slate-300 text-slate-800 text-sm font-bold py-2 px-6 rounded-lg">Sign Out</button>
      </header>

      {/* PIE CHART KPI SECTION */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mb-6 flex flex-col items-center">
        <h2 className="text-lg font-bold text-slate-800 mb-4">Your Portfolio Breakdown</h2>
        <div className="w-full h-64 max-w-md">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={chartData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" height={36} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="flex border-b border-slate-200 mb-6 space-x-4">
        <button onClick={() => setActiveTab("assignments")} className={`py-2 px-4 font-semibold text-sm border-b-2 transition-all ${activeTab === "assignments" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}>Active Workspace</button>
        <button onClick={() => setActiveTab("history")} className={`py-2 px-4 font-semibold text-sm border-b-2 transition-all ${activeTab === "history" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}>Status & Feedback History</button>
      </div>

      {activeTab === "assignments" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden max-w-7xl mx-auto">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center space-x-4 w-full sm:w-auto">
              <span className="text-sm font-bold text-slate-700">Filter Status:</span>
              <select className="bg-white border text-xs rounded-lg py-1.5 px-3 w-full sm:w-auto" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">All Statuses</option>
                <option value="Allocated">Allocated</option>
                <option value="COI_Ready">COI Ready</option>
                <option value="Ready_to_upload">Ready to Upload</option>
                <option value="Filed">Filed</option>
                <option value="Rejected">Rejected</option>
                <option value="LateFilling">Late Filling (On Hold)</option>
                <option value="PendingWithClient">Pending With Client (On Hold)</option>
              </select>
            </div>
            <button onClick={handleExportTracker} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 px-4 rounded text-xs shadow w-full sm:w-auto">
              📥 Export Status Tracker
            </button>
          </div>

          <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left">
            <thead className="bg-slate-50">
              <tr>
                <th className="py-3 px-4 text-xs font-bold text-slate-500">Client Info</th>
                <th className="py-3 px-4 text-xs font-bold text-slate-500">Current Status</th>
                <th className="py-3 px-4 text-xs font-bold text-slate-500">Document Management</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white text-sm">
              {filteredAllocations.map((allocation) => (
                <tr key={allocation.id} className="hover:bg-slate-50 align-top">
                  <td className="py-4 px-4">
                    <p className="font-bold text-slate-800">{allocation.client?.name || "Unknown"}</p>
                    <p className="font-mono text-slate-500 text-xs mt-1">PAN: {allocation.clientPAN}</p>
                    <p className="text-slate-500 text-xs mt-1">AY: {allocation.assessmentYear}</p>
                  </td>
                  <td className="py-4 px-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mb-3 ${
                      ["LateFilling", "PendingWithClient"].includes(allocation.status) ? "bg-amber-100 text-amber-800" :
                      allocation.status === "Rejected" ? "bg-rose-100 text-rose-800" : 
                      allocation.status === "Filed" ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"
                    }`}>
                      {allocation.status}
                    </span>
                    
                    {/* REJECTION REASON FOR STAFF */}
                    {allocation.status === "Rejected" && (
                      <div className="mb-3 p-2 bg-rose-50 border border-rose-200 rounded text-xs text-rose-700 font-medium">
                        <strong>Admin Feedback:</strong> {allocation.comments || "No specific reason provided."}
                      </div>
                    )}

                    {allocation.status === "Allocated" && <button onClick={() => updateStatus(allocation.id, "COI_Ready")} className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-1.5 px-3 rounded-md text-xs">Trigger 'COI Ready'</button>}
                    {allocation.status === "Rejected" && <button onClick={() => updateStatus(allocation.id, "COI_Ready")} className="block w-full mt-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-1.5 px-3 rounded-md text-xs">Resubmit for Approval</button>}
                  </td>
                  <td className="py-4 px-4">
                    <div className="bg-slate-100 p-3 rounded-lg border border-slate-200">
                      <div className="flex flex-col xl:flex-row gap-2">
                        <select id={`folder-${allocation.id}`} className="text-xs p-1.5 rounded border border-slate-300"><option value="1">Folder 1: Raw Client Docs</option><option value="2">Folder 2: Internal Workings</option><option value="3">Folder 3: Draft Computations</option><option value="4">Folder 4: Final Tax Returns</option></select>
                        <input type="file" multiple id={`file-${allocation.id}`} className="text-xs file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-blue-50 file:text-blue-700 file:font-semibold hover:file:bg-blue-100 max-w-[200px]" />
                        <button onClick={() => { const folder = (document.getElementById(`folder-${allocation.id}`) as HTMLSelectElement).value; const fileInput = document.getElementById(`file-${allocation.id}`) as HTMLInputElement; if (fileInput.files && fileInput.files.length > 0) { handleFileUpload(allocation.id, fileInput.files, folder); fileInput.value = ""; } else alert("Select files first."); }} disabled={uploadingId === allocation.id} className="bg-slate-800 text-white text-xs px-4 py-1.5 rounded hover:bg-slate-700 disabled:bg-slate-400 font-semibold">{uploadingId === allocation.id ? "Uploading..." : "Push to Storage"}</button>
                      </div>
                      
                      <button onClick={() => handleViewFiles(allocation.id)} className="text-blue-600 hover:underline text-xs font-bold flex items-center mt-4">
                        {expandedDocs[allocation.id] ? "▼ Hide Uploaded Documents" : "▶ View & Manage Documents"}
                      </button>
                      {expandedDocs[allocation.id] && (
                        <div className="mt-2 p-2 bg-white rounded border border-slate-200 text-xs w-full">
                          {expandedDocs[allocation.id].length === 0 ? <span className="text-slate-500 italic">No files found.</span> : 
                            expandedDocs[allocation.id].map((file: any, i: number) => (
                              <div key={i} className="flex justify-between items-center py-1.5 border-b border-slate-100 last:border-0 gap-4">
                                <span className="truncate font-mono text-slate-700" title={file.name}><span className="text-slate-400 mr-1">[{file.folder}]</span>{file.name}</span>
                                <div className="flex space-x-2">
                                  <a href={file.url} download target="_blank" className="text-blue-600 hover:text-blue-800 font-bold bg-blue-50 px-2 py-0.5 rounded">Download</a>
                                  <button onClick={() => handleDeleteFile(allocation.id, file.folder, file.name)} className="text-red-600 hover:text-red-800 font-bold bg-red-50 px-2 py-0.5 rounded">Delete</button>
                                </div>
                              </div>
                            ))
                          }
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {activeTab === "history" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto max-w-6xl mx-auto p-4">
          <h2 className="font-bold text-lg mb-4 text-slate-800">Admin Feedback & Logs</h2>
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead><tr className="text-slate-500"><th className="py-2 font-bold">Client PAN</th><th className="py-2 font-bold">Status</th><th className="py-2 font-bold">Admin Comments / Feedback</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {allocations.map(a => (<tr key={a.id}><td className="py-3 font-mono">{a.clientPAN}</td><td className="py-3 font-semibold">{a.status}</td><td className="py-3 text-rose-600 italic">{a.comments || "No remarks"}</td></tr>))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
