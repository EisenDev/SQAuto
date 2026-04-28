'use client';

import React, { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { safeFetch } from '@/lib/api_client';
import { Rocket, ArrowRight, Loader2, Database } from 'lucide-react';
import { toast } from 'sonner';

export default function NewProjectPage() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  
  const router = useRouter();
  const params = useParams();
  const orgId = params?.orgId;
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    const res = await safeFetch(`${API_URL}/organizations/${orgId}/projects`, {
      method: 'POST',
      body: JSON.stringify({ 
        name: name.trim(),
        description: description.trim() || undefined
      })
    });

    if (res.success) {
      toast.success('Project initialized successfully!');
      router.push(`/workspace/${res.data.id}/overview`);
    } else {
      toast.error(res.error || 'Failed to initialize project');
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-slate-950 p-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-teal-500/5 blur-[120px] rounded-full -z-10" />

      <div className="w-full max-w-md space-y-8 animate-fade-in-up">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-teal-500/10 border border-teal-500/20 mb-4 shadow-inner">
            <Rocket className="h-8 w-8 text-teal-500" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Initialize Migration Project</h1>
          <p className="text-slate-400 text-sm">Define the scope of your SQL transformation.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 bg-slate-900/40 p-8 rounded-3xl border border-slate-800/50 backdrop-blur-sm">
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 ml-1">
              Project Identifier
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Production Main DB"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-all text-sm"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 ml-1">
              Context (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief summary of this migration..."
              rows={3}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-all text-sm resize-none"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="w-full group relative flex items-center justify-center px-8 py-4 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-xl transition-all duration-200 shadow-xl shadow-teal-500/10 active:scale-[0.98] mt-4"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                Launch Workspace
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        <div className="flex items-center justify-center space-x-2 text-slate-600">
          <Database className="h-3 w-3" />
          <span className="text-[9px] uppercase tracking-widest font-mono">Linked to Org ID: {orgId?.toString().substring(0, 8)}...</span>
        </div>
      </div>
    </div>
  );
}
