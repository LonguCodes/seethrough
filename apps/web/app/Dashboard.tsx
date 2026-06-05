'use client';

import { useEffect, useMemo, useState } from 'react';

import { Activity, Cpu, Database, HardDrive, LayoutDashboard, Server, History, Box, Layers, Globe, AlertTriangle, Settings } from 'lucide-react';
import Link from 'next/link';
import { io } from 'socket.io-client';

import AlertsList from './components/AlertsList';
import api from '../lib/api';
import { PERMISSIONS } from '../lib/permissions';
import { useRequirePermission } from '../lib/use-require-permission';
import AccessDenied from './components/AccessDenied';
import PageLoading from './components/PageLoading';

interface Metric {
// ... existing interfaces
  machineId: string;
  cpuUsage: number;
  ramUsage: number;
  diskUsage: number;
  timestamp: string;
}

interface Pod {
  name: string;
  namespace: string;
  status: string;
  nodeName: string;
  podIP?: string;
  startTime?: string;
  labels?: Record<string, string>;
}

interface ClusterInfo {
  nodes: any[];
  pods: Pod[];
  namespaces: any[];
  timestamp: string;
}

interface DashboardProps {
  apiUrl: string;
}


export default function Dashboard({ apiUrl }: DashboardProps) {
  const { authorized, loading: authLoading } = useRequirePermission(PERMISSIONS.CLUSTER_VIEW);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [clusterInfo, setClusterInfo] = useState<ClusterInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = async () => {
    try {
      const data: any = await api.get('metrics/latest').json();

      if (Array.isArray(data)) {
        setMetrics(data);
      } else {
        console.warn('API returned non-array data:', data);
        setMetrics([]);
      }
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
    }
  };

  const fetchClusterInfo = async () => {
    try {
      const data: any = await api.get('cluster-info').json();
      setClusterInfo(data);
    } catch (error) {
      console.error('Failed to fetch cluster info:', error);
    }
  };

  useEffect(() => {
    const init = async () => {
      await Promise.all([fetchMetrics(), fetchClusterInfo()]);
      setLoading(false);
    };
    init();

    const socket = io();

    socket.on('metrics-update', (updatedMetric: Metric) => {
      setMetrics((prevMetrics) => {
        const index = prevMetrics.findIndex((m) => m.machineId === updatedMetric.machineId);
        if (index !== -1) {
          const newMetrics = [...prevMetrics];
          newMetrics[index] = updatedMetric;
          return newMetrics;
        }
        return [...prevMetrics, updatedMetric];
      });
    });

    const interval = setInterval(fetchClusterInfo, 30000);

    return () => {
      socket.disconnect();
      clearInterval(interval);
    };
  }, [apiUrl]);

  const getProgressColor = (value: number) => {
    if (value > 80) return 'var(--danger)';
    if (value > 60) return 'var(--warning)';
    return 'var(--accent)';
  };

  if (authLoading) return <PageLoading />;

  if (!authorized) {
    return <AccessDenied title="System Monitor" icon={<LayoutDashboard size={32} className="text-[var(--accent)]" />} />;
  }

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen">
      <header className="flex justify-between items-center mb-12">
        <div className="flex items-center gap-4">
          <LayoutDashboard size={32} className="text-[var(--accent)]" />
          <h1 className="text-4xl text-gradient">System Monitor</h1>
        </div>
        <div className="flex items-center gap-6 text-sm font-medium">
          <div className="flex items-center gap-2">
            <Activity size={18} className="text-[var(--success)]" />
            {loading ? 'Connecting...' : `${metrics.length} Agents Active`}
          </div>
          {clusterInfo && (
            <div className="flex items-center gap-2 text-slate-400">
              <Globe size={18} className="text-[var(--accent)]" />
              {clusterInfo.pods.length} Pods
            </div>
          )}
        </div>
      </header>

      <section className="mb-16">
        <div className="flex items-center gap-3 mb-8">
          <AlertTriangle size={24} className="text-[var(--warning)]" />
          <h2 className="text-2xl font-semibold">Active Alerts</h2>
        </div>
        <AlertsList apiUrl={apiUrl} />
      </section>

      <section className="mb-16">
        <div className="flex items-center gap-3 mb-8">
          <Server size={24} className="text-[var(--accent)]" />
          <h2 className="text-2xl font-semibold">Machine Metrics</h2>
        </div>
        {metrics.length === 0 && !loading ? (
          <div className="glass p-16 text-center rounded-3xl flex flex-col items-center gap-6">
            <Server size={48} className="text-slate-600" />
            <p className="text-slate-400 max-w-md">No active agents detected. Make sure your agents are configured with the correct API URL and are running.</p>
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(350px,1fr))] gap-8">
            {metrics.map((metric) => (
              <div key={metric.machineId} className="glass p-8 rounded-3xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_40px_0_var(--accent-glow)]">
                <div className="text-xl mb-6 text-[var(--accent)] flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Server size={20} />
                    {metric.machineId}
                  </div>
                  <Link
                    href={`/machine/${metric.machineId}`}
                    className="flex items-center gap-2 text-xs text-slate-400 py-1.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 hover:text-[var(--accent)] hover:translate-x-0.5 transition-all no-underline"
                  >
                    <History size={16} />
                    History
                  </Link>
                </div>

                <MetricBar
                  label="CPU Usage"
                  value={metric.cpuUsage}
                  color={getProgressColor(metric.cpuUsage)}
                  icon={<Cpu size={14} />}
                />
                <MetricBar
                  label="RAM Usage"
                  value={metric.ramUsage}
                  color={getProgressColor(metric.ramUsage)}
                  icon={<Database size={14} />}
                />
                <MetricBar
                  label="Disk Usage"
                  value={metric.diskUsage}
                  color={getProgressColor(metric.diskUsage)}
                  icon={<HardDrive size={14} />}
                />

                <div className="text-xs text-slate-500 mt-4 pt-4 border-t border-white/5">
                  Last updated: {new Date(metric.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>


      <footer className="mt-16 text-center text-slate-500 text-sm">
        &copy; {new Date().getFullYear()} Monitoring System &bull; Built with Next.js & Tailwind
      </footer>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const getStatusStyles = (s: string) => {
    switch (s.toLowerCase()) {
      case 'running':
        return 'bg-[var(--success-glow)] text-[var(--success)] border-[var(--success)]/20';
      case 'pending':
        return 'bg-[var(--warning-glow)] text-[var(--warning)] border-[var(--warning)]/20';
      case 'failed':
      case 'error':
        return 'bg-[var(--danger-glow)] text-[var(--danger)] border-[var(--danger)]/20';
      default:
        return 'bg-white/5 text-slate-400 border-white/10';
    }
  };

  return (
    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${getStatusStyles(status)}`}>
      {status}
    </span>
  );
}

function MetricBar({ label, value, color, icon }: { label: string; value: number; color: string; icon?: React.ReactNode }) {
  return (
    <div className="mb-6">
      <div className="flex justify-between mb-2 text-sm text-slate-400">
        <span className="flex items-center gap-2">
          {icon}
          {label}
        </span>
        <span>{value.toFixed(2)}%</span>
      </div>
      <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1)"
          style={{
            width: `${value}%`,
            background: color,
            boxShadow: `0 0 12px ${color}44`
          }}
        />
      </div>
    </div>
  );
}
