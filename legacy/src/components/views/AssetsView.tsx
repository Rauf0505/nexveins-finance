import React, { useState } from 'react';
import { Box, Play, CheckCircle2 } from 'lucide-react';
import { FixedAsset, Organization } from '../../types';
import { api } from '../../api';

interface AssetsViewProps {
  assets: FixedAsset[];
  activeOrg: Organization | null;
  onRefreshData: () => void;
}

export const AssetsView: React.FC<AssetsViewProps> = ({
  assets,
  activeOrg,
  onRefreshData
}) => {
  const [runningAssetId, setRunningAssetId] = useState<string | null>(null);

  const currency = activeOrg?.base_currency || 'PKR';

  const handleRunDepreciation = async (assetId: string) => {
    setRunningAssetId(assetId);
    try {
      const res = await api.runDepreciation(assetId);
      alert(`Depreciation posted! Monthly expense: ${currency} ${res.monthly_depreciation} recognized in GL.`);
      onRefreshData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setRunningAssetId(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Fixed Asset Register & Depreciation</h2>
          <p className="text-xs text-slate-500">Capitalized engineering workstations, servers, fixtures, and straight-line depreciation</p>
        </div>
      </div>

      {/* Asset Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Asset Code</th>
                <th className="py-3 px-4">Asset Description</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Purchase Date</th>
                <th className="py-3 px-4 text-right">Cost ({currency})</th>
                <th className="py-3 px-4 text-right">Accumulated Dep. ({currency})</th>
                <th className="py-3 px-4 text-right">Net Book Value ({currency})</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {assets.map((ast) => (
                <tr key={ast.id} className="hover:bg-slate-50/80">
                  <td className="py-3 px-4 font-bold text-slate-900">{ast.asset_code}</td>
                  <td className="py-3 px-4 font-sans font-medium text-slate-800">
                    <div>{ast.name}</div>
                    <div className="text-[11px] text-slate-400 font-mono">Useful Life: {ast.useful_life_years} Years (Straight-line)</div>
                  </td>
                  <td className="py-3 px-4 font-sans text-slate-600">{ast.category}</td>
                  <td className="py-3 px-4 text-slate-600">{ast.purchase_date}</td>
                  <td className="py-3 px-4 text-right text-slate-900">
                    {Number(ast.purchase_cost).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-4 text-right text-rose-700">
                    -{Number(ast.accumulated_depreciation).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-emerald-700 text-sm">
                    {Number(ast.net_book_value).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-4 text-center font-sans">
                    <button
                      onClick={() => handleRunDepreciation(ast.id)}
                      disabled={runningAssetId === ast.id}
                      className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-[11px] font-bold flex items-center gap-1 mx-auto disabled:opacity-50"
                    >
                      <Play className="w-3 h-3" />
                      <span>{runningAssetId === ast.id ? 'Posting...' : 'Run Monthly Dep.'}</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
