import React, { useState } from 'react';
import { format } from 'date-fns';
import { Plus, Search, AlertTriangle, Calendar, User, Trash2, X } from 'lucide-react';
import { Violation, Employee } from '../types/admin';
import { motion, AnimatePresence } from 'motion/react';
import { safeFormat } from '../utils/dateUtils';

interface ViolationManagementProps {
  activeTab: string;
  nhanViens: Employee[];
  violations: Violation[];
  handleAddViolation: (violation: { empId: string; type: string; date: string; note?: string }) => Promise<void>;
  handleDeleteViolation: (violationId: string, reason: string) => Promise<void>;
  adminTheme: any;
  filterMonth: string;
  BranchTabs: React.FC<any>;
}

const VIOLATION_TEMPLATES = [
  'Không để ý khách',
  'Vệ sinh kém',
  'Không bàn giao ca',
  'Thái độ làm việc chưa tốt',
  'Không đúng đồng phục',
  'Vi phạm khác',
  
];

export const ViolationManagement: React.FC<ViolationManagementProps> = ({
  activeTab,
  nhanViens,
  violations,
  handleAddViolation,
  handleDeleteViolation,
  adminTheme,
  filterMonth,
  BranchTabs
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedViolationForDelete, setSelectedViolationForDelete] = useState<Violation | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [selectedViolationType, setSelectedViolationType] = useState('');
  const [customViolation, setCustomViolation] = useState('');
  const [customNote, setCustomNote] = useState('');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (activeTab !== 'vipham') return null;

  const filteredViolations = violations
    .filter(v => {
      const emp = nhanViens.find(n => n.id === v.empId || n.empId === v.empId);
      const empName = emp?.fullName || '';
      return empName.toLowerCase().includes(searchTerm.toLowerCase()) || 
             v.type.toLowerCase().includes(searchTerm.toLowerCase());
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleSubmit = async () => {
    if (!selectedEmpId || !selectedViolationType) return;
    
    const finalType = selectedViolationType === 'Vi phạm khác' ? customViolation || 'Vi phạm khác' : selectedViolationType;
    
    setIsSubmitting(true);
    await handleAddViolation({
      empId: selectedEmpId,
      type: finalType,
      date: selectedDate,
      note: customNote
    });
    setIsSubmitting(false);
    setShowAddModal(false);
    setSelectedEmpId('');
    setSelectedViolationType('');
    setCustomViolation('');
    setCustomNote('');
  };

  const confirmDelete = async () => {
    if (!selectedViolationForDelete || !deleteReason) return;
    setIsSubmitting(true);
    await handleDeleteViolation(selectedViolationForDelete.id, deleteReason);
    setIsSubmitting(false);
    setShowDeleteModal(false);
    setSelectedViolationForDelete(null);
    setDeleteReason('');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-white p-4 md:p-6 rounded-[2.5rem] shadow-sm border border-stone-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="space-y-1">
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">QUẢN LÝ VI PHẠM</h2>
            <p className="text-sm text-slate-500 font-medium tracking-wide italic">Ghi nhận nhắc nhở & tự động khấu trừ thưởng trách nhiệm</p>
          </div>
          
          <button
            onClick={() => setShowAddModal(true)}
            className={`${adminTheme.button} text-white px-6 py-3 rounded-2xl font-black flex items-center gap-2 shadow-lg hover:shadow-xl transition-all active:scale-95 uppercase tracking-widest text-sm`}
          >
            <Plus className="w-5 h-5" />
            THÊM VI PHẠM
          </button>
        </div>

        <div className="mb-6">
          <BranchTabs />
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm kiếm nhân viên hoặc loại lỗi..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-stone-200 font-medium text-slate-600 shadow-inner"
          />
        </div>

        <div className="space-y-4">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto rounded-3xl border border-slate-100 shadow-sm">
            <table className="w-full text-sm text-left min-w-[600px]">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-black tracking-[0.2em]">
                <tr>
                  <th className="px-4 py-4 text-center w-16">STT</th>
                  <th className="px-4 py-4">Ngày ghi nhận</th>
                  <th className="px-4 py-4">Nhân viên</th>
                  <th className="px-4 py-4">Loại vi phạm</th>
                  <th className="px-4 py-4">Ghi chú</th>
                  <th className="px-4 py-4 text-center w-24">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredViolations.length > 0 ? (
                  filteredViolations.map((v, idx) => {
                    const emp = nhanViens.find(n => n.id === v.empId || n.empId === v.empId);
                    return (
                      <tr key={v.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-4 text-center font-bold text-slate-400">{idx + 1}</td>
                        <td className="px-4 py-4 font-bold text-slate-600">
                          {safeFormat(v.date, 'dd/MM/yyyy')}
                        </td>
                        <td className="px-4 py-4">
                          <span className="font-black text-slate-900 uppercase">{emp?.fullName || 'N/A'}</span>
                        </td>
                        <td className="px-4 py-4 uppercase">
                          <div className="flex flex-col gap-1">
                            <span className="px-3 py-1 bg-red-50 text-red-600 rounded-full text-[10px] font-black tracking-wider border border-red-100 w-fit">
                              {v.type}
                            </span>
                            {v.isRejected && (
                              <span className="px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-[9px] font-black tracking-wider border border-amber-100 w-fit">
                                NHÂN VIÊN KHIẾU NẠI
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-slate-500 italic font-medium max-w-[200px] truncate">
                          {v.note || '-'}
                        </td>
                        <td className="px-4 py-4 text-center">
                          <button 
                            onClick={() => {
                              setSelectedViolationForDelete(v);
                              setShowDeleteModal(true);
                            }}
                            className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                            title="Xóa lỗi vi phạm"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-bold uppercase tracking-widest italic opacity-50">
                      Chưa có dữ liệu vi phạm trong tháng này
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {filteredViolations.length > 0 ? (
              filteredViolations.map((v) => {
                const emp = nhanViens.find(n => n.id === v.empId || n.empId === v.empId);
                return (
                  <motion.div
                    layout
                    key={v.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-5 bg-white rounded-[2rem] border border-slate-100 shadow-sm active:scale-[0.98] transition-all relative group"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          {safeFormat(v.date, 'dd/MM/yyyy')}
                        </p>
                        <h4 className="font-black text-slate-900 uppercase tracking-tight text-lg">
                          {emp?.fullName || 'N/A'}
                        </h4>
                      </div>
                      <div className="flex flex-col gap-1 items-end shrink-0">
                        <span className="px-3 py-1 bg-red-50 text-red-600 rounded-full text-[9px] font-black uppercase tracking-wider border border-red-100">
                          {v.type}
                        </span>
                        {v.isRejected && (
                          <span className="px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-[8px] font-black tracking-wider border border-amber-100">
                            KHIẾU NẠI
                          </span>
                        )}
                      </div>
                    </div>

                    {v.note && (
                      <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        <p className="text-[11px] text-slate-500 italic font-medium leading-relaxed">
                          "{v.note}"
                        </p>
                      </div>
                    )}

                    <button 
                      onClick={() => {
                        setSelectedViolationForDelete(v);
                        setShowDeleteModal(true);
                      }}
                      className="absolute top-2 right-2 p-2 text-red-400 bg-white shadow-sm rounded-full opacity-0 group-hover:opacity-100 md:opacity-100 transition-all border border-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </motion.div>
                );
              })
            ) : (
              <div className="py-12 bg-slate-50 rounded-[2rem] text-center">
                <AlertTriangle className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] italic">
                  Chưa có dữ liệu vi phạm
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 100 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 100 }}
              className="relative bg-white w-full max-w-lg rounded-t-[3rem] md:rounded-[3rem] shadow-2xl overflow-hidden border border-stone-100 flex flex-col h-[95vh] md:max-h-[90vh]"
            >
              <div className={`p-4 md:p-8 ${adminTheme.accent} flex justify-between items-start shrink-0`}>
                <div className="space-y-0.5">
                  <h3 className="text-xl md:text-2xl font-black text-white uppercase tracking-tight">THÊM VI PHẠM</h3>
                  <div className="h-1 w-10 bg-white rounded-full shadow-sm" />
                </div>
                <button onClick={() => setShowAddModal(false)} className="p-2 bg-white/20 hover:bg-white/30 rounded-full text-white transition-all">
                  <X className="w-5 h-5 md:w-6 md:h-6" />
                </button>
              </div>

              <div className="p-4 md:p-8 space-y-4 overflow-y-auto custom-scrollbar flex-1">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Chọn nhân viên</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <select
                      value={selectedEmpId}
                      onChange={(e) => setSelectedEmpId(e.target.value)}
                      className="w-full pl-10 pr-4 py-3.5 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-stone-200 font-black text-slate-900 appearance-none shadow-inner text-sm"
                    >
                      <option value="">-- Chọn nhân viên --</option>
                      {nhanViens
                        .filter(nv => nv.status !== 'Đã nghỉ')
                        .sort((a, b) => a.fullName.localeCompare(b.fullName))
                        .map(nv => (
                          <option key={nv.id} value={nv.id}>{nv.fullName}</option>
                        ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Ngày</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-full pl-10 pr-4 py-3.5 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-stone-200 font-black text-slate-900 shadow-inner text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Vi phạm</label>
                  <div className="relative">
                    <AlertTriangle className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <select
                      value={selectedViolationType}
                      onChange={(e) => setSelectedViolationType(e.target.value)}
                      className="w-full pl-10 pr-4 py-3.5 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-stone-200 font-black text-slate-900 appearance-none shadow-inner text-sm"
                    >
                      <option value="">-- Chọn lỗi vi phạm --</option>
                      <option value="Không để ý khách">Không để ý khách</option>
                      <option value="Không bàn giao ca">Không bàn giao ca</option>
                      <option value="Thái độ làm việc chưa tốt">Thái độ làm việc chưa tốt</option>
                      <option value="Không đúng đồng phục">Không đúng đồng phục</option>
                      <option value="Vi phạm khác">Vi phạm khác</option>
                    </select>
                  </div>
                </div>

                {selectedViolationType === 'Vi phạm khác' && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }} 
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-1.5"
                  >
                    <label className="text-[10px] font-black text-red-400 uppercase tracking-widest px-1">Tên vi phạm khác</label>
                    <input
                      type="text"
                      placeholder="Nhập tên lỗi vi phạm..."
                      value={customViolation}
                      onChange={(e) => setCustomViolation(e.target.value)}
                      className="w-full p-3.5 bg-red-50/50 border-2 border-red-100 rounded-2xl focus:ring-2 focus:ring-red-200 font-black text-slate-900 shadow-inner text-sm"
                    />
                  </motion.div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Ghi chú chi tiết (Tùy chọn)</label>
                  <textarea
                    placeholder="Nhập chi tiết vi phạm nếu có..."
                    value={customNote}
                    onChange={(e) => setCustomNote(e.target.value)}
                    className="w-full p-3.5 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-stone-200 font-medium text-slate-600 min-h-[60px] shadow-inner text-sm"
                  />
                </div>
              </div>

              <div className="p-4 md:p-8 bg-slate-50 flex gap-3 shrink-0">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3.5 bg-white border border-slate-200 text-slate-500 font-black rounded-2xl hover:bg-slate-50 transition-all uppercase tracking-widest text-[10px]"
                >
                  Hủy
                </button>
                <button
                  disabled={!selectedEmpId || !selectedViolationType || (selectedViolationType === 'Vi phạm khác' && !customViolation) || isSubmitting}
                  onClick={handleSubmit}
                  className={`flex-1 py-3.5 ${adminTheme.button} text-white font-black rounded-2xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:shadow-none uppercase tracking-widest text-[10px]`}
                >
                  {isSubmitting ? 'ĐANG LƯU...' : 'XÁC NHẬN'}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {showDeleteModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeleteModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden p-6 md:p-8"
            >
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto">
                  <Trash2 className="w-8 h-8 text-red-500" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Xóa lỗi vi phạm</h3>
                  <p className="text-sm text-slate-500 font-medium italic">
                    Bạn đang thực hiện xóa lỗi vi phạm cho nhân viên{" "}
                    <span className="text-red-500 font-black uppercase">
                      {nhanViens.find(n => n.id === selectedViolationForDelete?.empId || n.empId === selectedViolationForDelete?.empId)?.fullName}
                    </span>
                  </p>
                </div>

                <div className="text-left space-y-1.5 pt-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Lý do xóa lỗi</label>
                  <textarea
                    placeholder="Nhập lý do xóa lỗi (VD: Nhiệt tình hỗ trợ đồng nghiệp...)"
                    value={deleteReason}
                    onChange={(e) => setDeleteReason(e.target.value)}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-red-200 font-medium text-slate-600 min-h-[120px] shadow-inner text-sm"
                  />
                  <p className="text-[10px] text-slate-400 italic px-1">* Nhân viên sẽ nhận được thông báo về lý do xóa lỗi này</p>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="flex-1 py-3.5 bg-slate-100 text-slate-500 font-black rounded-2xl hover:bg-slate-200 transition-all uppercase tracking-widest text-[10px]"
                  >
                    Hủy
                  </button>
                  <button
                    disabled={!deleteReason || isSubmitting}
                    onClick={confirmDelete}
                    className="flex-1 py-3.5 bg-red-600 text-white font-black rounded-2xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 uppercase tracking-widest text-[10px]"
                  >
                    {isSubmitting ? 'ĐANG XỬ LÝ...' : 'XÓA LỖI'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
