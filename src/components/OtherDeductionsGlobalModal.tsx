import React, { useState } from 'react';
import { X, Wallet, Banknote, RefreshCw, Box, Landmark } from 'lucide-react';
import { MaterialLossModal } from './MaterialLossModal';
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
  weightedEmployees: any[];
  setWeightedEmployees: (val: any[]) => void;
  itemType: string;
  setItemType: (val: string) => void;
  originalPrice: string;
  setOriginalPrice: (val: string) => void;
  quantity: string;
  setQuantity: (val: string) => void;
  isProcessingLoss: boolean;
  onProcessMaterialLoss: () => Promise<void>;
}

export const OtherDeductionsGlobalModal: React.FC<OtherDeductionsGlobalModalProps> = (props) => {
  const [activeTab, setActiveTab] = useState<'material' | 'financial' | 'advance'>('material');

  if (!props.show) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-[2rem] w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col shadow-2xl border border-white/20">
        {/* Header */}
        <div className={`p-6 border-b border-slate-100 flex justify-between items-center ${props.adminTheme.header} relative overflow-hidden`}>
          <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12">
            <Wallet className="w-32 h-32 text-white" />
          </div>
          <div className="relative z-10">
            <h2 className="text-2xl font-black text-white uppercase tracking-tight">Quản lý Khấu Trừ Khác</h2>
            <p className="text-white/70 text-sm font-medium">Hao hụt vật tư, Lương giữ tạm và Tạm ứng lương</p>
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
            <span className="text-xs uppercase tracking-wider">Khấu Trừ Dụng Cụ</span>
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
            <div className="h-full overflow-y-auto p-12 text-center flex flex-col items-center justify-center">
                <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mb-4">
                  <Banknote className="w-10 h-10 text-amber-500" />
                </div>
                <h3 className="text-xl font-black text-slate-800 mb-2 mt-4 uppercase">Chức năng Tạm Ứng</h3>
                <p className="text-slate-500 max-w-sm mb-6 font-medium">Hiện tại bạn có thể thực hiện tạm ứng trực tiếp cho từng nhân viên trong bảng lương hàng tháng.</p>
                <button 
                  onClick={props.onClose}
                  className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-slate-200"
                >
                  Đến Bảng Lương
                </button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        /* Overriding internal modal styles to fit inside the tabbed modal */
        .fixed.inset-0.bg-black\\/50, .fixed.inset-0.bg-slate-900\\/60 {
          position: relative !important;
          background: transparent !important;
          backdrop-filter: none !important;
          z-index: 10 !important;
          padding: 0 !important;
          display: block !important;
        }
        .bg-white.rounded-3xl.w-full.max-w-4xl, .bg-white.rounded-3xl.w-full.max-w-5xl {
          max-width: 100% !important;
          max-height: 100% !important;
          box-shadow: none !important;
          border-radius: 0 !important;
          border: none !important;
        }
        .p-6.border-b.border-slate-100.flex.justify-between, .p-6.border-b.border-white\\/10 {
          display: none !important; /* Hide individual headers */
        }
      `}</style>
    </div>
  );
};
