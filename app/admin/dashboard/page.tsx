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
  const [userFile, setUserFile] = useState<File | null>(null);
  const [uploadingUsers, setUploadingUsers] = useState(false);

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
      { name: "On Hold (Late/Pending)", value: onHold, color: COLORS.OnHold } // Bottom grouping
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
      if (!stats[staffKey]) stats[staff
