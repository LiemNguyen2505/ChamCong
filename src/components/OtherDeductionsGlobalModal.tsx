import React, { useState } from 'react';
import { X, Wallet, Banknote, RefreshCw, Box, Landmark } from 'lucide-react';
import MaterialLossModal from './MaterialLossModal';
import { FinancialModal } from './FinancialModal';

interface OtherDeductionsGlobalModalProps {
  show: boolean;
  onClose: () => void;
  adminTheme: any;
  nhanViens: any[];
  allowedBranches: string[];
  logAction: (action: string, module: string, details: string) => Promise<void>;
  openConfirmModal: (title: string, message: string, onConfirm: () => void) => void;
  fetchInitialData: (month?: string, force?: boolean) => Promise<void>;
  filterMonth: string;
  payrollActiveBranch: string;
  materialItems: any[];
  materialLossLogs: any[];
  weightedEmployees: any[];
  setWeightedEmployees: (val: any[]) => void;
  itemType: string;
  setItemType: (val: string) => void;
  lossType?: 'general' | 'individual';
  setLossType?: (val: 'general' | 'individual') => void;
  originalPrice: string;
  setOriginalPrice: (val: string) => void;
  deductionPrice?: number;
  quantity: string;
  setQuantity: (val: string) => void;
  totalLossAmount?: string;
  setTotalLossAmount?: (val: string) => void;
  isProcessingLoss: boolean;
  onProcessMaterialLoss: () => Promise<void>;
  localAdjustments?: Record<string, any>;
  payrollAdjustments?: Record<string, any>;
  handlePayrollChange?: (empId: string, field: string, value: any) => void;
}

