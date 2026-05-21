import React, { useState } from 'react';
import { X, Wallet, Banknote, RefreshCw, WineOff, Landmark } from 'lucide-react';
import MaterialLossModal from './MaterialLossModal';
import { FinancialModal } from './FinancialModal';
import { SalaryAdvanceModal } from './SalaryAdvanceModal';

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
  handleSelectItemType: (name: string) => void;
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
  currentAdmin: any;
  retainedSalaryRecords: any[];
  salaryAdvanceRecords: any[];
}

export const OtherDeductionsGlobalModal: React.FC<OtherDeductionsGlobalModalProps> = (props) => {
  const [activeTab, setActiveTab] = useState<'material' | 'financial' | 'advance'>('material');

  const handleGlobalClose = () => {
    if (activeTab === 'material' && (props.itemType || (props.totalLossAmount && props.totalLossAmount !== '0') || props.originalPrice)) {
      props.openConfirmModal('Xác nhận', 'Bạn có thay đổi chưa lưu ở Khấu Trừ Dụng Cụ. Bạn có chắc muốn đóng form?', () => {
        props.onClose();
      });
    } else {
      props.onClose();
    }
  };

  if (!props.show) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 global-modal-overlay">
      <div className="bg-white rounded-[2rem] w-full max-w-6xl h-[85vh] min-h-[600px] max-h-[95vh] overflow-hidden flex flex-col shadow-2xl border border-white/20">
        {/* Header */}
        <div className={`p-4 md:p-6 border-b border-slate-100 flex justify-between items-center ${props.adminTheme.header} relative overflow-hidden shrink-0`}>
          <div className="absolute top-0 right-0 p-4 md:p-8 opacity-10 rotate-12 pointer-events-none">
            <Wallet className="w-24 h-24 md:w-32 md:h-32 text-white" />
          </div>
          <div className="relative z-10">
            <h2 className="text-lg md:text-2xl font-black text-white uppercase tracking-tight">KHẤU TRỪ KHÁC</h2>
          </div>
          <button 
            onClick={handleGlobalClose}
            className="p-1.5 md:p-2 hover:bg-white/10 rounded-full transition-all relative z-10"
          >
            <X className="w-5 h-5 md:w-6 md:h-6 text-white" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex bg-slate-50 p-1.5 md:p-2 gap-1.5 md:gap-2 border-b border-slate-100 shrink-0">
          <button
            onClick={() => setActiveTab('material')}
            className={`flex-1 min-h-[44px] py-2 md:py-3 px-2 md:px-4 rounded-xl md:rounded-2xl flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 transition-all ${
              activeTab === 'material' 
              ? 'bg-white text-indigo-700 shadow-sm border border-slate-200 font-black' 
              : 'text-slate-500 hover:bg-slate-100 font-bold'
            }`}
          >
            <WineOff className={`w-3.5 h-3.5 md:w-4 md:h-4 ${activeTab === 'material' ? 'text-indigo-500' : ''}`} />
            <span className="text-[9px] md:text-xs uppercase tracking-tight md:tracking-wider text-center">Khấu Trừ Dụng Cụ</span>
          </button>
          <button
            onClick={() => setActiveTab('financial')}
            className={`flex-1 min-h-[44px] py-2 md:py-3 px-2 md:px-4 rounded-xl md:rounded-2xl flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 transition-all ${
              activeTab === 'financial' 
              ? 'bg-white text-emerald-700 shadow-sm border border-slate-200 font-black' 
              : 'text-slate-500 hover:bg-slate-100 font-bold'
            }`}
          >
            <Landmark className={`w-3.5 h-3.5 md:w-4 md:h-4 ${activeTab === 'financial' ? 'text-emerald-500' : ''}`} />
            <span className="text-[9px] md:text-xs uppercase tracking-tight md:tracking-wider text-center">Lương Giữ Tạm</span>
          </button>
          <button
            onClick={() => setActiveTab('advance')}
            className={`flex-1 min-h-[44px] py-2 md:py-3 px-2 md:px-4 rounded-xl md:rounded-2xl flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 transition-all ${
              activeTab === 'advance' 
              ? 'bg-white text-amber-700 shadow-sm border border-slate-200 font-black' 
              : 'text-slate-500 hover:bg-slate-100 font-bold'
            }`}
          >
            <Banknote className={`w-3.5 h-3.5 md:w-4 md:h-4 ${activeTab === 'advance' ? 'text-amber-500' : ''}`} />
            <span className="text-[9px] md:text-xs uppercase tracking-tight md:tracking-wider text-center">Tạm Ứng Lương</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden relative">
          {activeTab === 'material' && (
            <div className="h-full overflow-hidden flex flex-col">
                <MaterialLossModal 
                  {...props}
                  onProcess={props.onProcessMaterialLoss}
                  materialLossLogs={props.materialLossLogs}
                  show={true}
                  onClose={props.onClose}
                />
            </div>
          )}
          {activeTab === 'financial' && (
            <div className="h-full overflow-hidden flex flex-col">
                <FinancialModal 
                  {...props}
                  show={true}
                  onClose={props.onClose}
                />
            </div>
          )}
          {activeTab === 'advance' && (
            <div className="h-full overflow-hidden flex flex-col">
              <SalaryAdvanceModal 
                {...props}
              />
            </div>
          )}
        </div>
      </div>

      <style>{`
        /* Overriding internal modal styles to fit inside the tabbed modal */
        .flex-1.overflow-hidden.relative .fixed.inset-0 {
          position: absolute !important;
          background: transparent !important;
          backdrop-filter: none !important;
          z-index: 10 !important;
          padding: 0 !important;
          display: flex !important;
          flex-direction: column !important;
          height: 100% !important;
        }
        .flex-1.overflow-hidden.relative .bg-white.rounded-3xl {
          max-width: 100% !important;
          max-height: 100% !important;
          height: 100% !important;
          flex: 1 !important;
          box-shadow: none !important;
          border-radius: 0 !important;
          border: none !important;
          display: flex !important;
          flex-direction: column !important;
        }
        .flex-1.overflow-hidden.relative .overflow-y-auto.max-h-\\[70vh\\] {
          flex: 1 !important;
          max-height: none !important;
        }
        .flex-1.overflow-hidden.relative .p-6.border-b.border-slate-100.flex.justify-between, 
        .flex-1.overflow-hidden.relative .p-6.border-b.border-white\\/10 {
          display: none !important; /* Hide individual headers */
        }
        .flex-1.overflow-hidden.relative .p-6.border-t.bg-slate-50.rounded-b-3xl {
          margin-bottom: 0 !important;
          border-radius: 0 !important;
        }
      `}</style>
    </div>
  );
};
