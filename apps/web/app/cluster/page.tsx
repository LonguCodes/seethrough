'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Layers, Globe, Server, Box } from 'lucide-react';
import { useRequirePermission } from '../../lib/use-require-permission';
import { PERMISSIONS } from '../../lib/permissions';
import PageLoading from '../components/PageLoading';
import AccessDenied from '../components/AccessDenied';

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

import api from '../../lib/api';

export default function ClusterPage() {
  const { authorized, loading: authLoading } = useRequirePermission(PERMISSIONS.CLUSTER_VIEW);
  const [clusterInfo, setClusterInfo] = useState<ClusterInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchClusterInfo = async () => {
    try {
      const data: any = await api.get('cluster-info').json();
      setClusterInfo(data);
    } catch (error) {
      console.error('Failed to fetch cluster info:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClusterInfo();
    const interval = setInterval(fetchClusterInfo, 30000);
    return () => clearInterval(interval);
  }, []);

  const podsByNamespace = useMemo(() => {
    if (!clusterInfo?.pods) return {};
    return clusterInfo.pods.reduce((acc, pod) => {
      if (!acc[pod.namespace]) acc[pod.namespace] = [];
      acc[pod.namespace]?.push(pod);
      return acc;
    }, {} as Record<string, Pod[]>);
  }, [clusterInfo]);

  if (authLoading) return <PageLoading />;

  if (!authorized) {
    return <AccessDenied title="Cluster View" icon={<Layers size={32} className="text-[var(--accent)]" />} />;
  }

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen">
      <header className="flex justify-between items-center mb-12">
        <div className="flex items-center gap-4">
          <Layers size={32} className="text-[var(--accent)]" />
          <h1 className="text-4xl text-gradient">Cluster View</h1>
        </div>
      </header>

      {loading ? (
        <div className="p-12 text-center text-slate-500 animate-pulse">Loading cluster data...</div>
      ) : (
        <section className="space-y-12">
          {Object.entries(podsByNamespace).length === 0 ? (
             <div className="glass p-16 text-center rounded-3xl flex flex-col items-center gap-6">
                <Box size={48} className="text-slate-600" />
                <p className="text-slate-400 max-w-md">No pods detected in the cluster.</p>
             </div>
          ) : (
            Object.entries(podsByNamespace).map(([namespace, pods]) => (
              <div key={namespace} className="glass p-8 rounded-3xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h3 className="text-lg font-medium mb-6 flex items-center gap-2 text-slate-300">
                  <Globe size={18} className="text-[var(--accent)]" />
                  Namespace: <span className="text-[var(--accent)]">{namespace}</span>
                  <span className="ml-auto text-xs py-1 px-3 rounded-full bg-white/10 text-slate-400 font-normal">
                    {pods.length} Pods
                  </span>
                </h3>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
                  {pods.map((pod) => (
                    <Link 
                      key={pod.name} 
                      href={`/pod/${pod.namespace}/${pod.name}`}
                      className="bg-white/5 border border-white/5 p-4 rounded-2xl flex flex-col gap-2 hover:border-[var(--accent)]/30 hover:bg-white/[0.08] transition-all cursor-pointer group"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="font-medium text-sm text-slate-200 truncate group-hover:text-[var(--accent)] transition-colors" title={pod.name}>
                          {pod.name}
                        </div>
                        <StatusBadge status={pod.status} />
                      </div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-1 group-hover:text-slate-400 transition-colors">
                        <Server size={10} />
                        Node: {pod.nodeName || 'Pending'}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))
          )}
        </section>
      )}
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
