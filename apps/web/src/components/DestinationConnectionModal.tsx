import React, { useState, useEffect } from 'react';
import { X, Server, Shield, RefreshCw } from 'lucide-react';

export interface SavedConnection {
  id: string;
  name: string;
  host: string;
  port: number;
  database_name: string;
  username: string;
  db_type: string;
  created_at?: string;
  updated_at?: string;
}

interface DestinationConnectionModalProps {
  connection: SavedConnection | null;
  onClose: () => void;
  onSave: (id: string, updates: any) => Promise<void>;
  onTest: (id: string, updates: any) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export default function DestinationConnectionModal({
  connection,
  onClose,
  onSave,
  onTest,
  onDelete
}: DestinationConnectionModalProps) {
  const [form, setForm] = useState<any>({});
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    if (connection) {
      setForm({
        name: connection.name,
        host: connection.host,
        port: connection.port,
        database_name: connection.database_name,
        username: connection.username,
        password: '', // Blank placeholder protects actual password
      });
      setMessage(null);
    }
  }, [connection]);

  if (!connection) return null;

  const handleTest = async () => {
    setTesting(true);
    setMessage(null);
    try {
      await onTest(connection.id, form);
      setMessage({ text: 'Connection successful', type: 'success' });
    } catch (err: any) {
      setMessage({ text: err.message || 'Connection failed', type: 'error' });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await onSave(connection.id, form);
      setMessage({ text: 'Connection saved', type: 'success' });
      setTimeout(onClose, 1000);
    } catch (err: any) {
      setMessage({ text: err.message || 'Save failed', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this connection?')) return;
    setDeleting(true);
    try {
      await onDelete(connection.id);
      onClose();
    } catch (err: any) {
      setMessage({ text: err.message || 'Deletion failed', type: 'error' });
      setDeleting(false);
    }
  };

  const fields = [
    { key: 'name', label: 'CONNECTION NAME', placeholder: 'My DB' },
    { key: 'host', label: 'HOST', placeholder: '127.0.0.1' },
    { key: 'port', label: 'PORT', placeholder: '5432', type: 'number' },
    { key: 'database_name', label: 'DATABASE', placeholder: 'postgres' },
    { key: 'username', label: 'USERNAME', placeholder: 'postgres' },
    { key: 'password', label: 'PASSWORD', placeholder: 'Leave blank to keep existing password', type: 'password' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Server className="w-5 h-5 text-slate-400" />
            <h3 className="font-black text-sm text-white tracking-widest uppercase italic">Edit Saved Connection</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            {fields.map(f => (
              <div key={f.key}>
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">{f.label}</label>
                <input
                  type={f.type || 'text'}
                  placeholder={f.placeholder}
                  value={form[f.key]}
                  onChange={e => setForm({ ...form, [f.key]: f.type === 'number' ? Number(e.target.value) : e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-4 text-sm text-gray-800 font-mono placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-slate-500/10 focus:border-slate-500 transition-all shadow-inner"
                />
              </div>
            ))}
          </div>

          {message && (
            <div className={`mb-4 p-3 rounded-xl border text-xs font-mono font-bold w-full ${
              message.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 
              message.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-blue-50 border-blue-200 text-blue-800'
            }`}>
              {message.text}
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="text-xs font-black uppercase tracking-widest text-red-500 hover:text-red-700 transition-colors"
            >
              {deleting ? 'Deleting...' : 'Delete Connection'}
            </button>
            <div className="flex space-x-3">
              <button
                onClick={handleTest}
                disabled={testing}
                className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gray-50 transition-all flex items-center space-x-2"
              >
                {testing && <RefreshCw className="w-3 h-3 animate-spin" />}
                <span>{testing ? 'Testing...' : 'Test Connection'}</span>
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-900 transition-all shadow-md active:scale-95"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
