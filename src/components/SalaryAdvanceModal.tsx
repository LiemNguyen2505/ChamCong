import React, { useState, useEffect, useMemo } from 'react';
import { X, Banknote, Plus, ArrowLeft, Building2, Check, User, Calendar } from 'lucide-react';
import { db } from '../firebase';
import { doc, addDoc, collection, serverTimestamp, increment, setDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const formatCurrency = (val: number) => new Intl.NumberFormat('vi-VN').format(val);

interface SalaryAdvanceModalProps {
  nhanViens: any[];
  allowedBranches: string[];
  logAction: (action: string, module: string, details: string) => Promise<void>;
  onClose: () => void;
  adminTheme: any;
  currentAdmin: any;
  salaryAdvanceRecords: any[];
  filterMonth: string;
  fetchInitialData: (month?: string, force?: boolean) => Promise<void>;
}

type ModalView = 'list' | 'add';

export const SalaryAdvanceModal: React.FC<SalaryAdvanceModalProps> = ({
  nhanViens,
  allowedBranches,
  logAction,
  onClose,
  adminTheme,
  currentAdmin,
  salaryAdvanceRecords,
  filterMonth,
  fetchInitialData
}) => {
  const [view, setView] = useState<ModalView>('list');
  const [filterBranch, setFilterBranch] = useState<string>(allowedBranches.length > 0 ? allowedBranches[0] : 'All');
  
  // Form states
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [amount, setAmount] = useState('');
  const [locationId, setLocationId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isSuperAdmin = currentAdmin?.role === 'SuperAdmin';
  const managerBranches = currentAdmin?.locationIds || [];

  // Filter employees based on role
  const availableEmployees = useMemo(() => {
    return nhanViens.filter(nv => {
      const isInAllowedBranch = isSuperAdmin || 
                               managerBranches.includes(nv.locationId) || 
                               (Array.isArray(nv.locationIds) && nv.locationIds.some((id: string) => managerBranches.includes(id)));
      return isInAllowedBranch;
    });
  }, [nhanViens, isSuperAdmin, managerBranches]);

  // Filter records based on role and branch filter
  const filteredRecords = useMemo(() => {
    return salaryAdvanceRecords.filter(record => {
      const isInAllowedBranch = isSuperAdmin || managerBranches.includes(record.locationId);
      const matchesFilter = filterBranch === 'All' || record.locationId === filterBranch;
      return isInAllowedBranch && matchesFilter;
    });
  }, [salaryAdvanceRecords, isSuperAdmin, managerBranches, filterBranch]);

  const totalAdvanceAmount = useMemo(() => {
    return filteredRecords.reduce((sum, record) => sum + (record.amount || 0), 0);
  }, [filteredRecords]);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmpId || !amount || !locationId) {
      toast.error('Vui lòng điền đầy đủ thông tin');
      return;
    }

    const numAmount = parseInt(amount.replace(/\D/g, '')) || 0;
    if (numAmount <= 0) {
      toast.error('Số tiền phải lớn hơn 0');
      return;
    }

    setIsSubmitting(true);
    const loadingToast = toast.loading('Đang xử lý...');
    try {
      const emp = nhanViens.find(n => n.id === selectedEmpId);
      
      // 1. Create record
      await addDoc(collection(db, 'SalaryAdvanceRecords'), {
        empId: selectedEmpId,
        fullName: emp.fullName,
        amount: numAmount,
        monthYear: filterMonth,
        locationId: locationId,
        createdAt: serverTimestamp(),
        createdBy: currentAdmin.email
      });

      // 2. Update PayrollAdjustment for selected month
      const adjId = `${selectedEmpId}_${filterMonth}`;
      await setDoc(doc(db, 'PayrollAdjustments', adjId), {
        empId: selectedEmpId,
        monthYear: filterMonth,
        advanceSalary: increment(numAmount)
      }, { merge: true });

      await logAction('Tạm ứng lương', 'Tài chính', `Tạm ứng ${formatCurrency(numAmount)} cho ${emp.fullName} tháng ${filterMonth}`);
      toast.success('Đã thêm khoản tạm ứng', { id: loadingToast });
      setView('list');
      resetForm();
      fetchInitialData(filterMonth, true);
    } catch (error) {
      console.error(error);
      toast.error('Lỗi khi xử lý', { id: loadingToast });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedEmpId('');
    setAmount('');
    setLocationId('');
  };

  useEffect(() => {
    if (view !== 'list') {
      if (!isSuperAdmin && managerBranches.length > 0) {
        setLocationId(managerBranches[0]);
      }
    }
  }, [view, isSuperAdmin, managerBranches]);

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      <div className="flex-1 overflow-y-auto p-6 flex flex-col">
        {view === 'list' ? (
          <>
            {/* Summary Banner */}
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 mb-6 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-200 text-amber-700 rounded-xl">
                  <Banknote className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest leading-none mb-1">Tổng tiền tạm ứng tháng {filterMonth}</p>
                  <p className="text-xl font-black text-amber-900">{formatCurrency(totalAdvanceAmount)} ₫</p>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center mb-6">
              <div className="flex gap-2">
                <select 
                  value={filterBranch}
                  onChange={(e) => setFilterBranch(e.target.value)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-500 font-bold bg-white"
                >
                  {isSuperAdmin && <option value="All">Tất cả chi nhánh</option>}
                  {allowedBranches.map(branch => (
                    <option key={branch} value={branch}>{branch}</option>
                  ))}
                </select>
              </div>
              <button 
                onClick={() => setView('add')}
                className="px-5 py-2.5 bg-amber-600 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-sm hover:bg-amber-700 transition-all flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Thêm tạm ứng
              </button>
            </div>

            <div className="bg-white rounded-[1.5rem] md:rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col flex-1">
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-[10px] uppercase font-black text-slate-500 tracking-widest border-b border-slate-100">
                      <th className="p-4">Nhân Viên</th>
                      {isSuperAdmin && <th className="p-4">Chi nhánh</th>}
                      <th className="p-4 text-center">Ngày ứng</th>
                      <th className="p-4 text-right">Số tiền ứng (₫)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredRecords.map((record) => (
                      <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4">
                          <div className="font-bold text-slate-900">{record.fullName}</div>
                        </td>
                        {isSuperAdmin && (
                          <td className="p-4">
                            <span className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-600">
                              {record.locationId}
                            </span>
                          </td>
                        )}
                        <td className="p-4 text-center">
                          <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-lg flex items-center justify-center gap-1 mx-auto w-fit">
                            <Calendar className="w-3 h-3" />
                            {record.createdAt?.toDate ? format(record.createdAt.toDate(), 'dd/MM/yyyy') : '---'}
                          </span>
                        </td>
                        <td className="p-4 text-right font-black text-rose-600">
                          {formatCurrency(record.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden divide-y divide-slate-100">
                {filteredRecords.map((record) => (
                  <div key={record.id} className="p-4 space-y-2 active:bg-slate-50 transition-colors">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="font-bold text-slate-900">{record.fullName}</div>
                        <div className="flex gap-2 items-center">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] font-bold uppercase tracking-tight">
                            {record.locationId}
                          </span>
                        </div>
                      </div>
                      <div className="text-right font-black text-rose-600 text-base">
                        {formatCurrency(record.amount)} ₫
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                      <Calendar className="w-3 h-3" />
                      Ngày ứng: {record.createdAt?.toDate ? format(record.createdAt.toDate(), 'dd/MM/yyyy') : '---'}
                    </div>
                  </div>
                ))}
              </div>

              {filteredRecords.length === 0 && (
                <div className="p-12 text-center text-slate-400 italic font-medium">
                  Chưa có lịch sử tạm ứng lương.
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="max-w-xl mx-auto w-full">
            <button 
              onClick={() => { setView('list'); resetForm(); }}
              className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors mb-6 font-bold"
            >
              <ArrowLeft className="w-4 h-4" />
              Quay lại danh sách
            </button>

            <div className="bg-white rounded-[1.5rem] md:rounded-[2rem] border border-slate-200 shadow-xl overflow-hidden">
              <div className={`p-4 md:p-6 ${adminTheme?.header || 'bg-amber-600'} text-white`}>
                <h3 className="text-lg md:text-xl font-black uppercase tracking-tight flex items-center gap-2">
                  <Banknote className="w-5 h-5 md:w-6 md:h-6 text-white" />
                  Thêm khoản Tạm Ứng
                </h3>
              </div>

              <form onSubmit={handleAddSubmit} className="p-4 md:p-8 space-y-4 md:space-y-6">
                <div className="space-y-1 md:space-y-2">
                  <label className="text-[10px] md:text-xs font-black text-slate-500 uppercase tracking-widest px-1">Nhân Viên</label>
                  <select
                    value={selectedEmpId}
                    onChange={(e) => {
                      setSelectedEmpId(e.target.value);
                      const emp = nhanViens.find(n => n.id === e.target.value);
                      if (emp && isSuperAdmin) setLocationId(emp.locationId);
                    }}
                    className="w-full p-3 md:p-4 bg-slate-50 border border-slate-200 rounded-xl md:rounded-2xl outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 font-bold transition-all"
                    required
                  >
                    <option value="">-- Chọn nhân viên --</option>
                    {availableEmployees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.fullName} ({emp.locationId})</option>
                    ))}
                  </select>
                </div>

                {isSuperAdmin && (
                  <div className="space-y-1 md:space-y-2">
                    <label className="text-[10px] md:text-xs font-black text-slate-500 uppercase tracking-widest px-1">Chi Nhánh (Quán)</label>
                    <div className="grid grid-cols-2 gap-2 md:gap-3">
                      {allowedBranches.map(branch => (
                        <button
                          key={branch}
                          type="button"
                          onClick={() => setLocationId(branch)}
                          className={`p-3 md:p-4 rounded-xl md:rounded-2xl border-2 flex flex-col items-center gap-1 md:gap-2 transition-all ${
                            locationId === branch 
                            ? 'border-amber-500 bg-amber-50 text-amber-700 shadow-sm' 
                            : 'border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-200'
                          }`}
                        >
                          <Building2 className={`w-5 h-5 md:w-6 md:h-6 ${locationId === branch ? 'text-amber-500' : ''}`} />
                          <span className="text-[10px] md:text-xs font-black uppercase tracking-tight">{branch}</span>
                          {locationId === branch && <Check className="w-3 h-3 md:w-4 md:h-4" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-1 md:space-y-2">
                  <label className="text-[10px] md:text-xs font-black text-slate-500 uppercase tracking-widest px-1">Số tiền Tạm Ứng (₫)</label>
                  <div className="relative">
                    <input 
                      type="text"
                      value={amount ? formatCurrency(parseInt(amount.replace(/\D/g, ''))) : ''}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="Nhập số tiền..."
                      className="w-full p-3 md:p-4 pl-10 md:pl-12 bg-slate-50 border border-slate-200 rounded-xl md:rounded-2xl outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 font-black text-base md:text-lg text-slate-800 transition-all"
                      required
                    />
                    <Banknote className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 md:w-6 md:h-6" />
                  </div>
                </div>

                <div className="p-3 md:p-4 bg-blue-50 border border-blue-100 rounded-xl md:rounded-2xl">
                  <p className="text-[10px] md:text-[11px] text-blue-700 font-bold leading-relaxed">
                    <span className="uppercase text-blue-800 font-black mr-1">Hệ thống:</span>
                    Khoản tiền ứng này sẽ được cộng dồn vào cột <span className="underline font-black">Khấu trừ khác</span> trong bảng lương tháng <span className="font-black">{filterMonth}</span>.
                  </p>
                </div>

                <div className="flex gap-2 md:gap-4 pt-2 md:pt-4">
                  <button 
                    type="button"
                    onClick={() => { setView('list'); resetForm(); }}
                    className="flex-1 py-3 md:py-4 px-4 border border-slate-200 text-slate-600 rounded-xl md:rounded-2xl font-black uppercase tracking-widest text-[10px] md:text-xs hover:bg-slate-50 transition-all active:scale-95"
                  >
                    Huỷ
                  </button>
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-3 md:py-4 px-4 bg-amber-600 hover:bg-amber-700 shadow-xl shadow-amber-200 text-white rounded-xl md:rounded-2xl font-black uppercase tracking-widest text-[10px] md:text-xs transition-all active:scale-95 disabled:opacity-50"
                  >
                    {isSubmitting ? 'Đang xử lý...' : 'Xác nhận'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
