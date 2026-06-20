"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface ClientData { name: string; }
interface Allocation {
  id: string; clientPAN: string; assessmentYear: string; status: string; comments?: string; client: ClientData;
}

export default function StaffDashboard() {
  const [activeTab, setActiveTab] = useState<"assignments" | "history">("assignments");
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => { fetchAllocations(); }, []);

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

  const handleFileUpload = async (allocationId: string, files: FileList, folder: string) => {
    setUploadingId(allocationId);
    try {
      const formData = new FormData();
      formData.append("allocationId", allocationId);
      formData.append("folder", folder);
      // Append MULTIPLE files
      Array.from(files).forEach((file, index) => {
        formData.append(`file_${index}`, file);
      });

      const res = await fetch("/api/staff/upload-document", { method: "POST", body: formData });
      const data = await res.json();
      if (res.ok) alert("✅ " + data.message);
      else alert("❌ Upload failed: " + data.message);
    } catch (err) {
      alert("❌ Network error during upload.");
    } finally {
      setUploadingId(null);
    }
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
        <button onClick={handleLogout} className="mt-4 md:mt-0 bg-slate-200 hover:bg-slate-300 text-slate-800 text-sm font-bold py-2 px-6 rounded-lg">
          Sign Out
        </button>
      </header>

      {/* TABS */}
      <div className="flex border-b border-slate-200 mb-6 space-x-4">
        <button onClick={() => setActiveTab("assignments")} className={`py-2 px-4 font-semibold text-sm border-b-2 transition-all ${activeTab === "assignments" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}>Active Workspace</button>
        <button onClick={() => setActiveTab("history")} className={`py-2 px-4 font-semibold text-sm border-b-2 transition-all ${activeTab === "history" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}>Status & Feedback History</button>
      </div>

      {activeTab === "assignments" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto max-w-7xl mx-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left">
            <thead className="bg-slate-50">
              <tr>
                <th className="py-3 px-4 text-xs font-bold text-slate-500">Client Info</th>
                <th className="py-3 px-4 text-xs font-bold text-slate-500">Current Status</th>
                <th className="py-3 px-4 text-xs font-bold text-slate-500">Document Management</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white text-sm">
              {allocations.map((allocation) => (
                <tr key={allocation.id} className="hover:bg-slate-50 align-top">
                  <td className="py-4 px-4">
                    <p className="font-bold text-slate-800">{allocation.client?.name || "Unknown"}</p>
                    <p className="font-mono text-slate-500 text-xs mt-1">PAN: {allocation.clientPAN}</p>
                    <p className="text-slate-500 text-xs mt-1">AY: {allocation.assessmentYear}</p>
                  </td>
                  <td className="py-4 px-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mb-3 ${
                      allocation.status === "COI_Ready" ? "bg-amber-100 text-amber-800" : 
                      allocation.status === "Rejected" ? "bg-rose-100 text-rose-800" : "bg-blue-100 text-blue-800"
                    }`}>
                      {allocation.status}
                    </span>
                    {allocation.status === "Allocated" && (
                      <button onClick={() => updateStatus(allocation.id, "COI_Ready")} className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-1.5 px-3 rounded-md text-xs">Trigger 'COI Ready'</button>
                    )}
                    {/* NEW: Allow Resubmission if Rejected */}
                    {allocation.status === "Rejected" && (
                      <button onClick={() => updateStatus(allocation.id, "COI_Ready")} className="block w-full mt-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-1.5 px-3 rounded-md text-xs">Resubmit for Approval</button>
                    )}
                  </td>
                  <td className="py-4 px-4">
                    <div className="bg-slate-100 p-3 rounded-lg border border-slate-200">
                      <p className="text-xs font-bold text-slate-700 mb-2">Upload Files (Multiple Allowed)</p>
                      <div className="flex flex-col xl:flex-row gap-2">
                        <select id={`folder-${allocation.id}`} className="text-xs p-1.5 rounded border border-slate-300">
                          <option value="1">Folder 1: Raw Client Docs</option>
                          <option value="2">Folder 2: Internal Workings</option>
                          <option value="3">Folder 3: Draft Computations</option>
                          <option value="4">Folder 4: Final Tax Returns</option>
                        </select>
                        {/* NEW: multiple attribute added */}
                        <input type="file" multiple id={`file-${allocation.id}`} className="text-xs file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-blue-50 file:text-blue-700 file:font-semibold hover:file:bg-blue-100 max-w-[200px]" />
                        <button 
                          onClick={() => {
                            const folder = (document.getElementById(`folder-${allocation.id}`) as HTMLSelectElement).value;
                            const fileInput = document.getElementById(`file-${allocation.id}`) as HTMLInputElement;
                            if (fileInput.files && fileInput.files.length > 0) {
                              handleFileUpload(allocation.id, fileInput.files, folder);
                              fileInput.value = ""; 
                            } else alert("Select files first.");
                          }}
                          disabled={uploadingId === allocation.id}
                          className="bg-slate-800 text-white text-xs px-4 py-1.5 rounded hover:bg-slate-700 disabled:bg-slate-400 font-semibold"
                        >
                          {uploadingId === allocation.id ? "Uploading..." : "Push to Storage"}
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* NEW: HISTORY TAB */}
      {activeTab === "history" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto max-w-6xl mx-auto p-4">
          <h2 className="font-bold text-lg mb-4 text-slate-800">Admin Feedback & Logs</h2>
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead>
              <tr className="text-slate-500">
                <th className="py-2 font-bold">Client PAN</th>
                <th className="py-2 font-bold">Status</th>
                <th className="py-2 font-bold">Admin Comments / Feedback</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {allocations.map(a => (
                <tr key={a.id}>
                  <td className="py-3 font-mono">{a.clientPAN}</td>
                  <td className="py-3 font-semibold">{a.status}</td>
                  <td className="py-3 text-rose-600 italic">{a.comments || "No remarks"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