export const OtherDeductionsGlobalModal: React.FC<OtherDeductionsGlobalModalProps> = (props) => {
  const [activeTab, setActiveTab] = useState<'material' | 'financial' | 'advance'>('material');
  const [advanceBranch, setAdvanceBranch] = useState<string>(props.allowedBranches.length > 0 ? props.allowedBranches[0] : 'All');

  if (!props.show) return null;

  const getFinalAdvance = (empId: string) => {
    if (!props.localAdjustments || !props.payrollAdjustments) return 0;
    const localVal = props.localAdjustments[empId]?.advanceSalary;
    const savedVal = props.payrollAdjustments[empId]?.advanceSalary;
    return localVal !== undefined ? localVal : (savedVal || 0);
  };

  const advanceEmployees = props.nhanViens
    .filter(nv => advanceBranch === 'All' || nv.locationId === advanceBranch || (Array.isArray(nv.locationIds) && nv.locationIds.includes(advanceBranch)))
    .map(nv => {
      const empTimesheets = (props as any).chamCongs?.filter((cc: any) => (cc.empId === nv.id || cc.empId === nv.empId) && cc.date.startsWith(props.filterMonth)) || [];
      const totalHours = empTimesheets.filter((cc: any) => cc.status !== 'pending_approval').reduce((sum: number, cc: any) => sum + (cc.totalHours || 0), 0);
      return { ...nv, totalHours };
    })
    .filter(nv => nv.totalHours > 0);

  const formatCurrency = (val: number) => new Intl.NumberFormat('vi-VN').format(val);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 global-modal-overlay">
      <div className="bg-white rounded-[2rem] w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col shadow-2xl border border-white/20">
        {/* Header */}
        <div className={`p-6 border-b border-slate-100 flex justify-between items-center ${props.adminTheme.header} relative overflow-hidden`}>
          <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12">
            <Wallet className="w-32 h-32 text-white" />
          </div>
          <div className="relative z-10">
            <h2 className="text-2xl font-black text-white uppercase tracking-tight">Quản lý Khấu Trừ Khác</h2>
            <p className="text-white/70 text-sm font-medium">Hao hụt vật tư, Lương giữ tạm và Tạm ứng lương (Tháng {props.filterMonth})</p>
          </div>
          <button 
            onClick={props.onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-all relative z-10"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex bg-slate-50 p-2 gap-2 border-b border-slate-100">
          <button
            onClick={() => setActiveTab('material')}
            className={`flex-1 py-3 px-4 rounded-2xl flex items-center justify-center gap-2 transition-all ${
              activeTab === 'material' 
              ? 'bg-white text-slate-900 shadow-sm border border-slate-200 font-black' 
              : 'text-slate-500 hover:bg-slate-100 font-bold'
            }`}
          >
            <Box className={`w-4 h-4 ${activeTab === 'material' ? 'text-indigo-500' : ''}`} />
            <span className="text-xs uppercase tracking-wider">Khấu Trừ Dụng Cụ (Ly Tách)</span>
          </button>
          <button
            onClick={() => setActiveTab('financial')}
            className={`flex-1 py-3 px-4 rounded-2xl flex items-center justify-center gap-2 transition-all ${
              activeTab === 'financial' 
              ? 'bg-white text-slate-900 shadow-sm border border-slate-200 font-black' 
              : 'text-slate-500 hover:bg-slate-100 font-bold'
            }`}
          >
            <Landmark className={`w-4 h-4 ${activeTab === 'financial' ? 'text-emerald-500' : ''}`} />
            <span className="text-xs uppercase tracking-wider">Lương Giữ Tạm</span>
          </button>
          <button
            onClick={() => setActiveTab('advance')}
            className={`flex-1 py-3 px-4 rounded-2xl flex items-center justify-center gap-2 transition-all ${
              activeTab === 'advance' 
              ? 'bg-white text-slate-900 shadow-sm border border-slate-200 font-black' 
              : 'text-slate-500 hover:bg-slate-100 font-bold'
            }`}
          >
            <Banknote className={`w-4 h-4 ${activeTab === 'advance' ? 'text-amber-500' : ''}`} />
            <span className="text-xs uppercase tracking-wider">Tạm Ứng Lương</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden relative">
          {activeTab === 'material' && (
            <div className="h-full overflow-hidden">
                <MaterialLossModal 
                  {...props}
                  materialLossLogs={props.materialLossLogs}
                  show={true}
                  onClose={() => {}} // Internal close disabled
                />
            </div>
          )}
          {activeTab === 'financial' && (
            <div className="h-full overflow-hidden">
                <FinancialModal 
                  {...props}
                  show={true}
                  onClose={() => {}} // Internal close disabled
                />
            </div>
          )}
          {activeTab === 'advance' && (
            <div className="h-full overflow-y-auto p-6 bg-slate-50 relative flex flex-col">
              <div className="bg-amber-100 border border-amber-200 p-4 rounded-2xl mb-6 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-amber-200 text-amber-700 rounded-xl">
                    <Banknote className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-black text-amber-900 mb-1">Ứng Lương Nhân Viên</h3>
                    <p className="text-amber-800/80 text-sm font-medium">Bảng kê liệt kê số tiền nhân viên đã ứng trong tháng. <strong className="font-black">Lưu ý:</strong> Mọi thay đổi ở đây cần được bấm <strong className="font-black text-amber-900 bg-amber-200/50 px-1 rounded">LƯU BẢNG LƯƠNG</strong> tại giao diện Bảng Lương màn hình chính để lưu lại.</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col flex-1 overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center gap-4">
                  <h3 className="font-bold text-slate-800">Danh sách nhân viên</h3>
                  <select 
                    value={advanceBranch}
                    onChange={(e) => setAdvanceBranch(e.target.value)}
                    className="px-4 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-500 font-bold text-slate-700"
                  >
                    {props.allowedBranches.length > 1 && <option value="All">Tất cả chi nhánh</option>}
                    {props.allowedBranches.map(branch => (
                      <option key={branch} value={branch}>{branch}</option>
                    ))}
                  </select>
                </div>

                <div className="overflow-x-auto flex-1">
                  <table className="w-full text-left border-collapse min-w-[600px]">
                    <thead>
                      <tr className="bg-slate-50 text-[10px] uppercase font-black text-slate-500 tracking-widest border-b border-slate-100">
                        <th className="p-4">Nhân viên</th>
                        <th className="p-4">Chi nhánh</th>
                        <th className="p-4 text-center">Giờ công</th>
                        <th className="p-4 text-right">Số tiền tạm ứng (₫)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {advanceEmployees.map((nv, index) => {
                        const currentAdvance = getFinalAdvance(nv.id);
                        return (
                          <tr key={nv.id} className={`border-b border-slate-50 hover:bg-slate-50/80 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                            <td className="p-4">
                              <div className="font-bold text-slate-900">{nv.name}</div>
                              <div className="text-xs text-slate-500 font-medium">{nv.role}</div>
                            </td>
                            <td className="p-4">
                              <span className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-600">
                                {nv.locationId}
                              </span>
                            </td>
                            <td className="p-4 text-center">
                              <span className={`inline-flex items-center px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${props.adminTheme.bg} ${props.adminTheme.text}`}>
                                {nv.totalHours.toFixed(1)}H
                              </span>
                            </td>
                            <td className="p-4">
                              <div className="flex justify-end">
                                <input 
                                  type="text"
                                  value={currentAdvance === 0 ? '' : formatCurrency(currentAdvance)}
                                  onChange={(e) => {
                                    if (props.handlePayrollChange) {
                                      const val = parseInt(e.target.value.replace(/\D/g, '')) || 0;
                                      props.handlePayrollChange(nv.id, 'advanceSalary', val);
                                    }
                                  }}
                                  className="w-40 p-3 bg-white border border-slate-200 focus:border-amber-500 rounded-xl text-sm font-bold text-slate-800 text-right outline-none focus:ring-4 focus:ring-amber-500/10 transition-all shadow-sm"
                                  placeholder="0 ₫"
                                />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {advanceEmployees.length === 0 && (
                        <tr>
                          <td colSpan={3} className="p-8 text-center text-slate-500 font-medium">Không có nhân viên nào.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        /* Overriding internal modal styles to fit inside the tabbed modal */
        .flex-1.overflow-hidden.relative .fixed.inset-0 {
          position: relative !important;
          background: transparent !important;
          backdrop-filter: none !important;
          z-index: 10 !important;
          padding: 0 !important;
          display: block !important;
        }
        .flex-1.overflow-hidden.relative .bg-white.rounded-3xl {
          max-width: 100% !important;
          max-height: 100% !important;
          box-shadow: none !important;
          border-radius: 0 !important;
          border: none !important;
        }
        .flex-1.overflow-hidden.relative .p-6.border-b.border-slate-100.flex.justify-between, 
        .flex-1.overflow-hidden.relative .p-6.border-b.border-white\\/10 {
          display: none !important; /* Hide individual headers */
        }
      `}</style>
    </div>
  );
};
