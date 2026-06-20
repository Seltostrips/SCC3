"use client";

import { useState, useEffect } from "react";
// import { getStaffInfo } from "@/lib/auth"; // Assuming an auth utility
import { uploadFile } from "@/lib/supabaseStorage";

interface Allocation {
  id: string;
  clientPAN: string;
  staffID: string;
  assessmentYear: string;
  status: string;
  billingStatus: string;
  comments?: string;
}

const dummyStaffID = "STAFF001"; // Replace with dynamic staff ID from auth

export default function StaffDashboard() {
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchStaffAllocations();
  }, []);

  const fetchStaffAllocations = async () => {
    try {
      setLoading(true);
      // In a real app, this would be an authenticated API call
      // For now, we'll simulate an API call
      const response = await fetch(`/api/staff/allocations?staffId=${dummyStaffID}`);
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

  const handleFileUploadAndStatusUpdate = async (
    allocationId: string,
    clientPAN: string,
    assessmentYear: string,
    currentStatus: string,
    targetFolder: 1 | 2 | 3 | 4,
    newStatus: string,
    comments?: string
  ) => {
    if (!fileToUpload) {
      alert("Please select a file to upload.");
      return;
    }

    setUploading(true);
    try {
      await uploadFile(fileToUpload, clientPAN, assessmentYear, targetFolder);

      const response = await fetch("/api/staff/update-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          allocationId,
          newStatus,
          clientPAN,
          assessmentYear,
          folder: targetFolder,
          fileName: fileToUpload.name, // Pass filename for potential server-side logging
          comments, // Include comments for rejection
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update status");
      }

      setFileToUpload(null);
      await fetchStaffAllocations(); // Refresh allocations
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const allocationsByStatus = {
    actionRequired: allocations.filter((a) => a.status === "Allocated" || a.status === "Rejected"),
    pendingItrUpload: allocations.filter((a) => a.status === "Ready to upload"),
    pendingVerification: allocations.filter((a) => a.status === "Filed"),
    completed: allocations.filter((a) => a.status === "Verified"),
  };

  if (loading) return <div className="text-center py-8">Loading dashboard...</div>;
  if (error) return <div className="text-center py-8 text-red-500">Error: {error}</div>;

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <h1 className="text-3xl font-bold mb-8 text-center">Staff Dashboard</h1>

      {/* Section 1: Action Required / Rejections */}
      <div className="mb-8 bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-semibold mb-4">Action Required / Rejections</h2>
        {allocationsByStatus.actionRequired.length === 0 ? (
          <p className="text-gray-600">No action required at this time.</p>
        ) : (
          allocationsByStatus.actionRequired.map((allocation) => (
            <div key={allocation.id} className="border p-4 rounded-lg mb-4">
              <p>Client PAN: {allocation.clientPAN}</p>
              <p>Assessment Year: {allocation.assessmentYear}</p>
              <p>Status: {allocation.status}</p>
              {allocation.comments && <p className="text-red-500">Admin Comments: {allocation.comments}</p>}
              <input type="file" onChange={(e) => setFileToUpload(e.target.files ? e.target.files[0] : null)} className="mt-2" />
              <button
                onClick={() => handleFileUploadAndStatusUpdate(allocation.id, allocation.clientPAN, allocation.assessmentYear, allocation.status, 1, "COI Ready")}
                className="ml-2 bg-green-500 hover:bg-green-700 text-white font-bold py-1 px-3 rounded text-sm"
                disabled={uploading}
              >
                {uploading ? "Uploading..." : "Upload Raw Data & Mark COI Ready"}
              </button>
            </div>
          ))
        )}
      </div>

      {/* Section 2: Pending ITR Upload */}
      <div className="mb-8 bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-semibold mb-4">Pending ITR Upload</h2>
        {allocationsByStatus.pendingItrUpload.length === 0 ? (
          <p className="text-gray-600">No ITR uploads pending.</p>
        ) : (
          allocationsByStatus.pendingItrUpload.map((allocation) => (
            <div key={allocation.id} className="border p-4 rounded-lg mb-4">
              <p>Client PAN: {allocation.clientPAN}</p>
              <p>Assessment Year: {allocation.assessmentYear}</p>
              <p>Status: {allocation.status}</p>
              <input type="file" onChange={(e) => setFileToUpload(e.target.files ? e.target.files[0] : null)} className="mt-2" />
              <button
                onClick={() => handleFileUploadAndStatusUpdate(allocation.id, allocation.clientPAN, allocation.assessmentYear, allocation.status, 3, "Filed")}
                className="ml-2 bg-green-500 hover:bg-green-700 text-white font-bold py-1 px-3 rounded text-sm"
                disabled={uploading}
              >
                {uploading ? "Uploading..." : "Upload ITR & Mark Filed"}
              </button>
            </div>
          ))
        )}
      </div>

      {/* Section 3: Pending Verification */}
      <div className="mb-8 bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-semibold mb-4">Pending Verification</h2>
        {allocationsByStatus.pendingVerification.length === 0 ? (
          <p className="text-gray-600">No verifications pending.</p>
        ) : (
          allocationsByStatus.pendingVerification.map((allocation) => (
            <div key={allocation.id} className="border p-4 rounded-lg mb-4">
              <p>Client PAN: {allocation.clientPAN}</p>
              <p>Assessment Year: {allocation.assessmentYear}</p>
              <p>Status: {allocation.status}</p>
              <input type="file" onChange={(e) => setFileToUpload(e.target.files ? e.target.files[0] : null)} className="mt-2" />
              <button
                onClick={() => handleFileUploadAndStatusUpdate(allocation.id, allocation.clientPAN, allocation.assessmentYear, allocation.status, 4, "Verified")}
                className="ml-2 bg-green-500 hover:bg-green-700 text-white font-bold py-1 px-3 rounded text-sm"
                disabled={uploading}
              >
                {uploading ? "Uploading..." : "Upload Verification & Mark Verified"}
              </button>
            </div>
          ))
        )}
      </div>

      {/* Section 4: Completed View */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-semibold mb-4">Completed Allocations</h2>
        {allocationsByStatus.completed.length === 0 ? (
          <p className="text-gray-600">No completed allocations yet.</p>
        ) : (
          allocationsByStatus.completed.map((allocation) => (
            <div key={allocation.id} className="border p-4 rounded-lg mb-4 bg-gray-50">
              <p>Client PAN: {allocation.clientPAN}</p>
              <p>Assessment Year: {allocation.assessmentYear}</p>
              <p>Status: {allocation.status}</p>
              <p>Billing Status: {allocation.billingStatus}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
