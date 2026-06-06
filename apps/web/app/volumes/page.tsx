"use client";

import { useEffect, useState, useMemo } from "react";

import { HardDrive, Database, Server, Info, Box, Tag } from "lucide-react";

import { Permissions } from "@repo/core";

import api from "../../lib/api";
import { useRequirePermission } from "../../lib/use-require-permission";
import AccessDenied from "../components/AccessDenied";
import PageLoading from "../components/PageLoading";

interface PvcUsage {
  name: string;
  mount: string;
  used: number;
}

interface Metric {
  machineId: string;
  pvcUsage: PvcUsage[];
}

interface PvcMetadata {
  name: string;
  namespace: string;
  status: string;
  volumeName: string;
  storageClass: string;
  capacity?: string;
  accessModes: string[];
}

function parseKubernetesQuantity(quantity: string | undefined): number {
  if (!quantity) return 0;

  const units: Record<string, number> = {
    Ki: 1024,
    Mi: 1024 ** 2,
    Gi: 1024 ** 3,
    Ti: 1024 ** 4,
    Pi: 1024 ** 5,
    Ei: 1024 ** 6,
    k: 1000,
    m: 1000 ** 2,
    g: 1000 ** 3,
    t: 1000 ** 4,
    p: 1000 ** 5,
    e: 1000 ** 6,
  };

  const match = (quantity as string).match(/^(\d+(?:\.\d+)?)\s*([a-zA-Z]*)$/);
  if (!match) return 0;

  const value = parseFloat(match[1] || "0");
  const unit = match[2];

  if (!unit) return value;

  const factor = units[unit] || units[unit.toLowerCase()];
  return factor ? value * factor : value;
}

export default function VolumesPage() {
  const { authorized, loading: authLoading } = useRequirePermission(Permissions.CLUSTER_VIEW);
  const [pvcs, setPvcs] = useState<PvcMetadata[]>([]);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [clusterData, metricsData]: any = await Promise.all([
        api.get("cluster-info").json(),
        api.get("metrics/latest").json(),
      ]);

      setPvcs(clusterData.pvcs || []);
      setMetrics(metricsData || []);
    } catch (error) {
      console.error("Failed to fetch volumes data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const pvcWithUsage = useMemo(() => {
    // Create a map of usage by volume name
    const usageMap = new Map<string, PvcUsage & { machineId: string }>();
    metrics.forEach((m) => {
      (m.pvcUsage || []).forEach((u) => {
        usageMap.set(u.name, { ...u, machineId: m.machineId });
      });
    });

    return pvcs.map((pvc) => {
      const usage = usageMap.get(pvc.volumeName) || null;
      let calculatedUse = 0;
      let capacityBytes = 0;

      if (usage && pvc.capacity) {
        capacityBytes = parseKubernetesQuantity(pvc.capacity);
        calculatedUse = capacityBytes > 0 ? (usage.used / capacityBytes) * 100 : 0;
      }

      return {
        ...pvc,
        usage: usage
          ? {
              ...usage,
              calculatedUse,
              capacityBytes,
            }
          : null,
      };
    });
  }, [pvcs, metrics]);

  if (authLoading) return <PageLoading />;

  if (!authorized) {
    return (
      <AccessDenied
        title="Persistent Volumes"
        icon={<HardDrive size={32} className="text-[var(--accent)]" />}
      />
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen">
      <header className="flex justify-between items-center mb-12">
        <div className="flex items-center gap-4">
          <HardDrive size={32} className="text-[var(--accent)]" />
          <h1 className="text-4xl text-gradient">Persistent Volumes</h1>
        </div>
      </header>

      {loading ? (
        <div className="p-12 text-center text-slate-500 animate-pulse">Loading volume data...</div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {pvcWithUsage.length === 0 ? (
            <div className="glass p-16 text-center rounded-3xl flex flex-col items-center gap-6">
              <Database size={48} className="text-slate-600" />
              <p className="text-slate-400 max-w-md">
                No Persistent Volume Claims found in the cluster.
              </p>
            </div>
          ) : (
            pvcWithUsage.map((pvc) => (
              <div
                key={`${pvc.namespace}/${pvc.name}`}
                className="glass p-8 rounded-3xl grid grid-cols-1 lg:grid-cols-3 gap-8 items-center animate-in fade-in slide-in-from-bottom-4 duration-500"
              >
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-2xl bg-[var(--accent)]/10 text-[var(--accent)]">
                      <HardDrive size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-100">{pvc.name}</h3>
                      <p className="text-xs text-slate-500">{pvc.namespace}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span
                      className={`text-[10px] uppercase font-bold px-2 py-1 rounded-md border ${
                        pvc.status.toLowerCase() === "bound"
                          ? "bg-[var(--success-glow)] text-[var(--success)] border-[var(--success)]/20"
                          : "bg-[var(--warning-glow)] text-[var(--warning)] border-[var(--warning)]/20"
                      }`}
                    >
                      {pvc.status}
                    </span>
                    <span className="text-[10px] uppercase font-bold px-2 py-1 rounded-md bg-white/5 text-slate-400 border border-white/10">
                      {pvc.storageClass || "Default Storage"}
                    </span>
                  </div>
                </div>

                <div>
                  {pvc.usage ? (
                    <div className="space-y-3">
                      <div className="flex justify-between items-end mb-1">
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Activity size={12} className="text-[var(--accent)]" />
                          Live Usage
                        </span>
                        <span
                          className={`text-sm font-bold ${pvc.usage.calculatedUse > 80 ? "text-[var(--danger)]" : "text-slate-200"}`}
                        >
                          {pvc.usage.calculatedUse.toFixed(1)}%
                        </span>
                      </div>
                      <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500 ease-out"
                          style={{
                            width: `${pvc.usage.calculatedUse}%`,
                            backgroundColor:
                              pvc.usage.calculatedUse > 80 ? "var(--danger)" : "var(--accent)",
                            boxShadow: `0 0 10px ${pvc.usage.calculatedUse > 80 ? "var(--danger)" : "var(--accent)"}44`,
                          }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-500">
                        <span>Used: {(pvc.usage.used / 1024 / 1024 / 1024).toFixed(2)} GB</span>
                        <span>Total: {pvc.capacity}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-slate-500 italic text-sm bg-white/5 p-4 rounded-2xl border border-dashed border-white/10">
                      <Info size={16} />
                      Usage data not yet reported by host agent
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-3 lg:border-l lg:border-white/5 lg:pl-8">
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Tag size={14} className="text-slate-600" />
                    <span className="text-slate-500">PV Name:</span>
                    <span className="font-mono text-slate-300">{pvc.volumeName}</span>
                  </div>
                  {pvc.usage && (
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <Server size={14} className="text-slate-600" />
                      <span className="text-slate-500">Mounted on:</span>
                      <span className="text-slate-300">{pvc.usage.machineId}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Box size={14} className="text-slate-600" />
                    <span className="text-slate-500">Access Mode:</span>
                    <span className="text-slate-300">{(pvc.accessModes || []).join(", ")}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function Activity(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  );
}
