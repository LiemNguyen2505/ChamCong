import React, { useState, useEffect } from 'react';
import { X, Banknote, RefreshCw } from 'lucide-react';
import { db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';

const formatCurrency = (val: number) => new Intl.NumberFormat('vi-VN').format(val);

interface FinancialModalProps {
  nhanViens: any[];
  allowedBranches: string[];
  logAction: (action: string, module: string, details: string) => Promise<void>;
  openConfirmModal: (title: string, message: string, onConfirm: () => void) => void;
  onClose: () => void;
  adminTheme: any;
}

export const FinancialModal: React.FC<FinancialModalProps> = ({
  nhanViens,
  allowedBranches,
  logAction,
  openConfirmModal,
  onClose,
  adminTheme
}) => {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const [filterBranch, setFilterBranch] = useState<string>(allowedBranches.length > 0 ? allowedBranches[0] : 'All');

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-3xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl relative">
        <div className={`p-6 border-b border-white/10 flex justify-between items-center ${adminTheme.header}`}>
          <div>
            <h2 className="text-2xl font-black text-white mb-1 uppercase tracking-tight">Quản lý Lương giữ tạm</h2>
            <p className="text-white/70 text-sm">Theo dõi và quản lý các khoản lương giữ tạm của nhân viên theo chi nhánh.</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {allowedBranches.map(branch => {
              const branchEmps = nhanViens.filter(nv => nv.locationId === branch || (Array.isArray(nv.locationIds) && nv.locationIds.includes(branch)));
              const totalHeld = branchEmps.reduce((sum, nv) => sum + (nv.retainedSalaryStatus === 'Đã giữ' ? (nv.retainedSalaryAmount || 0) : 0), 0);
              const countHeld = branchEmps.filter(nv => nv.retainedSalaryStatus === 'Đã giữ').length;

              return (
                <div key={branch} className={`p-6 rounded-3xl border-2 shadow-sm ${branch === 'Góc Phố' ? 'bg-orange-50 border-orange-100' : 'bg-emerald-50 border-emerald-100'}`}>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className={`text-lg font-black ${branch === 'Góc Phố' ? 'text-orange-800' : 'text-emerald-800'}`}>{branch}</h3>
                      <p className="text-slate-500 text-sm">Tổng lương đang giữ tạm</p>
                    </div>
                    <div className={`p-3 rounded-2xl ${branch === 'Góc Phố' ? 'bg-orange-200/50 text-orange-700' : 'bg-emerald-200/50 text-emerald-700'}`}>
                      <Banknote className="w-6 h-6" />
                    </div>
                  </div>
                  <div className="text-3xl font-black text-slate-900 mb-1">
                    {formatCurrency(totalHeld)}
                  </div>
                  <div className="text-sm font-bold text-slate-500">
                    {countHeld} nhân viên đang giữ
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center flex-wrap gap-4">
              <h3 className="font-bold text-slate-800">Danh sách chi tiết</h3>
              <div className="flex gap-2">
                <select 
                  value={filterBranch}
                  onChange={(e) => setFilterBranch(e.target.value)}
                  className="px-3 py-1.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-sky-500"
                >
                  {allowedBranches.length > 1 && <option value="All">Tất cả chi nhánh</option>}
                  {allowedBranches.map(branch => (
                    <option key={branch} value={branch}>{branch}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-slate-50 text-[10px] uppercase font-black text-slate-500 tracking-widest border-b border-slate-100">
                    <th className="p-4 sticky left-0 bg-slate-50 z-20 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">Nhân viên</th>
                    <th className="p-4">Chi nhánh</th>
                    <th className="p-4">Số tiền giữ</th>
                    <th className="p-4">Trạng thái</th>
                    <th className="p-4">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {nhanViens
                    .filter(nv => (filterBranch === 'All' || nv.locationId === filterBranch) && (nv.retainedSalaryStatus !== 'Chưa giữ' || nv.retainedSalaryAmount > 0))
                    .map(nv => (
                    <tr key={nv.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 sticky left-0 bg-white z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                        <div className="font-bold text-slate-900">{nv.fullName}</div>
                        <div className="text-[10px] text-slate-400">{nv.empId}</div>
                      </td>
                      <td className="p-4 text-sm text-slate-600">{nv.locationId}</td>
                      <td className="p-4 font-bold text-slate-900">{formatCurrency(nv.retainedSalaryAmount || 0)}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                          nv.retainedSalaryStatus === 'Đã giữ' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {nv.retainedSalaryStatus}
                        </span>
                      </td>
                      <td className="p-4">
                        {nv.retainedSalaryStatus === 'Đã giữ' && (
                          <button
                            onClick={() => {
                              openConfirmModal(
                                'Hoàn trả tiền giữ lương',
                                `Bạn có chắc chắn muốn xác nhận đã hoàn trả ${formatCurrency(nv.retainedSalaryAmount || 0)} cho nhân viên ${nv.fullName}?`,
                                async () => {
                                  try {
                                    await updateDoc(doc(db, 'employees', nv.id), {
                                      retainedSalaryStatus: 'Đã trả'
                                    });
                                    await logAction('Hoàn trả', 'Tiền giữ lương', `Hoàn trả tiền giữ lương cho ${nv.fullName}`);
                                    toast.success('Đã cập nhật trạng thái hoàn trả');
                                  } catch (error) {
                                    console.error(error);
                                    toast.error('Lỗi khi cập nhật');
                                  }
                                }
                              );
                            }}
                            className="text-sky-600 hover:text-sky-700 text-xs font-bold flex items-center gap-1"
                          >
                            <RefreshCw className="w-3 h-3" />
                            Hoàn trả
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {nhanViens.filter(nv => (filterBranch === 'All' || nv.locationId === filterBranch) && (nv.retainedSalaryStatus !== 'Chưa giữ' || nv.retainedSalaryAmount > 0)).length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400 italic">Chưa có dữ liệu tiền giữ lương.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
