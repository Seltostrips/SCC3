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
  const [uploadingId, setUploadingId] = useState<string | null>(null);
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
      const formData = new FormData();
      formData.append("allocationId", allocationId);
      formData.append("newStatus", newStatus);

      const response = await fetch("/api/staff/update-status", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        fetchAllocations();
      } else {
        console.error("Server rejected the status update");
      }
    } catch (err) {
      console.error("Failed to update status");
    }
  };

  const handleFileUpload = async (allocationId: string, file: File, folder: string) => {
    setUploadingId(allocationId);
    try {
      const formData = new FormData();
      formData.append("allocationId", allocationId);
      formData.append("file", file);
      formData.append("folder", folder);

      const res = await fetch("/api/staff/upload-document", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        alert("✅ " + data.message);
      } else {
        alert("❌ Upload failed: " + data.message);
      }
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

  if (loading) return <div className="text-center py-12 text-slate-500">Loading Auditor Dashboard...</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <header className="mb-8 flex flex-col md:flex-row items-center justify-between border-b pb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Auditor Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Manage your assigned client portfolio and Supabase document routing.</p>
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
                  <th className="py-3 px-4 text-xs font-bold text-slate-500">Client Info</th>
                  <th className="py-3 px-4 text-xs font-bold text-slate-500">Status</th>
                  <th className="py-3 px-4 text-xs font-bold text-slate-500">Document Management (Supabase)</th>
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
                        allocation.status === "COI_Ready" ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"
                      }`}>
                        {allocation.status}
                      </span>
                      {allocation.status === "Allocated" && (
                        <button 
                          onClick={() => updateStatus(allocation.id, "COI_Ready")}
                          className="block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-1.5 px-3 rounded-md text-xs transition-colors"
                        >
                          Trigger 'COI Ready'
                        </button>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      {/* Supabase Folder Upload Interface */}
                      <div className="bg-slate-100 p-3 rounded-lg border border-slate-200">
                        <p className="text-xs font-bold text-slate-700 mb-2">Upload File to Folder</p>
                        <div className="flex flex-col xl:flex-row gap-2">
                          <select id={`folder-${allocation.id}`} className="text-xs p-1.5 rounded border border-slate-300 focus:outline-none">
                            <option value="1">Folder 1: Raw Client Docs</option>
                            <option value="2">Folder 2: Internal Workings</option>
                            <option value="3">Folder 3: Draft Computations</option>
                            <option value="4">Folder 4: Final Tax Returns</option>
                          </select>
                          <input 
                            type="file" 
                            id={`file-${allocation.id}`} 
                            className="text-xs file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-blue-50 file:text-blue-700 file:font-semibold hover:file:bg-blue-100" 
                          />
                          <button 
                            onClick={() => {
                              const folder = (document.getElementById(`folder-${allocation.id}`) as HTMLSelectElement).value;
                              const fileInput = document.getElementById(`file-${allocation.id}`) as HTMLInputElement;
                              if (fileInput.files && fileInput.files[0]) {
                                handleFileUpload(allocation.id, fileInput.files[0], folder);
                                fileInput.value = ""; // Clear input after clicking upload
                              } else {
                                alert("Please select a file first.");
                              }
                            }}
                            disabled={uploadingId === allocation.id}
                            className="bg-slate-800 text-white text-xs px-4 py-1.5 rounded hover:bg-slate-700 disabled:bg-slate-400 font-semibold whitespace-nowrap"
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
      </div>
    </div>
  );
}
