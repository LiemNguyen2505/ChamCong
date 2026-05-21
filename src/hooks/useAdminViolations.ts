import { db } from '../firebase';
import { collection, doc, addDoc, deleteDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { AdminAccount, Employee } from '../types/admin';
import { format as safeFormat } from 'date-fns';

interface UseAdminViolationsProps {
  currentAdmin: AdminAccount | null;
  nhanViens: Employee[];
  filterMonth: string;
  fetchInitialData: (month?: string, force?: boolean) => Promise<any>;
  logAction: (action: string, target: string, details: string) => Promise<void>;
}

export const useAdminViolations = ({
  currentAdmin,
  nhanViens,
  filterMonth,
  fetchInitialData,
  logAction
}: UseAdminViolationsProps) => {

  const handleAddViolation = async (violation: { empId: string; type: string; date: string; note?: string }) => {
    if (!currentAdmin) return;
    try {
      const emp = nhanViens.find(nv => nv.id === violation.empId || nv.empId === violation.empId);
      const monthYear = violation.date.substring(0, 7);
      const violationRef = await addDoc(collection(db, 'Violations'), {
        ...violation,
        monthYear,
        adminId: currentAdmin.id,
        locationId: emp?.locationId || 'all',
        timestamp: serverTimestamp(),
        isConfirmed: false
      });
      
      if (emp) {
        await addDoc(collection(db, 'Notifications'), {
          recipientId: emp.id,
          locationId: emp.locationId || 'all',
          title: 'Nhắc nhở vi phạm',
          message: `Bạn được ghi nhận 01 lần nhắc nhở: ${violation.type}. Vui lòng kiểm tra Bảng Vi Phạm.`,
          type: 'violation',
          priority: 'high',
          isRead: false,
          createdAt: serverTimestamp(),
          senderId: currentAdmin.id,
          relatedId: violationRef.id
        });
      }
      
      toast.success('Ghi nhận vi phạm thành công');
      fetchInitialData(filterMonth, true); // Force refresh cache for this month
      logAction('Thêm vi phạm', emp?.fullName || violation.empId, violation.type);
    } catch (error) {
      console.error('Error adding violation:', error);
      toast.error('Lỗi khi ghi nhận vi phạm');
    }
  };

  const handleDeleteViolation = async (violationId: string, reason: string) => {
    if (!currentAdmin) return;
    const loadingToast = toast.loading('Đang xóa vi phạm...');
    try {
      const violationRef = doc(db, 'Violations', violationId);
      const violationSnap = await getDoc(violationRef);
      
      if (violationSnap.exists()) {
        const vData = violationSnap.data();
        const emp = nhanViens.find(nv => nv.id === vData.empId || nv.empId === vData.empId);
        
        await deleteDoc(violationRef);
        
        if (emp) {
          // Notify employee about the deletion and reason
          await addDoc(collection(db, 'Notifications'), {
            recipientId: emp.id,
            locationId: emp.locationId || 'all',
            title: 'Hủy bỏ vi phạm',
            message: `Vi phạm ngày ${safeFormat(vData.date, 'dd/MM')} của bạn đã được xóa. Lý do: ${reason}`,
            type: 'info',
            priority: 'medium',
            isRead: false,
            createdAt: serverTimestamp(),
            senderId: currentAdmin.id
          });
          
          logAction('Xóa vi phạm', emp.fullName, `Lý do: ${reason} (Lỗi gốc: ${vData.type})`);
        }
      }
      
      toast.success('Đã xóa vi phạm thành công', { id: loadingToast });
      fetchInitialData(filterMonth, true);
    } catch (error) {
      console.error('Error deleting violation:', error);
      toast.error('Lỗi khi xóa vi phạm', { id: loadingToast });
    }
  };

  return {
    handleAddViolation,
    handleDeleteViolation
  };
};
