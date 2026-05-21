import React, { useState, useEffect, useMemo } from 'react';
import { X, Banknote, RefreshCw, Plus, ArrowLeft, Building2, Check, Wallet } from 'lucide-react';
import { db } from '../firebase';
import { doc, updateDoc, addDoc, collection, serverTimestamp, increment, setDoc, deleteDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const formatCurrency = (val: number) => new Intl.NumberFormat('vi-VN').format(val);

interface FinancialModalProps {
  nhanViens: any[];
  allowedBranches: string[];
  logAction: (action: string, module: string, details: string) => Promise<void>;
  openConfirmModal: (title: string, message: string, onConfirm: () => void) => void;
  onClose: () => void;
  adminTheme: any;
  currentAdmin: any;
  retainedSalaryRecords: any[];
  filterMonth: string;
  fetchInitialData: (month?: string, force?: boolean) => Promise<void>;
}

type ModalView = 'list' | 'add' | 'refund' ;

export const FinancialModal: React.FC<FinancialModalProps> = ({
  nhanViens,
  allowedBranches,
  logAction,
  openConfirmModal,
  onClose,
  adminTheme,
  currentAdmin,
  retainedSalaryRecords,
  filterMonth,
  fetchInitialData
}) => {
  const [view, setView] = useState<ModalView>('list');
  const [filterBranch, setFilterBranch] = useState<string>(allowedBranches.length > 0 ? allowedBranches[0] : 'All');
  
  // Form states
  const [selectedRecordId, setSelectedRecordId] = useState('');
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [amount, setAmount] = useState('');
  const [locationId, setLocationId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isSuperAdmin = currentAdmin?.role === 'SuperAdmin';
  const managerBranches = currentAdmin?.locationIds || [];

  // Filter employees based on role
  const availableEmployees = useMemo(() => {
    return nhanViens.filter(nv => {
      // Branch check
      const isInAllowedBranch = isSuperAdmin || 
                               managerBranches.includes(nv.locationId) || 
                               (Array.isArray(nv.locationIds) && nv.locationIds.some((id: string) => managerBranches.includes(id)));
      return isInAllowedBranch;
    });
  }, [nhanViens, isSuperAdmin, managerBranches]);

  // Filter records based on role and branch filter
  const filteredRecords = useMemo(() => {
    return retainedSalaryRecords.filter(record => {
      const isHold = record.type === 'hold';
      const isInAllowedBranch = isSuperAdmin || managerBranches.includes(record.locationId);
      const matchesFilter = filterBranch === 'All' || record.locationId === filterBranch;
      return isHold && isInAllowedBranch && matchesFilter;
    });
  }, [retainedSalaryRecords, isSuperAdmin, managerBranches, filterBranch]);

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
      await addDoc(collection(db, 'RetainedSalaryRecords'), {
        empId: selectedEmpId,
        fullName: emp.fullName,
        amount: numAmount,
        monthYear: filterMonth,
        locationId: locationId,
        type: 'hold',
        createdAt: serverTimestamp(),
        createdBy: currentAdmin.email
      });

      // 2. Update PayrollAdjustment for selected month
      const adjId = `${selectedEmpId}_${filterMonth}`;
      await setDoc(doc(db, 'PayrollAdjustments', adjId), {
        empId: selectedEmpId,
        monthYear: filterMonth,
        retainedSalary: increment(numAmount)
      }, { merge: true });

      // 3. Update employee global retained amount (if needed for overall tracking)
      await updateDoc(doc(db, 'employees', selectedEmpId), {
        retainedSalaryAmount: increment(numAmount),
        retainedSalaryStatus: 'Đã giữ'
      });

      await logAction('Giữ lương', 'Tài chính', `Giữ tạm ${formatCurrency(numAmount)} cho ${emp.fullName} tháng ${filterMonth}`);
      toast.success('Đã thêm khoản giữ lương', { id: loadingToast });
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

  const handleRefundSubmit = async (e: React.FormEvent) => {
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
    const loadingToast = toast.loading('Đang xử lý hoàn trả...');
    try {
      const emp = nhanViens.find(n => n.id === selectedEmpId);
      
      // 1. Delete original hold record
      if (selectedRecordId) {
        await deleteDoc(doc(db, 'RetainedSalaryRecords', selectedRecordId));
      }

      // 2. Update PayrollAdjustment for selected month (returnRetainedSalary)
      const adjId = `${selectedEmpId}_${filterMonth}`;
      await setDoc(doc(db, 'PayrollAdjustments', adjId), {
        empId: selectedEmpId,
        monthYear: filterMonth,
        returnRetainedSalary: increment(numAmount)
      }, { merge: true });

      // 3. Update employee global retained amount (decrease)
      await updateDoc(doc(db, 'employees', selectedEmpId), {
        retainedSalaryAmount: increment(-numAmount)
      });

      await logAction('Hoàn trả lương', 'Tài chính', `Hoàn trả ${formatCurrency(numAmount)} cho ${emp.fullName} tháng ${filterMonth}`);
      toast.success('Đã thêm khoản hoàn trả', { id: loadingToast });
      setView('list');
      resetForm();
      fetchInitialData(filterMonth, true);
    } catch (error) {
      console.error(error);
      toast.error('Lỗi khi xử lý hoàn trả', { id: loadingToast });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedRecordId('');
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
      {/* Header logic is handled by parent Modal, but we can have sub-headers */}
      
      <div className="flex-1 overflow-y-auto p-6 flex flex-col">
        {view === 'list' ? (
          <>
            <div className="flex justify-between items-center mb-6">
              <div className="flex gap-2">
                <select 
                  value={filterBranch}
                  onChange={(e) => setFilterBranch(e.target.value)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500 font-bold bg-white"
                >
                  {isSuperAdmin && <option value="All">Tất cả chi nhánh</option>}
                  {allowedBranches.map(branch => (
                    <option key={branch} value={branch}>{branch}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setView('add')}
                  className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-sm hover:bg-emerald-700 transition-all flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Thêm
                </button>
              </div>
            </div>

            <div className="bg-white rounded-[1.5rem] md:rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col flex-1">
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-[10px] uppercase font-black text-slate-500 tracking-widest border-b border-slate-100">
                      <th className="p-4">Nhân Viên</th>
                      {isSuperAdmin && <th className="p-4">Chi nhánh</th>}
                      <th className="p-4 text-center">Tháng</th>
                      <th className="p-4 text-right">Số tiền Giữ Tạm (₫)</th>
                      <th className="p-4 text-center">Loại</th>
                      <th className="p-4 text-center">Thao tác</th>
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
                          <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-lg">
                            {record.monthYear}
                          </span>
                        </td>
                        <td className={`p-4 text-right font-black ${record.type === 'refund' ? 'text-sky-600' : 'text-rose-600'}`}>
                          {record.type === 'refund' ? '-' : '+'}{formatCurrency(record.amount)}
                        </td>
                        <td className="p-4 text-center">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            record.type === 'hold' ? 'bg-amber-100 text-amber-700' : 'bg-sky-100 text-sky-700'
                          }`}>
                            {record.type === 'hold' ? 'Đang giữ' : 'Hoàn trả'}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          {record.type === 'hold' && (
                            <button
                              onClick={() => {
                                setSelectedRecordId(record.id);
                                setSelectedEmpId(record.empId);
                                setAmount(record.amount.toString());
                                setLocationId(record.locationId);
                                setView('refund');
                              }}
                              className="text-sky-600 hover:text-sky-700 font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-1 mx-auto hover:bg-sky-50 px-2 py-1.5 rounded-lg transition-all"
                            >
                              <RefreshCw className="w-3 h-3" />
                              Hoàn trả
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden divide-y divide-slate-100">
                {filteredRecords.map((record) => (
                  <div key={record.id} className="p-4 space-y-3 active:bg-slate-50 transition-colors">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="font-bold text-slate-900">{record.fullName}</div>
                        <div className="flex gap-2 items-center">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] font-bold uppercase tracking-tight">
                            {record.locationId}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400">
                             Tháng {record.monthYear}
                          </span>
                        </div>
                      </div>
                      <div className={`text-right font-black ${record.type === 'refund' ? 'text-sky-600' : 'text-rose-600'}`}>
                        {record.type === 'refund' ? '-' : '+'}{formatCurrency(record.amount)}
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center pt-1">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                        record.type === 'hold' ? 'bg-amber-100 text-amber-700' : 'bg-sky-100 text-sky-700'
                      }`}>
                        {record.type === 'hold' ? 'Đang giữ' : 'Hoàn trả'}
                      </span>
                      
                      {record.type === 'hold' && (
                        <button
                          onClick={() => {
                            setSelectedRecordId(record.id);
                            setSelectedEmpId(record.empId);
                            setAmount(record.amount.toString());
                            setLocationId(record.locationId);
                            setView('refund');
                          }}
                          className="h-10 px-4 bg-sky-50 text-sky-600 hover:bg-sky-100 rounded-xl font-bold text-[10px] uppercase tracking-wider flex items-center gap-2 transition-all"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          Hoàn trả
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {filteredRecords.length === 0 && (
                <div className="p-12 text-center text-slate-400 italic font-medium">
                  Chưa có lịch sử giữ lương.
                </div>
              )}
            </div>
          </>
        ) : view === 'refund' ? (
          <div className="max-w-xl mx-auto w-full">
            <button 
              onClick={() => { setView('list'); resetForm(); }}
              className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors mb-6 font-bold"
            >
              <ArrowLeft className="w-4 h-4" />
              Quay lại danh sách
            </button>

            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl overflow-hidden">
              <div className={`p-6 ${locationId === 'Góc Phố' ? 'bg-orange-600' : locationId === 'Phố Xanh' ? 'bg-emerald-600' : 'bg-sky-600'} text-white`}>
                <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
                  <RefreshCw className="w-6 h-6" />
                  Xác nhận Hoàn trả
                </h3>
                <p className="text-white/80 text-sm font-medium mt-1">
                  Thông tin hoàn trả tiền lương giữ tạm cho nhân viên.
                </p>
              </div>

              <div className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Nhân Viên</label>
                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-800">
                      {nhanViens.find(n => n.id === selectedEmpId)?.fullName || '---'}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Chi Nhánh</label>
                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-800">
                      {locationId}
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Số tiền Hoàn trả</label>
                  <div className="p-6 bg-sky-50 border border-sky-100 rounded-[1.5rem] flex items-center justify-between">
                    <Banknote className="w-8 h-8 text-sky-500" />
                    <div className="text-right">
                      <div className="text-2xl font-black text-sky-600">{formatCurrency(parseInt(amount) || 0)} ₫</div>
                      <div className="text-[10px] font-bold text-sky-400 uppercase tracking-tight">Thanh toán vào bảng lương tháng {filterMonth}</div>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl">
                  <p className="text-xs text-amber-700 font-bold leading-relaxed flex gap-2">
                    <span className="shrink-0">⚠️</span>
                    <span>Khi xác nhận, số tiền này sẽ được cộng vào mục "Hoàn trả giữ lương" trong bảng lương tháng hiện tại.</span>
                  </p>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="button"
                    onClick={() => { setView('list'); resetForm(); }}
                    className="flex-1 py-4 px-6 border border-slate-200 text-slate-600 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-50 transition-all active:scale-95"
                  >
                    Huỷ
                  </button>
                  <button 
                    onClick={handleRefundSubmit}
                    disabled={isSubmitting}
                    className="flex-1 py-4 px-6 bg-sky-600 hover:bg-sky-700 shadow-xl shadow-sky-200 text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all active:scale-95 disabled:opacity-50"
                  >
                    {isSubmitting ? 'Đang xử lý...' : 'Xác nhận Hoàn trả'}
                  </button>
                </div>
              </div>
            </div>
          </div>
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
              <div className={`p-4 md:p-6 ${adminTheme?.header || 'bg-emerald-600'} text-white`}>
                <h3 className="text-lg md:text-xl font-black uppercase tracking-tight flex items-center gap-2">
                  <Wallet className="w-5 h-5 md:w-6 md:h-6 text-white" />
                  Thêm khoản Giữ Tạm
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
                    className="w-full p-3 md:p-4 bg-slate-50 border border-slate-200 rounded-xl md:rounded-2xl outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 font-bold transition-all"
                    required
                  >
                    <option value="">-- Chọn nhân viên --</option>
                    {availableEmployees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.fullName}</option>
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
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm' 
                            : 'border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-200'
                          }`}
                        >
                          <Building2 className={`w-5 h-5 md:w-6 md:h-6 ${locationId === branch ? 'text-emerald-500' : ''}`} />
                          <span className="text-[10px] md:text-xs font-black uppercase tracking-tight">{branch}</span>
                          {locationId === branch && <Check className="w-3 h-3 md:w-4 md:h-4" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-1 md:space-y-2">
                  <label className="text-[10px] md:text-xs font-black text-slate-500 uppercase tracking-widest px-1">Số tiền Giữ Tạm (₫)</label>
                  <div className="relative">
                    <input 
                      type="text"
                      value={amount ? formatCurrency(parseInt(amount.replace(/\D/g, ''))) : ''}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="Nhập số tiền..."
                      className="w-full p-3 md:p-4 pl-10 md:pl-12 bg-slate-50 border border-slate-200 rounded-xl md:rounded-2xl outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 font-black text-base md:text-lg text-slate-800 transition-all"
                      required
                    />
                    <Wallet className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 md:w-6 md:h-6" />
                  </div>
                </div>

                <div className="p-3 md:p-4 bg-amber-50 border border-amber-100 rounded-xl md:rounded-2xl">
                  <p className="text-[10px] md:text-[11px] text-amber-700 font-bold leading-relaxed">
                    <span className="uppercase text-amber-800 font-black mr-1">Lưu ý:</span>
                    Khoản tiền này sẽ được áp dụng cho bảng lương <span className="underline">tháng {filterMonth}</span>. 
                    Đối với khoản "Thêm", hệ thống sẽ tự động trừ vào thực lãnh. Đối với "Hoàn trả", hệ thống sẽ cộng thêm vào thực lãnh.
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
                    className={`flex-1 py-3 md:py-4 px-4 ${view === 'add' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200' : 'bg-sky-600 hover:bg-sky-700 shadow-sky-200'} text-white rounded-xl md:rounded-2xl font-black uppercase tracking-widest text-[10px] md:text-xs shadow-xl transition-all active:scale-95 disabled:opacity-50`}
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
