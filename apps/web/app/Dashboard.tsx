'use client';

import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import Link from 'next/link';
import { Activity, Cpu, Database, HardDrive, LayoutDashboard, Server, History } from 'lucide-react';

interface Metric {
  machineId: string;
  cpuUsage: number;
  ramUsage: number;
  diskUsage: number;
  timestamp: string;
}

interface DashboardProps {
  apiUrl: string;
}

export default function Dashboard({ apiUrl }: DashboardProps) {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = async () => {
    try {
      const response = await fetch(`${apiUrl}/metrics/latest`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();

      if (Array.isArray(data)) {
        setMetrics(data);
      } else {
        console.warn('API returned non-array data:', data);
        setMetrics([]);
      }
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
    }
  };

  useEffect(() => {
    fetchMetrics();

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

    return () => {
      socket.disconnect();
    };
  }, [apiUrl]);


  const getProgressColor = (value: number) => {
    if (value > 80) return 'var(--danger)';
    if (value > 60) return 'var(--warning)';
    return 'var(--accent)';
  };

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen">
      <header className="flex justify-between items-center mb-12">
        <div className="flex items-center gap-4">
          <LayoutDashboard size={32} className="text-[var(--accent)]" />
          <h1 className="text-4xl text-gradient">System Monitor</h1>
        </div>
        <div className="flex items-center gap-2 text-sm font-medium">
          <Activity size={18} className="text-[var(--success)]" />
          {loading ? 'Connecting...' : `${metrics.length} Agents Active`}
        </div>
      </header>

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

      <footer className="mt-16 text-center text-slate-500 text-sm">
        &copy; {new Date().getFullYear()} Monitoring System &bull; Built with Next.js & Tailwind
      </footer>
    </div>
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
