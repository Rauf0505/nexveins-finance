import React, { useState, useEffect } from 'react';
import { ShieldCheck, Search, Filter, Lock } from 'lucide-react';
import { AuditEvent, Organization } from '../../types';
import { api } from '../../api';

interface AuditViewProps {
  activeOrg: Organization | null;
}

export const AuditView: React.FC<AuditViewProps> = ({ activeOrg }) => {
  const [logs, setLogs] = useState<AuditEvent[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const loadAuditLogs = async () => {
    setIsLoading(true);
    try {
      const res = await api.getAuditTrail();
      setLogs(res);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAuditLogs();
  }, [activeOrg?.id]);

  const filteredLogs = logs.filter(
    (l) =>
      l.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.entity_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (l.user_email && l.user_email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      l.details.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-900">Append-Only Audit Trail</h2>
            <span className="flex items-center gap-1 text-[10px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-sm">
              <Lock className="w-3 h-3 text-emerald-600" />
              <span>IMMUTABLE LOG</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">Traceable forensic log of all financial postings, reversals & administrative security actions</p>
        </div>

        <div className="relative flex-1 sm:w-64 max-w-sm">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search action, actor, entity..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none"
          />
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Timestamp (UTC)</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Entity Type</th>
                <th className="py-3 px-4">Entity Reference</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Audit Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400 font-mono">Loading immutable audit stream...</td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400 font-sans">No audit events match your filter.</td>
                </tr>
              ) : (
                filteredLogs.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50/80">
                    <td className="py-2.5 px-4 font-mono text-slate-600 whitespace-nowrap">{l.timestamp}</td>
                    <td className="py-2.5 px-4">
                      <span className="font-mono text-[10px] font-bold uppercase px-2 py-0.5 rounded-sm bg-slate-100 text-slate-800">
                        {l.action}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-mono text-[11px] text-slate-600">{l.entity_type}</td>
                    <td className="py-2.5 px-4 font-mono font-bold text-slate-900">{l.entity_id || '-'}</td>
                    <td className="py-2.5 px-4 text-slate-700">
                      <div>{l.user_email || 'System Daemon'}</div>
                      <div className="text-[10px] font-mono text-slate-400">{l.ip_address}</div>
                    </td>
                    <td className="py-2.5 px-4 text-slate-600 max-w-md">{l.details}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
