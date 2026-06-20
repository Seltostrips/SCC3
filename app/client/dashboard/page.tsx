"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
// Assuming you have an auth utility to get the logged-in user or client PAN
// import { getClientInfo } from "@/lib/auth"; 
// For now, we'll use dummy data or a placeholder PAN

interface Allocation {
  id: string;
  clientPAN: string;
  staffID: string;
  assessmentYear: string;
  status: string;
  billingStatus: string;
  comments?: string;
}

const dummyClientPAN = "ABCDE1234F"; // Replace with dynamic client PAN from auth

export default function ClientDashboard() {
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchAllocations = async () => {
      try {
        setLoading(true);
        // In a real app, this would be an authenticated API call
        // For now, we'll simulate an API call
        const response = await fetch(`/api/client/allocations?pan=${dummyClientPAN}`);
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

    fetchAllocations();
  }, []);

  const groupedAllocations = allocations.reduce((acc, allocation) => {
    (acc[allocation.assessmentYear] = acc[allocation.assessmentYear] || []).push(allocation);
    return acc;
  }, {} as Record<string, Allocation[]>);

  if (loading) return <div className="text-center py-8">Loading allocations...</div>;
  if (error) return <div className="text-center py-8 text-red-500">Error: {error}</div>;

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <h1 className="text-3xl font-bold mb-8 text-center">Client Dashboard</h1>

      {Object.keys(groupedAllocations).length === 0 ? (
        <p className="text-center text-gray-600">No allocations found for your PAN.</p>
      ) : (
        Object.keys(groupedAllocations).sort().map((year) => (
          <div key={year} className="mb-8 bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold mb-4">Assessment Year: {year}</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-200">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">Staff ID</th>
                    <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">Status</th>
                    <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">Billing Status</th>
                    <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedAllocations[year].map((allocation) => (
                    <tr key={allocation.id} className="hover:bg-gray-50">
                      <td className="py-2 px-4 border-b text-sm text-gray-800">{allocation.staffID}</td>
                      <td className="py-2 px-4 border-b text-sm text-gray-800">{allocation.status}</td>
                      <td className="py-2 px-4 border-b text-sm text-gray-800">{allocation.billingStatus}</td>
                      <td className="py-2 px-4 border-b text-sm text-gray-800">
                        {/* Download links for Folder 2 (COI) and Folder 3 (ITR) */}
                        {(allocation.status === "Filed" || allocation.status === "Verified") && (
                          <div className="flex space-x-2">
                            <button className="text-blue-600 hover:underline text-sm">Download COI</button>
                            <button className="text-blue-600 hover:underline text-sm">Download ITR</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
