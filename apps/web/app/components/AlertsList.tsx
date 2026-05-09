'use client';

import { useEffect, useState, useCallback } from 'react';
import { AlertCircle, CheckCircle2, Info, AlertTriangle, Clock } from 'lucide-react';

interface Alert {
  id: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  status: 'active' | 'resolved';
  triggerType: string;
  createdAt: string;
  details?: any;
}

interface AlertsListProps {
  apiUrl: string;
  target?: string;
  compact?: boolean;
}

export default function AlertsList({ apiUrl, target, compact = false }: AlertsListProps) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = useCallback(async () => {
    try {
      const url = new URL(`${window.location.origin}${apiUrl}/alerts`);
      url.searchParams.append('status', 'active');
      if (target) {
        url.searchParams.append('target', target);
      }
      
      const response = await fetch(url.toString());
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      setAlerts(data);
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    } finally {
      setLoading(false);
    }
  }, [apiUrl, target]);

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 10000);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  const resolveAlert = async (id: string) => {
    try {
      const response = await fetch(`${apiUrl}/alerts/${id}/resolve`, {
        method: 'POST',
      });
      if (response.ok) {
        setAlerts((prev) => prev.filter((a) => a.id !== id));
      }
    } catch (error) {
      console.error('Failed to resolve alert:', error);
    }
  };

  const getSeverityConfig = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical':
        return { icon: <AlertCircle size={compact ? 16 : 20} />, color: 'text-[var(--danger)]', bg: 'bg-[var(--danger-glow)]', border: 'border-[var(--danger)]' };
      case 'warning':
        return { icon: <AlertTriangle size={compact ? 16 : 20} />, color: 'text-[var(--warning)]', bg: 'bg-[var(--warning-glow)]', border: 'border-[var(--warning)]' };
      default:
        return { icon: <Info size={compact ? 16 : 20} />, color: 'text-[var(--accent)]', bg: 'bg-[var(--accent-glow)]', border: 'border-[var(--accent)]' };
    }
  };

  if (loading && alerts.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 text-slate-500 animate-pulse">
        Loading alerts...
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-slate-500 text-center gap-4">
        <CheckCircle2 size={compact ? 32 : 48} className="text-[var(--success)] opacity-50" />
        <p className={compact ? 'text-sm' : ''}>No active alerts found.</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-[10px] ${compact ? '' : 'w-full'}`}>
      {alerts.map((alert) => {
        const config = getSeverityConfig(alert.severity);
        return (
          <div key={alert.id} className={`flex items-start gap-4 p-4 rounded-2xl glass ${config.bg} border-l-4 ${config.border} transition-all`}>
            <div className={`mt-1 ${config.color}`}>
              {config.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start gap-2">
                <p className={`font-semibold text-slate-200 break-words ${compact ? 'text-sm' : 'text-base'}`}>
                  {alert.message}
                </p>
                <button
                  onClick={() => resolveAlert(alert.id)}
                  className="text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors shrink-0"
                  title="Resolve Alert"
                >
                  Resolve
                </button>
              </div>
              
              <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <Clock size={12} />
                  {new Date(alert.createdAt).toLocaleString()}
                </span>
                {alert.details?.target && !target && (
                  <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 truncate max-w-[200px]">
                    Target: {alert.details.target}
                  </span>
                )}
                <span className="capitalize px-2 py-0.5 rounded bg-white/5 border border-white/10">
                  {alert.severity}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
