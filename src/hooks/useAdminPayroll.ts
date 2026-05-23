import { useState } from 'react';
import { db } from '../firebase';
import { writeBatch, setDoc, doc, serverTimestamp, deleteField, collection, addDoc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { Employee, PayrollAdjustment } from '../types/admin';

interface UseAdminPayrollProps {
  nhanViens: Employee[];
  payrollAdjustments: any[];
  filterMonth: string;
  fetchInitialData: (month?: string, force?: boolean) => Promise<any>;
  logAction: (action: string, target: string, details: string) => Promise<void>;
  currentAdmin: any;
  payrollActiveBranch: string;
}

export const useAdminPayroll = ({
  nhanViens,
  payrollAdjustments,
  filterMonth,
  fetchInitialData,
  logAction,
  currentAdmin,
  payrollActiveBranch
}: UseAdminPayrollProps) => {
  const [localAdjustments, setLocalAdjustments] = useState<Record<string, Partial<PayrollAdjustment>>>({});
  const [undoStack, setUndoStack] = useState<Record<string, Partial<PayrollAdjustment>>[]>([]);
  const [isSavingPayroll, setIsSavingPayroll] = useState(false);

  const handlePayrollChange = (empId: string, field: keyof PayrollAdjustment, value: any) => {
    setUndoStack(prev => [...prev, localAdjustments]);
    setLocalAdjustments(prev => ({
      ...prev,
      [empId]: {
        ...prev[empId],
        [field]: value
      }
    }));
  };

  const handleUndoPayroll = () => {
    if (undoStack.length > 0) {
      const prevState = undoStack[undoStack.length - 1];
      setLocalAdjustments(prevState);
      setUndoStack(prev => prev.slice(0, -1));
    }
  };

  const handleSavePayroll = async (specificEmpId?: string, specificAdj?: any) => {
    setIsSavingPayroll(true);
    const loadingToast = toast.loading('Đang lưu bảng lương...');
    
    try {
      const targets = (specificEmpId && specificAdj) 
        ? { [specificEmpId]: specificAdj } 
        : localAdjustments;

      const targetKeys = Object.keys(targets);
      if (targetKeys.length === 0) {
        setIsSavingPayroll(false);
        toast.dismiss(loadingToast);
        return;
      }

      const batch = writeBatch(db);
      const fields = [
        'hourlyRate', 'responsibilityBonus', 'penalty', 'penaltyNote', 
        'retainedSalary', 'retainedSalaryNote', 'returnRetainedSalary',
        'extraAdditions', 'extraAdditionsNote', 'advanceSalary', 'advanceSalaryNote',
        'materialLoss', 'materialLossNote', 'ttnPercentage', 'ttnPercentageNote',
        'overrideTtnPercentage', 'note',
        'overrideLatePenalty', 'overrideLateMinutes'
      ];

      for (const keyId of targetKeys) {
        const changes = targets[keyId];
        if (!changes) continue;
        
        const emp = nhanViens.find(n => n.id === keyId || n.empId === keyId);
        if (!emp) continue;

        const matches = payrollAdjustments.filter(a => 
          (a.empId === emp.id || a.empId === emp.empId) && a.monthYear === filterMonth
        );
        const existingAdj = matches[0];
        const adjId = existingAdj?.id || `${emp.id}_${filterMonth}`;
        const adjRef = doc(db, 'PayrollAdjustments', adjId);

        const dataToSave: any = {
          empId: emp.id,
          monthYear: filterMonth,
          updatedAt: serverTimestamp()
        };

        fields.forEach(f => {
          if (changes[f as keyof PayrollAdjustment] !== undefined) {
             dataToSave[f] = (changes[f as keyof PayrollAdjustment] === null) ? deleteField() : changes[f as keyof PayrollAdjustment];
          } else if (existingAdj && existingAdj[f as keyof PayrollAdjustment] !== undefined) {
             const val = matches.find((m: any) => m[f as keyof PayrollAdjustment] !== undefined && m[f as keyof PayrollAdjustment] !== 0 && m[f as keyof PayrollAdjustment] !== '')?.[f as keyof PayrollAdjustment];
             dataToSave[f] = val !== undefined ? val : existingAdj[f as keyof PayrollAdjustment];
          }
        });

        if (changes.retainedSalary !== undefined) {
          dataToSave.retainedMonth = filterMonth;
          dataToSave.retainedBranch = payrollActiveBranch;
        }

        const empUpdates: any = {};
        let syncEmployee = false;

        if (changes.hourlyRate !== undefined && changes.hourlyRate > (emp.hourlyRate || 0)) {
           const luong = changes.hourlyRate;
           const diff = luong - (emp.hourlyRate || 0);
           const diffK = diff >= 1000 ? `${Math.round(diff / 1000)}k` : diff;
           const noteAddition = `Đã tăng ${diffK}/h từ tháng ${filterMonth}`;
           
           empUpdates.hourlyRate = luong;
           empUpdates.lastSalaryReviewDate = new Date().toISOString();
           syncEmployee = true;

           const currentAdjNote = dataToSave.note || '';
           dataToSave.note = currentAdjNote ? currentAdjNote + '\n' + noteAddition : noteAddition;
        } else if (changes.hourlyRate !== undefined) {
           empUpdates.hourlyRate = changes.hourlyRate;
           syncEmployee = true;
        }

        if (changes.responsibilityBonus !== undefined && changes.responsibilityBonus > (emp.responsibilityBonus || 0)) {
           const bonus = changes.responsibilityBonus;
           const diff = bonus - (emp.responsibilityBonus || 0);
           const diffK = diff >= 1000 ? `${Math.round(diff / 1000)}k` : diff;
           const noteAddition = `Đã tăng Đơn giá Thưởng TN ${diffK} từ tháng ${filterMonth}`;
           
           empUpdates.responsibilityBonus = bonus;
           empUpdates.lastSalaryReviewDate = new Date().toISOString();
           syncEmployee = true;

           const currentAdjNote = dataToSave.note || '';
           dataToSave.note = currentAdjNote ? currentAdjNote + '\n' + noteAddition : noteAddition;
        } else if (changes.responsibilityBonus !== undefined) {
           empUpdates.responsibilityBonus = changes.responsibilityBonus;
           syncEmployee = true;
        }

        batch.set(adjRef, dataToSave, { merge: true });
        
        // Duplicates cleanup - separate from batch because they are separate docs
        if (matches.length > 1) {
          const extraMatches = matches.filter(m => m.id !== adjId);
          extraMatches.forEach(m => batch.delete(doc(db, 'PayrollAdjustments', m.id)));
        }

        // Sync employee profile
        if (dataToSave.retainedSalary > 0) {
          empUpdates.retainedSalaryAmount = dataToSave.retainedSalary;
          empUpdates.retainedSalaryStatus = 'Đã giữ';
          empUpdates.retainedSalaryBranch = dataToSave.retainedBranch || payrollActiveBranch;
          syncEmployee = true;
        }
        if (dataToSave.returnRetainedSalary > 0) {
          empUpdates.retainedSalaryStatus = 'Đã trả';
          syncEmployee = true;
        }

        if (syncEmployee) {
          batch.update(doc(db, 'employees', emp.id), empUpdates);
        }

        const changedFields = Object.keys(changes);
        if (changedFields.length > 0) {
          const detailStr = changedFields.map(f => `${f}: ${changes[f as keyof PayrollAdjustment]}`).join(', ');
          
          await addDoc(collection(db, 'Notifications'), {
             recipientId: emp.id,
             locationId: emp.locationId || 'all',
             title: 'Cập nhật bảng lương',
             message: `Bảng lương tháng ${filterMonth} của bạn có thay đổi. Vui lòng kiểm tra lại.`,
             type: 'payroll',
             priority: 'normal',
             isRead: false,
             createdAt: serverTimestamp(),
             senderId: currentAdmin?.id
          });
          
          logAction('Cập nhật lương', emp.fullName, `Cập nhật ${filterMonth}. Fields: ${detailStr}`);
        }
      }

      await batch.commit();
      
      if (!specificEmpId) {
        setLocalAdjustments({});
        setUndoStack([]);
      } else {
        const newAdj = { ...localAdjustments };
        delete newAdj[specificEmpId];
        setLocalAdjustments(newAdj);
      }
      
      await fetchInitialData(filterMonth, true);

      toast.success('Đã lưu bảng lương thành công!', { id: loadingToast });
    } catch (error) {
      console.error(error);
      toast.error('Có lỗi xảy ra khi lưu bảng lương.', { id: loadingToast });
    } finally {
      setIsSavingPayroll(false);
    }
  };

  const checkEmployeeReview = (emp: Employee) => {
    let lastReviewDate = emp.lastSalaryReviewDate ? new Date(emp.lastSalaryReviewDate) : null;
    if (!lastReviewDate && emp.joinDate) {
      lastReviewDate = new Date(emp.joinDate);
    }
    if (!lastReviewDate) return { needsReview: false, daysSince: 0 };
    
    const today = new Date();
    const diffTime = today.getTime() - lastReviewDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    return {
      needsReview: diffDays >= 90,
      daysSince: diffDays
    };
  };

  return {
    localAdjustments,
    setLocalAdjustments,
    undoStack,
    setUndoStack,
    isSavingPayroll,
    setIsSavingPayroll,
    handlePayrollChange,
    handleUndoPayroll,
    handleSavePayroll,
    checkEmployeeReview
  };
};
