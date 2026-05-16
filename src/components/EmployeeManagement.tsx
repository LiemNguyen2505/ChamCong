import React from 'react';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import { Search, Plus, ArrowLeft, Phone, MoreVertical, Edit2, Trash2, Key, Smartphone, Clock, X, RefreshCw } from 'lucide-react';
import { doc, deleteDoc, collection, addDoc, updateDoc, serverTimestamp, deleteField, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { toast } from 'react-hot-toast';
import { Employee, AdminAccount, PlanningGoal } from '../types/admin';
import { safeFormat } from '../utils/dateUtils';

interface EmployeeManagementProps {
  currentAdmin: AdminAccount | null;
  adminTheme: any;
  activeTab: string;
  setActiveTab: (tab: any) => void;
  nhanViens: Employee[];
  filterBranch: string;
  planningGoals: PlanningGoal[];
  salaryReviewNotifications: any[];
  openConfirmModal: (title: string, message: string, onConfirm: () => void) => void;
  fetchInitialData: (month?: string, skipLoading?: boolean) => Promise<any>;
  BranchTabs: React.ComponentType<any>;
  logAction: (action: string, target: string, details: string) => Promise<void>;
  filterMonth: string;
  localGoals: {[key: string]: string};
  setLocalGoals: React.Dispatch<React.SetStateAction<{[key: string]: string}>>;
  handleUpdatePlanningGoal: (position: 'QUẦY' | 'PV', goalShifts: number) => Promise<void>;
}

export const EmployeeManagement: React.FC<EmployeeManagementProps> = ({
  currentAdmin,
  adminTheme,
  activeTab,
  setActiveTab,
  nhanViens,
  filterBranch,
  planningGoals,
  salaryReviewNotifications,
  openConfirmModal,
  fetchInitialData,
  BranchTabs,
  logAction,
  filterMonth,
  localGoals,
  setLocalGoals,
  handleUpdatePlanningGoal
}) => {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [openMenuEmpId, setOpenMenuEmpId] = React.useState<string | null>(null);
  const [showAddEmployeeModal, setShowAddEmployeeModal] = React.useState(false);
  const [showEditEmployeeModal, setShowEditEmployeeModal] = React.useState(false);
  const [newEmployee, setNewEmployee] = React.useState<any>({
    empId: '',
    phone: '',
    fullName: '',
    hourlyRate: 0,
    joinDate: format(new Date(), 'yyyy-MM-dd'),
    locationId: currentAdmin?.role === 'SuperAdmin' ? 'Góc Phố' : currentAdmin?.locationIds?.[0] || 'Góc Phố',
    defaultRole: 'PV',
    workType: 'Part Time',
    shiftsPerWeek: 0
  });
  const [editingEmployee, setEditingEmployee] = React.useState<Employee | null>(null);
  const [luongTheoGioStr, setLuongTheoGioStr] = React.useState('');
  const [thuongTrachNhiemStr, setThuongTrachNhiemStr] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const getAllowedBranches = () => {
    if (currentAdmin?.role === 'SuperAdmin') return ['Góc Phố', 'Phố Xanh'];
    return currentAdmin?.locationIds || ['Góc Phố'];
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!newEmployee.fullName) {
      toast.error('Vui lòng nhập Họ Tên');
      return;
    }

    if (newEmployee.phone) {
      const isDuplicatePhone = nhanViens.some(nv => nv.phone === newEmployee.phone);
      if (isDuplicatePhone) {
        toast.error('Số điện thoại đã tồn tại trong hệ thống');
        return;
      }
    }
    
    const loadingToast = toast.loading('Đang thêm nhân viên...');
    setIsSubmitting(true);
    try {
      const maxId = nhanViens.reduce((max, nv) => {
        const idNum = parseInt(nv.empId.replace('NV', ''));
        return !isNaN(idNum) && idNum > max ? idNum : max;
      }, 0);
      const nextId = maxId + 1;
      const maNV = `NV${String(nextId).padStart(3, '0')}`;
      
      let maPIN = '0000';
      if (newEmployee.phone && newEmployee.phone.length >= 4) {
        maPIN = newEmployee.phone.slice(-4);
      }

      const luong = parseInt(luongTheoGioStr.replace(/,/g, '')) || 0;
      const thuong = parseInt(thuongTrachNhiemStr.replace(/,/g, '')) || 0;

      const employeeData = {
        ...newEmployee,
        hourlyRate: luong,
        responsibilityBonus: thuong,
        phone: newEmployee.phone || '',
        empId: maNV,
        pinCode: maPIN,
        isFirstLogin: true,
        joinDate: newEmployee.joinDate || format(new Date(), 'yyyy-MM-dd'),
        locationId: newEmployee.locationId || (currentAdmin?.role === 'SuperAdmin' ? 'Góc Phố' : currentAdmin?.locationIds?.[0] || 'Góc Phố'),
        locationIds: [newEmployee.locationId || (currentAdmin?.role === 'SuperAdmin' ? 'Góc Phố' : currentAdmin?.locationIds?.[0] || 'Góc Phố')],
        workType: newEmployee.workType || 'Part Time',
        shiftsPerWeek: Number(newEmployee.shiftsPerWeek) || 0,
        retainedSalaryAmount: 0,
        retainedSalaryStatus: 'Chưa giữ',
        retainedSalaryBranch: '',
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'employees'), employeeData);
      await logAction('Thêm', 'Nhân viên', `Thêm nhân viên ${employeeData.fullName} (Mã: ${maNV})`);
      toast.success('Thêm nhân viên thành công', { id: loadingToast });
      await fetchInitialData(undefined, true);
      
      setNewEmployee({
        empId: '',
        phone: '',
        fullName: '',
        cccd: '',
        bankAccount: '',
        notes: '',
        hourlyRate: 0,
        joinDate: format(new Date(), 'yyyy-MM-dd'),
        locationId: currentAdmin?.role === 'SuperAdmin' ? 'Góc Phố' : currentAdmin?.locationIds?.[0] || 'Góc Phố',
        defaultRole: 'PV',
        workType: 'Part Time',
        shiftsPerWeek: 0
      });
      setLuongTheoGioStr('');
      setThuongTrachNhiemStr('');
      setShowAddEmployeeModal(false);
    } catch (error) {
      console.error(error);
      toast.error('Lỗi khi thêm nhân viên', { id: loadingToast });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee) return;
    if (isSubmitting) return;

    if (!editingEmployee.fullName) {
      toast.error('Vui lòng nhập Họ Tên');
      return;
    }

    if (editingEmployee.phone) {
      const isDuplicatePhone = nhanViens.some(nv => nv.phone === editingEmployee.phone && nv.id !== editingEmployee.id);
      if (isDuplicatePhone) {
        toast.error('Số điện thoại đã tồn tại trong hệ thống');
        return;
      }
    }

    setIsSubmitting(true);
    const loadingToast = toast.loading('Đang cập nhật nhân viên...');
    try {
      const luong = typeof luongTheoGioStr === 'string' && luongTheoGioStr !== '' 
        ? parseInt(luongTheoGioStr.replace(/,/g, '')) || 0 
        : editingEmployee.hourlyRate;
      
      const thuong = typeof thuongTrachNhiemStr === 'string' && thuongTrachNhiemStr !== ''
        ? parseInt(thuongTrachNhiemStr.replace(/,/g, '')) || 0
        : (editingEmployee.responsibilityBonus || 0);

      const oldEmployee = nhanViens.find(nv => nv.id === editingEmployee.id);
      
      const dataToUpdate: any = {
        fullName: editingEmployee.fullName,
        phone: editingEmployee.phone || '',
        hourlyRate: luong,
        responsibilityBonus: thuong,
        joinDate: editingEmployee.joinDate,
        locationId: editingEmployee.locationId || 'Góc Phố',
        locationIds: [editingEmployee.locationId || 'Góc Phố'],
        defaultRole: editingEmployee.defaultRole || 'PV',
        workType: editingEmployee.workType || 'Part Time',
        shiftsPerWeek: Number(editingEmployee.shiftsPerWeek) || 0,
        bankAccount: editingEmployee.bankAccount || '',
        notes: editingEmployee.notes || '',
        cccd: editingEmployee.cccd || ''
      };

      if (oldEmployee && luong > (oldEmployee.hourlyRate || 0)) {
        dataToUpdate.lastSalaryReviewDate = new Date().toISOString();
      }

      await updateDoc(doc(db, 'employees', editingEmployee.id), dataToUpdate);
      await logAction('Sửa', 'Nhân viên', `Sửa thông tin nhân viên ${editingEmployee.fullName} (Mã: ${editingEmployee.empId})`);
      
      toast.success('Cập nhật nhân viên thành công', { id: loadingToast });
      await fetchInitialData(undefined, true);
      setShowEditEmployeeModal(false);
      setEditingEmployee(null);
      setLuongTheoGioStr('');
      setThuongTrachNhiemStr('');
    } catch (error) {
      console.error(error);
      toast.error('Lỗi khi cập nhật nhân viên', { id: loadingToast });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPIN = async (nv: Employee) => {
    openConfirmModal(
      'Reset PIN',
      `Bạn có chắc chắn muốn reset mã PIN của nhân viên ${nv.fullName} về 4 số cuối điện thoại?`,
      async () => {
        try {
          if (!nv.phone || nv.phone.length < 4) {
            toast.error('Số điện thoại không hợp lệ để reset PIN');
            return;
          }
          const newPin = nv.phone.slice(-4);
          await updateDoc(doc(db, 'employees', nv.id), {
            pinCode: newPin,
            isFirstLogin: true
          });
          toast.success('Reset PIN thành công');
        } catch (error) {
          console.error('Reset PIN error:', error);
          toast.error('Lỗi khi reset PIN');
        }
      }
    );
  };

  const handleResetDevice = async (nv: Employee) => {
    openConfirmModal(
      'Reset thiết bị',
      `Bạn có chắc muốn reset thiết bị cho nhân viên ${nv.fullName}? Nhân viên sẽ có thể đăng nhập trên thiết bị mới.`,
      async () => {
        try {
          await updateDoc(doc(db, 'employees', nv.id), {
            deviceId: deleteField()
          });
          toast.success('Reset thiết bị thành công');
        } catch (error) {
          console.error('Reset Device error:', error);
          toast.error('Lỗi khi reset thiết bị');
        }
      }
    );
  };

  return (
    <div className="p-4 px-0 md:p-6">
      <div className="px-3 md:px-0 mb-2 md:mb-6">
        <BranchTabs />
      </div>
      <div className="flex flex-col md:flex-row justify-between items-start -mt-6 md:items-center gap-4 mb-3 md:mb-6 px-4 md:px-0">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className="md:hidden p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-full transition-colors flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-lg md:text-xl font-black text-slate-900 uppercase">
            QUẢN LÝ NHÂN VIÊN
          </h2>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text"
              placeholder="Tìm tên, SĐT..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 md:py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>
            <button
              onClick={() => {
                setNewEmployee({
                  empId: '',
                  phone: '',
                  fullName: '',
                  cccd: '',
                  bankAccount: '',
                  notes: '',
                  hourlyRate: 0,
                  joinDate: format(new Date(), 'yyyy-MM-dd'),
                  locationId: currentAdmin?.role === 'SuperAdmin' ? 'Góc Phố' : currentAdmin?.locationIds?.[0] || 'Góc Phố',
                  defaultRole: 'PV',
                  workType: 'Part Time',
                  shiftsPerWeek: 0
                });
                setLuongTheoGioStr('');
                setThuongTrachNhiemStr('');
                setShowAddEmployeeModal(true);
              }}
              className={`flex items-center justify-center p-2 h-[41px] ${adminTheme.button} text-white rounded-xl text-sm font-bold shadow-lg ${adminTheme.shadow}`}
            >
              <Plus className="w-5 h-5 md:w-4 md:h-4" />
              <span className="hidden md:inline ml-2">Thêm nhân viên</span>
            </button>
        </div>
      </div>

      <div className="md:hidden space-y-4">
        {['QUẦY', 'PV'].map(pos => {
          const groupedEmps = nhanViens.filter(nv => {
            const matchesAdminBranch = currentAdmin?.role === 'SuperAdmin' || (currentAdmin?.locationIds || []).includes(nv.locationId || '');
            const matchesFilterBranch = filterBranch === 'All' || nv.locationId === filterBranch;
            const matchesSearch = !searchTerm || nv.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || nv.phone.includes(searchTerm);
            const matchesPosition = (nv.defaultRole || 'PV') === pos;
            return matchesAdminBranch && matchesFilterBranch && matchesSearch && matchesPosition;
          });

          if (groupedEmps.length === 0 && filterBranch === 'All') return null;

          const totalCurrent = groupedEmps.reduce((sum, nv) => sum + (nv.shiftsPerWeek || 0), 0);
          const goalId = `${filterBranch}_${pos}`;
          const currentGoalStr = localGoals[goalId];
          const currentGoalVal = currentGoalStr !== undefined 
            ? (parseInt(currentGoalStr) || 0) 
            : (planningGoals.find(g => g.branchId === filterBranch && g.position === pos)?.goalShifts || 0);
            
          const diff = totalCurrent - currentGoalVal;
          const progress = currentGoalVal > 0 ? Math.min((totalCurrent / currentGoalVal) * 100, 100) : 0;
          const isUnder = totalCurrent < currentGoalVal;

          return (
            <div key={pos} className="space-y-2">
              <div className="px-1 space-y-1">
                <div className="flex justify-between items-end">
                  <h3 className="text-[11px] font-black text-stone-800 uppercase tracking-widest">
                    {pos === 'QUẦY' ? 'NHÓM QUẦY' : 'NHÓM PHỤC VỤ'}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-stone-700 flex items-center">
                      <span className="text-[13px] font-black text-stone-900">{totalCurrent}</span> 
                      <span className="mx-1 text-stone-400">/</span> 
                      <input 
                        type="text"
                        inputMode="numeric"
                        value={localGoals[goalId] ?? String(currentGoalVal)}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '');
                          setLocalGoals(prev => ({ ...prev, [goalId]: val }));
                        }}
                        onBlur={(e) => {
                          const val = e.target.value;
                          handleUpdatePlanningGoal(pos as 'QUẦY' | 'PV', parseInt(val) || 0);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            (e.target as HTMLInputElement).blur();
                          }
                        }}
                        className="w-10 bg-white/50 border border-stone-200 rounded px-1 text-[13px] font-black text-stone-900 focus:ring-1 focus:ring-blue-500 outline-none text-center"
                      />
                      <span className="ml-1 uppercase">Ca</span>
                      {isUnder && <span className="text-rose-600 ml-1 text-[9px] font-black tracking-tighter">(Thiếu {Math.abs(diff)})</span>}
                    </span>
                    <span className="text-[9px] font-medium text-stone-400">({groupedEmps.length} NV)</span>
                  </div>
                </div>
                <div className="h-1 w-full bg-stone-100 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    className={`h-full rounded-full ${isUnder ? 'bg-[#8B4513]' : 'bg-emerald-500'}`}
                  />
                </div>
              </div>
              
              <div className="space-y-1.5">
                {groupedEmps.map((nv, nvIndex) => (
                  <div key={nv.id} className="bg-[#FFF8E1] min-h-[54px] flex items-center px-3 py-1.5 rounded-xl border border-stone-100 shadow-[0_2px_8px_rgba(0,0,0,0.04)] active:scale-[0.98] transition-all relative overflow-hidden group">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="flex-shrink-0 w-7 h-7 bg-[#4B3621] rounded-lg flex items-center justify-center text-white font-black text-[10px] shadow-sm">
                        {nvIndex + 1}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[13px] font-bold text-stone-900 leading-tight tracking-tight break-words pr-2">{nv.fullName}</span>
                        <div className="flex items-center gap-1 mt-0.5">
                          <a href={`tel:${nv.phone}`} className="p-0.5 -ml-0.5 text-stone-400 hover:text-[#4B3621] transition-colors">
                            <Phone className="w-3 h-3" />
                          </a>
                          <span className="text-xs text-stone-500 font-mono tracking-tight font-medium">{nv.phone}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-center px-3 border-x border-stone-200/40 min-w-[75px]">
                      <span className="text-[7px] font-black text-stone-400 uppercase leading-none mb-1 tracking-wider whitespace-nowrap">Số Ca/Tuần</span>
                      <div className="text-[14px] font-black text-[#4B3621]">
                        {nv.shiftsPerWeek || 0}
                      </div>
                    </div>

                    <div className="flex items-center pl-2 relative">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuEmpId(openMenuEmpId === nv.id ? null : nv.id);
                        }}
                        className="p-2 -mr-1 text-stone-400 hover:text-[#4B3621] active:bg-white/50 rounded-full transition-colors"
                      >
                        <MoreVertical className="w-5 h-5" />
                      </button>

                      {openMenuEmpId === nv.id && (
                        <>
                          <div 
                            className="fixed inset-0 z-10" 
                            onClick={() => setOpenMenuEmpId(null)} 
                          />
                          <div className="absolute right-full mr-1 top-1/2 -translate-y-1/2 bg-white rounded-xl shadow-xl border border-stone-100 py-1.5 z-20 min-w-[90px] animate-in fade-in zoom-in-95 duration-150">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingEmployee(nv);
                                setLuongTheoGioStr(nv.hourlyRate.toLocaleString('en-US'));
                                setThuongTrachNhiemStr((nv.responsibilityBonus || 0).toLocaleString('en-US'));
                                setShowEditEmployeeModal(true);
                                setOpenMenuEmpId(null);
                              }}
                              className="w-full flex items-center gap-2.5 px-3 py-2 text-[10px] font-black text-stone-600 active:bg-stone-50 uppercase"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-sky-500" />
                              SỬA
                            </button>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenuEmpId(null);
                                  openConfirmModal('Xóa NV', `Xóa ${nv.fullName}?`, async () => { await deleteDoc(doc(db, 'employees', nv.id)); toast.success('Xóa thành công'); await fetchInitialData(undefined, true); });
                                }}
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-[10px] font-black text-rose-500 active:bg-rose-50 border-t border-stone-50 uppercase"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                XÓA
                              </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="hidden md:block overflow-x-auto bg-white rounded-xl border border-gray-200 shadow-sm custom-scrollbar">
        <table className="w-full text-left border-collapse min-w-[900px] table-fixed">
          <thead>
            <tr className="bg-gray-100 border-b border-gray-300 text-[10px] uppercase font-black text-slate-600 tracking-wider">
              <th className="p-3 w-[60px] text-center sticky left-0 bg-gray-100 z-30 border-r border-gray-200 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">STT</th>
              <th className="p-3 w-[220px] sticky left-[60px] bg-gray-100 z-30 border-r border-gray-200 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">Họ Tên</th>
              <th className="p-3 w-[120px]">Số Điện Thoại</th>
              <th className="p-3 w-[100px] text-center">Vị trí</th>
              <th className="p-3 w-[100px] text-center">Số Ca/Tuần</th>
              <th className="p-3 w-[150px]">Ngày vào làm</th>
              <th className="p-3 w-[150px]">TK Ngân hàng</th>
              <th className="p-3 w-[120px] text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {['QUẦY', 'PV'].map(pos => {
              const groupedEmployees = nhanViens.filter(nv => {
                const matchesAdminBranch = currentAdmin?.role === 'SuperAdmin' || (currentAdmin?.locationIds || []).includes(nv.locationId || '');
                const matchesFilterBranch = filterBranch === 'All' || nv.locationId === filterBranch;
                const matchesSearch = !searchTerm || nv.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || nv.phone.includes(searchTerm);
                const matchesPosition = (nv.defaultRole || 'PV') === pos;
                return matchesAdminBranch && matchesFilterBranch && matchesSearch && matchesPosition;
              });

              if (groupedEmployees.length === 0 && filterBranch === 'All') return null;

              const totalCurrentGroup = groupedEmployees.reduce((sum, nv) => sum + (nv.shiftsPerWeek || 0), 0);
              const goalGroup = planningGoals.find(g => g.branchId === filterBranch && g.position === pos)?.goalShifts || 0;
              const currentGoalVal = localGoals[`${filterBranch}_${pos}`] !== undefined 
                ? (parseInt(localGoals[`${filterBranch}_${pos}`]) || 0) 
                : goalGroup;
              const diffGroup = totalCurrentGroup - currentGoalVal;

              return (
                <React.Fragment key={pos}>
                  <tr className={`${pos === 'QUẦY' ? 'bg-orange-50/70' : 'bg-sky-50/70'} font-black text-xs border-y border-gray-200`}>
                    <td colSpan={8} className="p-2 px-4 uppercase tracking-widest text-slate-700">
                      {pos === 'QUẦY' ? 'QUẦY (PHA CHẾ)' : 'PHỤC VỤ (PV)'}
                    </td>
                  </tr>

                  {groupedEmployees.map((nv, index) => (
                    <tr 
                      key={nv.id} 
                      className={`border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer group/row ${pos === 'QUẦY' ? 'bg-orange-50/20' : 'bg-sky-50/20'}`}
                      onDoubleClick={() => {
                        setEditingEmployee(nv);
                        setLuongTheoGioStr(nv.hourlyRate.toLocaleString('en-US'));
                        setThuongTrachNhiemStr((nv.responsibilityBonus || 0).toLocaleString('en-US'));
                        setShowEditEmployeeModal(true);
                      }}
                    >
                      <td className="p-2 text-center text-gray-500 font-black text-xs sticky left-0 bg-inherit z-10 border-r border-gray-100 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                        {index + 1}
                      </td>
                      <td className="p-2 sticky left-[60px] bg-inherit z-10 border-r border-gray-100 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                        <div className="font-bold text-gray-900 group-hover/row:text-blue-600 transition-colors uppercase text-[13px]">{nv.fullName}</div>
                        {salaryReviewNotifications.some(n => n.empId === nv.empId) && (
                          <span className="inline-block px-1.5 py-0.5 bg-red-100 text-red-600 text-[9px] font-bold rounded animate-pulse uppercase">Review lương</span>
                        )}
                      </td>
                      <td className="p-2">
                        <div className="text-gray-600 font-mono text-xs">{nv.phone}</div>
                      </td>
                      <td className="p-2 text-center">
                        <span className={`px-2 py-1 rounded-md text-[10px] font-black ${pos === 'QUẦY' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                          {pos}
                        </span>
                      </td>
                      <td className="p-2 text-center">
                        <div className="w-16 mx-auto px-2 py-1 border border-transparent rounded text-center font-black">
                          {nv.shiftsPerWeek || 0}
                        </div>
                      </td>
                      <td className="p-2 text-gray-600 text-xs">
                        {nv.joinDate ? safeFormat(nv.joinDate, 'dd/MM/yyyy') : '-'}
                      </td>
                      <td className="p-2 text-gray-600 text-xs truncate max-w-[150px]">
                        {nv.bankAccount || '-'}
                      </td>
                      <td className="p-2">
                        <div className="flex justify-end gap-1 px-1">
                          {currentAdmin?.role === 'SuperAdmin' && (
                            <>
                              <button onClick={(e) => { e.stopPropagation(); handleResetPIN(nv); }} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded" title="Reset PIN"><Key className="w-3.5 h-3.5" /></button>
                              <button onClick={(e) => { e.stopPropagation(); handleResetDevice(nv); }} className="p-1.5 text-purple-600 hover:bg-purple-50 rounded" title="Reset Thiết bị"><Smartphone className="w-3.5 h-3.5" /></button>
                            </>
                          )}
                          <button onClick={(e) => { e.stopPropagation(); setEditingEmployee(nv); setShowEditEmployeeModal(true); }} className="p-1.5 text-sky-600 hover:bg-sky-50 rounded" title="Sửa"><Edit2 className="w-3.5 h-3.5" /></button>
                          <button onClick={(e) => { e.stopPropagation(); openConfirmModal('Xóa NV', `Xóa ${nv.fullName}?`, async () => { await deleteDoc(doc(db, 'employees', nv.id)); toast.success('Xóa thành công'); await fetchInitialData(undefined, true); }); }} className="p-1.5 text-red-600 hover:bg-red-50 rounded" title="Xóa"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {filterBranch !== 'All' && (
                    <React.Fragment>
                      <tr className={`${pos === 'QUẦY' ? 'bg-orange-100/50' : 'bg-sky-100/50'} font-black text-xs text-slate-700`}>
                        <td colSpan={4} className="p-3 text-right">TỔNG CA HIỆN CÓ:</td>
                        <td className="p-3 text-center text-lg">{totalCurrentGroup}</td>
                        <td colSpan={3} className="p-3">--</td>
                      </tr>
                      <tr className={`${pos === 'QUẦY' ? 'bg-orange-100' : 'bg-sky-100'} font-black text-xs text-slate-800`}>
                        <td colSpan={4} className="p-3 text-right text-sky-800 uppercase tracking-tighter">SỐ CA CẦN CÓ (TARGET):</td>
                        <td className="p-3 text-center">
                          <input 
                            type="text"
                            inputMode="numeric"
                            value={localGoals[`${filterBranch}_${pos}`] ?? String(goalGroup)}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                              const val = e.target.value.replace(/\D/g, '');
                              const goalId = `${filterBranch}_${pos}`;
                              setLocalGoals(prev => ({ ...prev, [goalId]: val }));
                            }}
                            onBlur={(e) => {
                              const val = e.target.value;
                              handleUpdatePlanningGoal(pos as 'QUẦY' | 'PV', parseInt(val) || 0);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                (e.target as HTMLInputElement).blur();
                              }
                            }}
                            className="w-20 px-2 py-1 bg-white border border-slate-300 rounded text-center text-lg font-black focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </td>
                        <td colSpan={3} className="p-3 text-xs italic opacity-60"></td>
                      </tr>
                      <tr className={`${adminTheme.accent} text-white font-black text-xs border-t border-white/20`}>
                        <td colSpan={4} className="p-3 text-right tracking-widest uppercase opacity-90">KẾT QUẢ HOẠCH ĐỊNH:</td>
                        <td className="p-3 text-center">
                          <div className="flex flex-col items-center">
                            <span className={`text-xl font-black tabular-nums text-white`}>
                              {diffGroup > 0 ? `+${diffGroup}` : diffGroup}
                            </span>
                          </div>
                        </td>
                        <td colSpan={3} className="p-3">
                          {diffGroup < 0 ? (
                            <span className="text-rose-100 animate-pulse uppercase tracking-tighter shadow-sm">Cần tuyển thêm nhân sự {pos}</span>
                          ) : (
                            <span className="text-emerald-100 uppercase tracking-tighter shadow-sm">Đã đủ / Thừa nhân sự</span>
                          )}
                        </td>
                      </tr>
                    </React.Fragment>
                  )}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Add Employee Modal */}
      {showAddEmployeeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center p-2 z-50 overflow-y-auto pt-4 md:pt-10" onMouseDown={(e) => { if (e.target === e.currentTarget) setShowAddEmployeeModal(false); }}>
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-white/10">
            <div className={`flex items-center justify-between p-3 border-b border-white/10 ${adminTheme.header}`}>
              <h2 className="text-base font-bold text-white uppercase tracking-tight">Thêm nhân viên mới</h2>
              <button 
                onClick={() => setShowAddEmployeeModal(false)}
                className="p-1 hover:bg-white/10 rounded-full text-white/70 transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
            <form onSubmit={handleAddEmployee} className="p-3 md:p-4 overflow-y-auto space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">Thông tin cơ bản</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="col-span-1 sm:col-span-2">
                    <label className="block text-[11px] font-black text-slate-500 uppercase mb-1 ml-1">Họ Tên <span className="text-red-500">*</span></label>
                    <input type="text" required value={newEmployee.fullName} onChange={e => setNewEmployee({ ...newEmployee, fullName: e.target.value })} className="w-full px-2.5 py-1.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm" placeholder="Nhập họ và tên" />
                  </div>
                  <div className="grid grid-cols-2 gap-3 col-span-1 sm:col-span-2">
                    <div>
                      <label className="block text-[11px] font-black text-slate-500 uppercase mb-1 ml-1">Số Điện Thoại <span className="text-red-500">*</span></label>
                      <input type="tel" required value={newEmployee.phone || ''} onChange={e => setNewEmployee({ ...newEmployee, phone: e.target.value.replace(/\D/g, '') })} className="w-full px-2.5 py-1.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm" placeholder="Nhập SĐT" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-black text-slate-500 uppercase mb-1 ml-1">Số CCCD</label>
                      <input type="text" value={newEmployee.cccd || ''} onChange={e => setNewEmployee({ ...newEmployee, cccd: e.target.value.replace(/\D/g, '') })} className="w-full px-2.5 py-1.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm" placeholder="Nhập số CCCD" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-black text-slate-500 uppercase mb-1 ml-1">Chi nhánh <span className="text-red-500">*</span></label>
                      <select value={newEmployee.locationId} onChange={e => setNewEmployee({ ...newEmployee, locationId: e.target.value })} className="w-full px-2.5 py-1.5 border border-slate-200 rounded-xl font-bold bg-white text-sm">
                        {getAllowedBranches().map(branch => <option key={branch} value={branch}>{branch}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-black text-slate-500 uppercase mb-1 ml-1">Số TK Ngân Hàng</label>
                      <input type="text" value={newEmployee.bankAccount || ''} onChange={e => setNewEmployee({ ...newEmployee, bankAccount: e.target.value })} className="w-full px-2.5 py-1.5 border border-slate-200 rounded-xl font-bold text-sm" placeholder="Số TK" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">Thông tin bổ sung & Ghi chú</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-black text-slate-500 uppercase mb-1 ml-1">Số Ca/Tuần</label>
                      <input type="number" value={newEmployee.shiftsPerWeek || ''} onChange={e => { let val = parseInt(e.target.value); if (isNaN(val)) val = 0; if (val > 21) val = 21; setNewEmployee({ ...newEmployee, shiftsPerWeek: val }); }} className="w-full px-2 py-1.5 border border-slate-200 rounded-xl font-bold text-sm text-center" placeholder="Số ca" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-black text-slate-500 uppercase mb-1 ml-1">Ngày Vào Làm</label>
                      <input type="date" value={newEmployee.joinDate || ''} onChange={e => setNewEmployee({ ...newEmployee, joinDate: e.target.value })} className="w-full px-2 py-1.5 border border-slate-200 rounded-xl font-bold text-sm" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-black text-slate-500 uppercase mb-1 ml-1">Vị trí</label>
                      <select value={(newEmployee.defaultRole || 'PV')} onChange={e => setNewEmployee({ ...newEmployee, defaultRole: e.target.value as 'QUẦY' | 'PV' })} className="w-full px-2 py-1.5 border border-slate-200 rounded-xl font-bold bg-white text-[13px]">
                        <option value="QUẦY">QUẦY</option>
                        <option value="PV">PHỤC VỤ</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-black text-slate-500 uppercase mb-1 ml-1">Loại hình</label>
                      <select value={(newEmployee.workType || 'Part Time')} onChange={e => setNewEmployee({ ...newEmployee, workType: e.target.value as 'Part Time' | 'Full Time' })} className="w-full px-2 py-1.5 border border-slate-200 rounded-xl font-bold bg-white text-sm">
                        <option value="Part Time">Part Time</option>
                        <option value="Full Time">Full Time</option>
                      </select>
                    </div>
                  </div>
                  <div className="col-span-1 sm:col-span-2">
                    <label className="block text-[11px] font-black text-slate-500 uppercase mb-1 ml-1">Ghi chú</label>
                    <textarea 
                      value={newEmployee.notes || ''} 
                      onChange={e => setNewEmployee({ ...newEmployee, notes: e.target.value })} 
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-xl font-medium text-sm focus:ring-2 focus:ring-blue-500 outline-none min-h-[80px] resize-none bg-white" 
                      placeholder="Ghi chú thêm..." 
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setShowAddEmployeeModal(false)} className="px-5 py-2 bg-slate-100 text-slate-600 rounded-xl font-black text-[11px] uppercase tracking-widest">Hủy</button>
                <button type="submit" disabled={isSubmitting} className={`px-5 py-2 ${adminTheme.button} text-white rounded-xl font-black text-[11px] uppercase tracking-widest shadow-lg ${adminTheme.shadow}`}>
                  {isSubmitting ? 'ĐANG XỬ LÝ...' : 'THÊM NHÂN VIÊN'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Edit Employee Modal */}
      {showEditEmployeeModal && editingEmployee && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center p-2 z-50 overflow-y-auto pt-4 md:pt-10" onMouseDown={(e) => { if (e.target === e.currentTarget) setShowEditEmployeeModal(false); }}>
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-white/10">
            <div className={`flex items-center justify-between p-3 border-b border-white/10 ${adminTheme.header}`}>
              <h2 className="text-base font-bold text-white uppercase tracking-tight">Sửa thông tin nhân viên</h2>
              <button 
                onClick={() => setShowEditEmployeeModal(false)}
                className="p-1 hover:bg-white/10 rounded-full text-white/70 transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
            <form onSubmit={handleUpdateEmployee} className="p-3 md:p-4 overflow-y-auto space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">Thông tin cơ bản</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="col-span-1 sm:col-span-2">
                    <label className="block text-[11px] font-black text-slate-500 uppercase mb-1 ml-1">Họ Tên <span className="text-red-500">*</span></label>
                    <input type="text" required value={editingEmployee.fullName} onChange={e => setEditingEmployee({ ...editingEmployee, fullName: e.target.value })} className="w-full px-2.5 py-1.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm" placeholder="Nhập họ và tên" />
                  </div>
                  <div className="grid grid-cols-2 gap-3 col-span-1 sm:col-span-2">
                    <div>
                      <label className="block text-[11px] font-black text-slate-500 uppercase mb-1 ml-1">Số Điện Thoại <span className="text-red-500">*</span></label>
                      <input type="tel" required value={editingEmployee.phone || ''} onChange={e => setEditingEmployee({ ...editingEmployee, phone: e.target.value.replace(/\D/g, '') })} className="w-full px-2.5 py-1.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm" placeholder="Nhập SĐT" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-black text-slate-500 uppercase mb-1 ml-1">Số CCCD</label>
                      <input type="text" value={editingEmployee.cccd || ''} onChange={e => setEditingEmployee({ ...editingEmployee, cccd: e.target.value.replace(/\D/g, '') })} className="w-full px-2.5 py-1.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm" placeholder="Nhập số CCCD" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-black text-slate-500 uppercase mb-1 ml-1">Chi nhánh <span className="text-red-500">*</span></label>
                      <select value={editingEmployee.locationId} onChange={e => setEditingEmployee({ ...editingEmployee, locationId: e.target.value })} className="w-full px-2.5 py-1.5 border border-slate-200 rounded-xl font-bold bg-white text-sm">
                        {getAllowedBranches().map(branch => <option key={branch} value={branch}>{branch}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-black text-slate-500 uppercase mb-1 ml-1">Số TK Ngân Hàng</label>
                      <input type="text" value={editingEmployee.bankAccount || ''} onChange={e => setEditingEmployee({ ...editingEmployee, bankAccount: e.target.value })} className="w-full px-2.5 py-1.5 border border-slate-200 rounded-xl font-bold text-sm" placeholder="Số TK" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">Thông tin bổ sung & Ghi chú</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-black text-slate-500 uppercase mb-1 ml-1">Số Ca/Tuần</label>
                      <input type="number" value={editingEmployee.shiftsPerWeek || ''} onChange={e => { let val = parseInt(e.target.value); if (isNaN(val)) val = 0; if (val > 21) val = 21; setEditingEmployee({ ...editingEmployee, shiftsPerWeek: val }); }} className="w-full px-2 py-1.5 border border-slate-200 rounded-xl font-bold text-sm text-center" placeholder="Số ca" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-black text-slate-500 uppercase mb-1 ml-1">Ngày Vào Làm</label>
                      <input type="date" value={editingEmployee.joinDate || ''} onChange={e => setEditingEmployee({ ...editingEmployee, joinDate: e.target.value })} className="w-full px-2 py-1.5 border border-slate-200 rounded-xl font-bold text-sm" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-black text-slate-500 uppercase mb-1 ml-1">Vị trí</label>
                      <select value={(editingEmployee.defaultRole || 'PV')} onChange={e => setEditingEmployee({ ...editingEmployee, defaultRole: e.target.value as 'QUẦY' | 'PV' })} className="w-full px-2 py-1.5 border border-slate-200 rounded-xl font-bold bg-white text-[13px]">
                        <option value="QUẦY">QUẦY</option>
                        <option value="PV">PHỤC VỤ</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-black text-slate-500 uppercase mb-1 ml-1">Loại hình</label>
                      <select value={(editingEmployee.workType || 'Part Time')} onChange={e => setEditingEmployee({ ...editingEmployee, workType: e.target.value as 'Part Time' | 'Full Time' })} className="w-full px-2 py-1.5 border border-slate-200 rounded-xl font-bold bg-white text-sm">
                        <option value="Part Time">Part Time</option>
                        <option value="Full Time">Full Time</option>
                      </select>
                    </div>
                  </div>
                  <div className="col-span-1 sm:col-span-2">
                    <label className="block text-[11px] font-black text-slate-500 uppercase mb-1 ml-1">Ghi chú</label>
                    <textarea 
                      value={editingEmployee.notes || ''} 
                      onChange={e => setEditingEmployee({ ...editingEmployee, notes: e.target.value })} 
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-xl font-medium text-sm focus:ring-2 focus:ring-blue-500 outline-none min-h-[80px] resize-none bg-white" 
                      placeholder="Ghi chú thêm..." 
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setShowEditEmployeeModal(false)} className="px-5 py-2 bg-slate-100 text-slate-600 rounded-xl font-black text-[11px] uppercase tracking-widest">Hủy</button>
                <button type="submit" disabled={isSubmitting} className={`px-5 py-2 ${adminTheme.button} text-white rounded-xl font-black text-[11px] uppercase tracking-widest shadow-lg ${adminTheme.shadow}`}>
                  {isSubmitting ? 'ĐANG LƯU...' : 'LƯU THAY ĐỔI'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
