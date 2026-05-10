'use client';

import { useEffect, useState, use } from 'react';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import PodDetails from '../../../PodDetails';
import api from '../../../../lib/api';

interface Pod {
  name: string;
  namespace: string;
  status: string;
  nodeName: string;
  podIP?: string;
  startTime?: string;
  labels?: Record<string, string>;
}

export default function PodPage({ params }: { params: Promise<{ namespace: string; name: string }> }) {
  const { namespace, name } = use(params);
  const [pod, setPod] = useState<Pod | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`cluster-info/pods/${namespace}/${name}`).json()
      .then((data: any) => {
        setPod(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [namespace, name]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="animate-pulse text-slate-500">Loading pod details...</div>
      </div>
    );
  }

  if (!pod) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold text-slate-300">Pod not found</h1>
        <Link href="/" className="px-4 py-2 bg-white/5 rounded-xl hover:bg-white/10 transition-colors">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] text-white">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-slate-500 hover:text-[var(--accent)] transition-colors mb-8 group"
        >
          <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          Back to Dashboard
        </Link>

        {/* Use PodDetails but without the modal overlay */}
        <PodDetailsView pod={pod} />
      </div>
    </div>
  );
}

// Internal version of PodDetails tuned for page view
function PodDetailsView({ pod }: { pod: Pod }) {
  // I will refactor the existing PodDetails component logic here 
  // or just import the component if I make it flexible.
  // For now I will build a dedicated page view for maximum "premium" feel.
  return (
    <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex justify-between items-end">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${pod.status === 'Running' ? 'bg-emerald-500/10 text-emerald-500' :
                pod.status === 'Pending' ? 'bg-amber-500/10 text-amber-500' : 'bg-rose-500/10 text-rose-500'
              }`}>
              {pod.status}
            </span>
            <span className="text-slate-600">/</span>
            <span className="text-xs text-slate-500 font-mono">{pod.namespace}</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight">{pod.name}</h1>
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-500 mb-1 leading-none uppercase tracking-widest">Pod IP</div>
          <div className="text-xl font-mono text-slate-300">{pod.podIP || '---.---.---.---'}</div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1 flex flex-col gap-8">
          {/* Info Section */}
          <div className="glass p-6 rounded-3xl border border-white/5 bg-white/[0.01]">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6">Environment</h3>
            <div className="grid gap-4">
              <DetailItem label="Node" value={pod.nodeName} />
              <DetailItem label="Started" value={pod.startTime ? new Date(pod.startTime).toLocaleString() : 'Recently'} />
              <DetailItem label="Namespace" value={pod.namespace} />
            </div>
          </div>

          {/* Labels Section */}
          <div className="glass p-6 rounded-3xl border border-white/5 bg-white/[0.01]">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Labels</h3>
            <div className="flex flex-wrap gap-2">
              {pod.labels ? Object.entries(pod.labels).map(([k, v]) => (
                <div key={k} className="text-[10px] px-2 py-1 rounded-lg bg-white/5 border border-white/5 text-slate-400">
                  {k}: <span className="text-slate-300">{v}</span>
                </div>
              )) : <div className="text-xs text-slate-600 italics">No labels assigned</div>}
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 flex flex-col gap-8 min-h-0">
          {/* Log Viewer Section */}
          <div className="glass rounded-[2rem] border border-white/5 bg-white/[0.01] overflow-hidden flex flex-col h-[700px]">
            <div className="p-6 border-b border-white/5 flex items-center justify-between shrink-0">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse" />
                Live Stream
              </h3>
            </div>
            <div className="flex-1 relative min-h-0">
              <div className="absolute inset-0">
                <PodDetailsLogViewer podName={pod.name} namespace={pod.namespace} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] text-slate-500 uppercase tracking-tighter mb-1">{label}</div>
      <div className="text-sm font-medium text-slate-200">{value}</div>
    </div>
  );
}

// We wrap LogViewer for the page view
import LogViewerComponent from '../../../LogViewer';
function PodDetailsLogViewer({ podName, namespace }: { podName: string; namespace: string }) {
  return (
    <LogViewerComponent
      podName={podName}
      namespace={namespace}
      onClose={() => { }}
      isEmbedded
    />
  );
}
