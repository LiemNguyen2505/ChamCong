import { useState, useEffect, useCallback } from 'react';
import { db } from '../firebase';
import { doc, setDoc, addDoc, collection, serverTimestamp, increment } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { Employee, AdminAccount } from '../types/admin';
import { formatCurrency } from '../utils/currency';

interface UseAdminMaterialLossProps {
  nhanViens: Employee[];
  payrollActiveBranch: string;
  filterMonth: string;
  allEmployeeSalaryStatsMap: Record<string, any>;
  currentAdmin: AdminAccount | null;
  fetchInitialData: (month?: string, force?: boolean) => Promise<any>;
}

export const useAdminMaterialLoss = ({
  nhanViens,
  payrollActiveBranch,
  filterMonth,
  allEmployeeSalaryStatsMap,
  currentAdmin,
  fetchInitialData
}: UseAdminMaterialLossProps) => {
  const [showMaterialLossModal, setShowMaterialLossModal] = useState(false);
  const [showOtherDeductionsModal, setShowOtherDeductionsModal] = useState(false);
  
  const [lossType, setLossType] = useState<'general' | 'individual'>('general');
  const [itemType, setItemType] = useState('');
  const [originalPrice, setOriginalPrice] = useState('');
  const [deductionPrice, setDeductionPrice] = useState(0);
  const [quantity, setQuantity] = useState('');
  const [totalLossAmount, setTotalLossAmount] = useState('');
  const [totalLossItems, setTotalLossItems] = useState('');
  const [isProcessingLoss, setIsProcessingLoss] = useState(false);

  const [weightedEmployees, setWeightedEmployees] = useState<{
    id: string, 
    empId: string, 
    fullName: string, 
    totalHours: number, 
    weight: number, 
    checked: boolean
  }[]>([]);

  useEffect(() => {
    if (showMaterialLossModal || showOtherDeductionsModal) {
      const branchEmployees = nhanViens.filter(emp => 
        payrollActiveBranch === 'All' || 
        emp.locationId === payrollActiveBranch || 
        (Array.isArray(emp.locationIds) && emp.locationIds.includes(payrollActiveBranch))
      );
      const employeesWithWeights = branchEmployees.map(emp => {
        const stats = allEmployeeSalaryStatsMap[emp.id] || { totalHours: 0 };
        const totalHours = stats.totalHours || 0;
        
        return {
          id: emp.id,
          empId: emp.empId,
          fullName: emp.fullName,
          totalHours,
          weight: totalHours >= 200 ? 1 : 0.5,
          checked: true
        };
      }).filter(emp => emp.totalHours > 0);
      setWeightedEmployees(employeesWithWeights);
      setItemType('');
      setOriginalPrice('');
      setQuantity('');
    }
  }, [showMaterialLossModal, showOtherDeductionsModal, nhanViens, allEmployeeSalaryStatsMap, payrollActiveBranch]);

  const handleSelectItemType = (name: string) => {
    setItemType(name);
  };

  const handleProcessMaterialLoss = async () => {
    if (!itemType) {
      toast.error('Vui lòng nhập tên dụng cụ');
      return;
    }
    if (!totalLossAmount || isNaN(Number(totalLossAmount)) || Number(totalLossAmount) <= 0) {
      toast.error('Vui lòng nhập số tiền hợp lệ');
      return;
    }

    const activeWeightedEmployees = weightedEmployees.filter(e => e.checked);
    if (activeWeightedEmployees.length === 0) {
      toast.error('Vui lòng chọn ít nhất một nhân viên để khấu trừ');
      return;
    }

    setIsProcessingLoss(true);
    const loadingToast = toast.loading('Đang xử lý khấu trừ dụng cụ...');
    try {
      const totalHours = activeWeightedEmployees.reduce((sum, e) => sum + e.totalHours, 0);
      const amountPerHour = totalHours > 0 ? Number(totalLossAmount) / totalHours : 0;

      const currentLossType = activeWeightedEmployees.length === 1 ? 'individual' : 'general';

      await setDoc(doc(db, 'MaterialItems', itemType), {
        name: itemType,
        price: Number(originalPrice),
        updatedAt: serverTimestamp()
      }, { merge: true });

      await addDoc(collection(db, 'MaterialLossLogs'), {
        itemType,
        originalPrice: Number(originalPrice),
        deductionPrice: Math.round(Number(originalPrice) * 0.7),
        quantity: Number(quantity),
        totalAmount: Number(totalLossAmount),
        type: currentLossType,
        branch: payrollActiveBranch || 'all',
        monthYear: filterMonth,
        processedAt: serverTimestamp(),
        affectedEmployeeCount: activeWeightedEmployees.length,
        affectedEmployees: activeWeightedEmployees.map(e => e.fullName)
      });

      const batchPromises = activeWeightedEmployees.map(async (emp) => {
        let deductionForEmp = 0;
        let note = '';
        let message = '';
        const isIndividual = currentLossType === 'individual';
        
        if (!isIndividual) {
            deductionForEmp = Math.round(amountPerHour * emp.totalHours);
            note = `Khấu trừ chung ${itemType} x${quantity} (Dựa trên ${emp.totalHours.toFixed(2)} giờ công làm việc)`;
            message = `Ghi nhận khấu trừ dụng cụ ${itemType} - Số lượng ${quantity}. Tổng giá trị chia sẻ của bạn tháng này là ${formatCurrency(deductionForEmp)} VNĐ.`;
        } else {
            deductionForEmp = Math.round(Number(totalLossAmount));
            note = `Khấu trừ riêng ${itemType} x${quantity}`;
            message = `Ghi nhận khấu trừ riêng dụng cụ ${itemType} - Số lượng ${quantity}. Tổng giá trị khấu trừ là ${formatCurrency(deductionForEmp)} VNĐ.`;
        }

        const adjId = `${emp.id}_${filterMonth}`;
        const adjRef = doc(db, 'PayrollAdjustments', adjId);
        
        await setDoc(adjRef, {
          empId: emp.id,
          monthYear: filterMonth,
          materialLoss: increment(deductionForEmp),
          materialLossShared: increment(!isIndividual ? deductionForEmp : 0),
          materialLossIndividual: increment(isIndividual ? deductionForEmp : 0),
          materialLossNote: note
        }, { merge: true });

        await addDoc(collection(db, 'Notifications'), {
          recipientId: emp.id,
          locationId: payrollActiveBranch || 'all',
          title: 'Khấu trừ vật tư',
          message: message,
          type: 'penalty',
          priority: 'medium',
          isRead: false,
          createdAt: serverTimestamp(),
          senderId: currentAdmin?.id,
          relatedId: adjId
        });
      });

      await Promise.all(batchPromises);

      toast.success('Đã xử lý khấu hao vật tư thành công!', { id: loadingToast });
      await fetchInitialData(filterMonth, true);
      setShowMaterialLossModal(false);
      setItemType('');
      setOriginalPrice('');
      setQuantity('');
    } catch (error) {
      console.error('Error processing material loss:', error);
      toast.error('Lỗi khi xử lý khấu hao vật tư', { id: loadingToast });
    } finally {
      setIsProcessingLoss(false);
    }
  };

  return {
    showMaterialLossModal,
    setShowMaterialLossModal,
    showOtherDeductionsModal,
    setShowOtherDeductionsModal,
    lossType,
    setLossType,
    itemType,
    setItemType,
    originalPrice,
    setOriginalPrice,
    deductionPrice,
    setDeductionPrice,
    quantity,
    setQuantity,
    totalLossAmount,
    setTotalLossAmount,
    totalLossItems,
    setTotalLossItems,
    isProcessingLoss,
    setIsProcessingLoss,
    weightedEmployees,
    setWeightedEmployees,
    handleSelectItemType,
    handleProcessMaterialLoss
  };
};
