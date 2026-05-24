import React, { useState } from 'react';
import { db } from '../firebase';
import { collection, updateDoc, doc, addDoc, deleteDoc, query, where, getDocs, writeBatch, serverTimestamp } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { Timesheet, Employee, AdminAccount } from '../types/admin';

interface UseAdminAttendanceProps {
  nhanViens: Employee[];
  currentAdmin: AdminAccount | null;
  fetchInitialData: (month?: string, force?: boolean) => Promise<any>;
  filterMonth: string;
  logAction: (action: string, target: string, details: string) => Promise<void>;
  openConfirmModal: (title: string, message: string, onConfirm: () => void) => void;
}

export const useAdminAttendance = ({
  nhanViens,
  currentAdmin,
  fetchInitialData,
  filterMonth,
  logAction,
  openConfirmModal
}: UseAdminAttendanceProps) => {
  const [showManualCheckin, setShowManualCheckin] = useState(false);
  const [manualCheckinData, setManualCheckinData] = useState({
    empId: '',
    locationId: 'Góc Phố',
    dateTime: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    type: 'IN' as 'IN' | 'OUT'
  });
  const [showEditAttendanceModal, setShowEditAttendanceModal] = useState(false);
  const [editingAttendance, setEditingAttendance] = useState<Timesheet | null>(null);

  const [manualAttendance, setManualAttendance] = useState({
    empId: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    checkInTime: format(new Date(), 'HH:mm'),
    checkOutTime: '',
    locationId: 'Góc Phố'
  });

  const handleManualAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualAttendance.empId || !manualAttendance.date || !manualAttendance.checkInTime) {
      toast.error('Vui lòng điền đầy đủ thông tin');
      return;
    }

    const loadingToast = toast.loading('Đang ghi nhận chấm công...');
    try {
      const employee = nhanViens.find(nv => nv.empId === manualAttendance.empId);
      if (!employee) {
        toast.error('Nhân viên không tồn tại', { id: loadingToast });
        return;
      }

      const checkInISO = new Date(`${manualAttendance.date}T${manualAttendance.checkInTime}`).toISOString();
      let checkOutISO = null;
      let totalHours = 0;
      let totalPay = 0;

      if (manualAttendance.checkOutTime) {
        checkOutISO = new Date(`${manualAttendance.date}T${manualAttendance.checkOutTime}`).toISOString();
        const diffMs = new Date(checkOutISO).getTime() - new Date(checkInISO).getTime();
        totalHours = Math.max(0, diffMs / (1000 * 60 * 60));
        totalPay = totalHours * employee.hourlyRate;
      }

      const timesheetId = `TS_MANUAL_${manualAttendance.empId}_${Date.now()}`;
      await addDoc(collection(db, 'timesheets'), {
        timesheetId,
        date: manualAttendance.date,
        empId: manualAttendance.empId,
        locationId: manualAttendance.locationId,
        checkInTime: checkInISO,
        checkOutTime: checkOutISO,
        SaiSoGPS: 0,
        AnhVaoCa: 'MANUAL_BY_ADMIN',
        AnhRaCa: manualAttendance.checkOutTime ? 'MANUAL_BY_ADMIN' : null,
        PhutPhatRoiApp: 0,
        SoLanRoiApp: 0,
        totalHours,
        totalPay,
        createdByAdminId: currentAdmin?.id
      });
      await logAction('Chấm công hộ', 'Chấm công', `Chấm công hộ cho ${employee.fullName} (Mã: ${manualAttendance.empId}) vào ngày ${manualAttendance.date}`);

      toast.success('Chấm công hộ thành công', { id: loadingToast });
      await fetchInitialData(filterMonth, true);
      setShowManualCheckin(false);
      setManualAttendance({
        empId: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        checkInTime: format(new Date(), 'HH:mm'),
        checkOutTime: '',
        locationId: 'Góc Phố'
      });
    } catch (error) {
      console.error(error);
      toast.error('Lỗi khi chấm công hộ', { id: loadingToast });
    }
  };

  const handleUpdateAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAttendance) return;

    const loadingToast = toast.loading('Đang cập nhật chấm công...');
    try {
      const employee = nhanViens.find(nv => nv.empId === editingAttendance.empId);
      if (!employee) {
        toast.error('Nhân viên không tồn tại', { id: loadingToast });
        return;
      }

      const checkInISO = new Date(`${editingAttendance.date}T${editingAttendance.checkInTime}`).toISOString();
      let checkOutISO = null;
      let totalHours = 0;
      let totalPay = 0;
      let lateMinutes = 0;
      let latePenaltyMinutes = 0;

      if (editingAttendance.scheduledStartTime && editingAttendance.checkInTime) {
        const [schH, schM] = editingAttendance.scheduledStartTime.split(':').map(Number);
        const [selH, selM] = editingAttendance.checkInTime.split(':').map(Number);
        const selTotal = selH * 60 + selM;
        const schTotal = schH * 60 + schM;
        if (selTotal > schTotal) {
          lateMinutes = selTotal - schTotal;
          if (lateMinutes >= 10) {
            latePenaltyMinutes = lateMinutes * 3;
          }
        }
      }

      if (editingAttendance.lateMinutes !== undefined && editingAttendance.lateMinutes !== null) {
        lateMinutes = editingAttendance.lateMinutes;
        latePenaltyMinutes = lateMinutes >= 10 ? lateMinutes * 3 : 0;
      }

      if (editingAttendance.checkOutTime) {
        checkOutISO = new Date(`${editingAttendance.date}T${editingAttendance.checkOutTime}`).toISOString();
        const diffMs = new Date(checkOutISO).getTime() - new Date(checkInISO).getTime();
        totalHours = Math.max(0, diffMs / (1000 * 60 * 60));
        totalPay = totalHours * employee.hourlyRate;
      }
      
      if (editingAttendance.totalHours !== undefined && editingAttendance.totalHours !== null) {
        totalHours = editingAttendance.totalHours;
        totalPay = totalHours * employee.hourlyRate;
      }

      await updateDoc(doc(db, 'timesheets', editingAttendance.id), {
        date: editingAttendance.date,
        locationId: editingAttendance.locationId,
        checkInTime: checkInISO,
        checkOutTime: checkOutISO,
        totalHours,
        totalPay,
        lateMinutes,
        latePenaltyMinutes
      });
      await logAction('Sửa', 'Chấm công', `Sửa bản ghi chấm công của ${employee.fullName} (Mã: ${editingAttendance.empId}) ngày ${editingAttendance.date}`);

      toast.success('Cập nhật chấm công thành công', { id: loadingToast });
      await fetchInitialData(filterMonth, true);
      setShowEditAttendanceModal(false);
      setEditingAttendance(null);
    } catch (error) {
      console.error(error);
      toast.error('Lỗi khi cập nhật chấm công', { id: loadingToast });
    }
  };

  const handleApproveAttendance = async (log: Timesheet) => {
    const loadingToast = toast.loading('Đang duyệt giờ công...');
    try {
      await updateDoc(doc(db, 'timesheets', log.id), {
        status: 'approved'
      });
      
      const q = query(collection(db, 'ApprovalRequests'), where('details.timesheetId', '==', log.id));
      const snap = await getDocs(q);
      for (const d of snap.docs) {
        await updateDoc(doc(db, 'ApprovalRequests', d.id), {
          status: 'approved',
          adminId: currentAdmin?.id,
          processedAt: serverTimestamp()
        });
      }

      const targetEmp = nhanViens.find(e => e.empId === log.empId || e.id === log.empId);
      const recipientId = targetEmp ? targetEmp.id : log.empId;
      
      await addDoc(collection(db, 'Notifications'), {
        recipientId: recipientId,
        locationId: log.locationId,
        title: 'Yêu cầu được duyệt',
        message: `Giờ công ngày ${log.date} của bạn đã được duyệt bởi ${currentAdmin?.email.split('@')[0]}.`,
        type: 'approval',
        priority: 'low',
        isRead: false,
        createdAt: serverTimestamp(),
        senderId: currentAdmin?.id,
        relatedId: log.id
      });

      await logAction('Duyệt giờ công', log.empId, `Duyệt giờ công ngoài lịch cho ${log.empId} ngày ${log.date}`);
      toast.success('Đã duyệt giờ công thành công', { id: loadingToast });
      await fetchInitialData(filterMonth, true);
    } catch (error) {
      console.error(error);
      toast.error('Lỗi khi duyệt giờ công', { id: loadingToast });
    }
  };

  const handleDeleteAttendance = async (log: Timesheet) => {
    if (!currentAdmin) return;
    
    if (currentAdmin?.role !== 'SuperAdmin' && log.createdByAdminId !== currentAdmin?.id) {
      toast.error('Bạn không có quyền xóa bản ghi này (chỉ người tạo mới có quyền xóa)');
      return;
    }

    openConfirmModal(
      'Xác nhận xóa',
      'Bạn có chắc chắn muốn xóa bản ghi chấm công này?',
      async () => {
        const loadingToast = toast.loading('Đang xóa bản ghi...');
        try {
          await deleteDoc(doc(db, 'timesheets', log.id));
          await logAction('Xóa', 'Chấm công', `Xóa bản ghi chấm công của nhân viên (Mã: ${log.empId}) ngày ${log.date}`);
          toast.success('Xóa bản ghi thành công', { id: loadingToast });
          await fetchInitialData(filterMonth, true);
        } catch (error) {
          console.error(error);
          toast.error('Lỗi khi xóa bản ghi', { id: loadingToast });
        }
      }
    );
  };

  return {
    showManualCheckin, setShowManualCheckin,
    manualCheckinData, setManualCheckinData,
    showEditAttendanceModal, setShowEditAttendanceModal,
    editingAttendance, setEditingAttendance,
    manualAttendance, setManualAttendance,
    handleManualAttendance,
    handleUpdateAttendance,
    handleApproveAttendance,
    handleDeleteAttendance
  };
};
