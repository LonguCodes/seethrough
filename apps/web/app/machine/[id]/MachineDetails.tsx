"use client";

import { useEffect, useState, useMemo } from "react";

import { ArrowLeft, Cpu, Database, HardDrive, Server, Activity } from "lucide-react";
import Link from "next/link";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { io } from "socket.io-client";

import { Permissions } from "@repo/core";

import api from "../../../lib/api";
import { useRequirePermission } from "../../../lib/use-require-permission";
import AccessDenied from "../../components/AccessDenied";
import PageLoading from "../../components/PageLoading";

interface Metric {
  machineId: string;
  cpuUsage: number;
  ramUsage: number;
  diskUsage: number;
  timestamp: string;
}

interface MachineDetailsProps {
  id: string;
  apiUrl: string;
}

export default function MachineDetails({ id, apiUrl }: MachineDetailsProps) {
  const { authorized, loading: authLoading } = useRequirePermission(Permissions.CLUSTER_VIEW);
  const [history, setHistory] = useState<Metric[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(Date.now());

  const fetchHistory = async () => {
    try {
      const data: any = await api.get(`metrics/${id}/history`).json();

      if (Array.isArray(data)) {
        setHistory(data.reverse());
      }
      setLoading(false);
    } catch (error) {
      console.error("Failed to fetch history:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();

    const socket = io();

    socket.on("metrics-update", (updatedMetric: Metric) => {
      if (updatedMetric.machineId === id) {
        setHistory((prev) => [...prev.slice(-999), updatedMetric]);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [id, apiUrl]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const windowSize = 5 * 60 * 1000; // 5 minutes in ms
  const domain = useMemo(() => {
    const roundedNow = Math.floor(currentTime / 1000) * 1000;
    return [roundedNow - windowSize, roundedNow] as [number, number];
  }, [currentTime]);

  const chartData = useMemo(() => {
    return history.map((m) => ({
      ...m,
      timestamp: new Date(m.timestamp).getTime(),
    }));
  }, [history]);

  if (authLoading) return <PageLoading />;

  if (!authorized) {
    return (
      <>
        <Link
          href="/"
          className="flex items-center gap-2 text-slate-400 no-underline text-sm hover:text-[var(--accent)] transition-colors mb-6 p-8 max-w-7xl mx-auto"
        >
          <ArrowLeft size={18} />
          Back to Dashboard
        </Link>
        <AccessDenied />
      </>
    );
  }

  if (loading)
    return (
      <div className="p-8 max-w-7xl mx-auto min-h-screen text-[var(--foreground)]">
        Loading history for {id}...
      </div>
    );

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen">
      <Link
        href="/"
        className="flex items-center gap-2 text-slate-400 no-underline text-sm hover:text-[var(--accent)] transition-colors mb-6"
      >
        <ArrowLeft size={18} />
        Back to Dashboard
      </Link>

      <header className="flex justify-between items-center mb-12">
        <div className="flex items-center gap-4">
          <Server size={32} className="text-[var(--accent)]" />
          <h1 className="text-4xl text-gradient">{id} History</h1>
        </div>
        <div className="flex items-center gap-2 text-sm font-medium">
          <Activity size={18} className="text-[var(--success)]" />
          Live Monitoring (Last 5m)
        </div>
      </header>

      <div className="space-y-8">
        <ChartSection
          title="CPU Usage (%)"
          icon={<Cpu size={20} className="text-[#a5a6f6]" />}
          data={chartData}
          dataKey="cpuUsage"
          color="#a5a6f6"
          domain={domain}
        />

        <ChartSection
          title="RAM Usage (%)"
          icon={<Database size={20} className="text-[#38bdf8]" />}
          data={chartData}
          dataKey="ramUsage"
          color="#38bdf8"
          domain={domain}
        />

        <ChartSection
          title="Disk Usage (%)"
          icon={<HardDrive size={20} className="text-[#fbbf24]" />}
          data={chartData}
          dataKey="diskUsage"
          color="#fbbf24"
          domain={domain}
        />
      </div>

      <footer className="mt-16 text-center text-slate-500 text-sm">
        &copy; {new Date().getFullYear()} Monitoring System &bull; Historical Analytics
      </footer>
    </div>
  );
}

interface ChartSectionProps {
  title: string;
  icon: React.ReactNode;
  data: any[];
  dataKey: string;
  color: string;
  domain: [number, number];
}

function ChartSection({ title, icon, data, dataKey, color, domain }: ChartSectionProps) {
  return (
    <div className="mt-8 p-6 rounded-3xl bg-white/[0.02] border border-white/5 overflow-hidden">
      <h2 className="text-lg mb-6 flex items-center gap-2 text-white">
        {icon}
        {title}
      </h2>
      <div className="h-[300px] w-full transform-gpu">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis
              type="number"
              dataKey="timestamp"
              domain={domain}
              stroke="#64748b"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              tickFormatter={(time) =>
                new Date(time).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })
              }
              allowDataOverflow
              tickCount={6}
            />

            <YAxis
              width={50}
              domain={[0, 100]}
              stroke="#64748b"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              allowDataOverflow
            />
            <Tooltip
              contentStyle={{ background: "#1e293b", border: "none", borderRadius: "8px" }}
              itemStyle={{ color }}
              labelFormatter={(label) => new Date(label).toLocaleString()}
              formatter={(value: any) => [`${Number(value).toFixed(2)}%`, title.split(" (")[0]]}
              isAnimationActive={false}
              useTranslate3d
            />

            <Line
              type="linear"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
              connectNulls
              animationDuration={0}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
