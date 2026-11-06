import React, { useState } from 'react';
import { Users, Plus, CheckCircle2, CreditCard, AlertCircle } from 'lucide-react';
import { PayrollRun, BankAccount, Organization } from '../../types';
import { api } from '../../api';

interface PayrollViewProps {
  payrollRuns: PayrollRun[];
  bankAccounts: BankAccount[];
  activeOrg: Organization | null;
  onRefreshData: () => void;
}

export const PayrollView: React.FC<PayrollViewProps> = ({
  payrollRuns,
  bankAccounts,
  activeOrg,
  onRefreshData
}) => {
  const [isCreatingRun, setIsCreatingRun] = useState(false);
  const [periodMonth, setPeriodMonth] = useState(new Date().getMonth() + 1);
  const [periodYear, setPeriodYear] = useState(new Date().getFullYear());
  const [disbursingRunId, setDisbursingRunId] = useState<string | null>(null);
  const [selectedBankId, setSelectedBankId] = useState(bankAccounts[0]?.id || '');

  const [employees, setEmployees] = useState([
    { employee_name: 'Ahmed Bilal', designation: 'Principal Architect', base_salary: 450000, allowances: 50000, tax_withheld: 45000 },
    { employee_name: 'Usman Ali', designation: 'Senior Full-Stack Engineer', base_salary: 320000, allowances: 30000, tax_withheld: 30000 },
    { employee_name: 'Zainab Fatima', designation: 'DevOps & Cloud Engineer', base_salary: 280000, allowances: 20000, tax_withheld: 22000 }
  ]);

  const currency = activeOrg?.base_currency || 'PKR';

  const handleCreateRun = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createPayrollRun({
        period_month: Number(periodMonth),
        period_year: Number(periodYear),
        employees
      });
      setIsCreatingRun(false);
      onRefreshData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDisburse = async (runId: string) => {
    try {
      await api.disbursePayroll(runId, {
        bank_account_id: selectedBankId
      });
      setDisbursingRunId(null);
      onRefreshData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Payroll Accounting & Compensation</h2>
          <p className="text-xs text-slate-500">Employee salaries, FBR income tax deductions, and bank disbursements</p>
        </div>

        <button
          onClick={() => setIsCreatingRun(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Prepare Payroll Run</span>
        </button>
      </div>

      {/* Runs List */}
      <div className="space-y-4">
        {payrollRuns.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-slate-200 text-slate-400 text-xs">
            No payroll runs created yet. Click "Prepare Payroll Run" to schedule compensation.
          </div>
        ) : (
          payrollRuns.map((run) => (
            <div key={run.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs text-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 font-bold font-mono">
                    {run.period_month}/{run.period_year}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">
                      Payroll Run · Month {run.period_month}, {run.period_year}
                    </h3>
                    <p className="text-slate-500 text-[11px]">
                      {run.items?.length || 0} Employees · Net Pay: <strong className="text-slate-900 font-mono">{currency} {Number(run.total_net_pay).toLocaleString()}</strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      run.status === 'paid'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {run.status.toUpperCase()}
                  </span>

                  {run.status !== 'paid' && (
                    <button
                      onClick={() => setDisbursingRunId(run.id)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg flex items-center gap-1.5"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Disburse Salaries</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Employee table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-[10px] uppercase font-bold text-slate-400 border-b border-slate-200">
                    <tr>
                      <th className="pb-2">Employee Name</th>
                      <th className="pb-2">Designation</th>
                      <th className="pb-2 text-right">Base Salary ({currency})</th>
                      <th className="pb-2 text-right">Allowances ({currency})</th>
                      <th className="pb-2 text-right">FBR Tax Withheld ({currency})</th>
                      <th className="pb-2 text-right">Net Payable ({currency})</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {run.items?.map((emp) => (
                      <tr key={emp.id}>
                        <td className="py-2 font-sans font-bold text-slate-900">{emp.employee_name}</td>
                        <td className="py-2 font-sans text-slate-500">{emp.designation}</td>
                        <td className="py-2 text-right">{Number(emp.base_salary).toLocaleString()}</td>
                        <td className="py-2 text-right">{Number(emp.allowances).toLocaleString()}</td>
                        <td className="py-2 text-right text-red-600">-{Number(emp.tax_withheld).toLocaleString()}</td>
                        <td className="py-2 text-right font-bold text-emerald-700">{Number(emp.net_salary).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Disburse Modal */}
              {disbursingRunId === run.id && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg space-y-3 font-sans">
                  <div className="font-bold text-emerald-950">Disburse Net Salaries: {currency} {Number(run.total_net_pay).toLocaleString()}</div>
                  <div className="flex items-center gap-3">
                    <select
                      value={selectedBankId}
                      onChange={(e) => setSelectedBankId(e.target.value)}
                      className="border border-emerald-300 rounded-md p-1.5 bg-white text-xs flex-1 max-w-sm"
                    >
                      {bankAccounts.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.account_name} ({currency} {Number(b.current_balance).toLocaleString()})
                        </option>
                      ))}
                    </select>

                    <button
                      onClick={() => handleDisburse(run.id)}
                      className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded-md"
                    >
                      Confirm Direct Wire Settlement
                    </button>
                    <button
                      onClick={() => setDisbursingRunId(null)}
                      className="px-3 py-1.5 text-slate-600 hover:text-slate-900"
                    >
                      Cancel
                    </button>
                  </div>
                  <p className="text-[11px] text-emerald-800 font-mono">
                    Double-Entry: Debit Direct Labor Salaries (5010), Credit FBR Tax Payable (2300), Credit Bank Operating A/C.
                  </p>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Prepare Run Modal */}
      {isCreatingRun && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg p-6 space-y-4 text-xs">
            <h3 className="font-bold text-sm text-slate-900">Prepare Monthly Payroll Run</h3>
            <form onSubmit={handleCreateRun} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Period Month</label>
                  <input
                    type="number"
                    min="1"
                    max="12"
                    value={periodMonth}
                    onChange={(e) => setPeriodMonth(Number(e.target.value))}
                    className="w-full border border-slate-300 rounded-md p-2"
                    required
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Period Year</label>
                  <input
                    type="number"
                    value={periodYear}
                    onChange={(e) => setPeriodYear(Number(e.target.value))}
                    className="w-full border border-slate-300 rounded-md p-2"
                    required
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsCreatingRun(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-900 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-md"
                >
                  Create Draft Payroll Run
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
