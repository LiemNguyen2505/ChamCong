import React, { useState } from 'react';
import { db, auth } from '../firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { saveAs } from 'file-saver';
import { AdminAccount, Employee, Timesheet } from '../types/admin';

const OWNER_EMAIL = 'nguyen.thanh.liem2505@gmail.com';

interface UseAdminReportProps {
  currentAdmin: AdminAccount | null;
  chamCongs: Timesheet[];
  nhanViens: Employee[];
  allEmployeeSalaryStatsMap: Record<string, any>;
  filterMonth: string;
  filterBranch: string;
  filterBranchRef: React.MutableRefObject<string>;
}

export const useAdminReport = ({
  currentAdmin,
  chamCongs,
  nhanViens,
  allEmployeeSalaryStatsMap,
  filterMonth,
  filterBranch,
  filterBranchRef
}: UseAdminReportProps) => {
  const [isSendingReport, setIsSendingReport] = useState(false);

  const exportToCSV = () => {
    // CSV Export: Granular Report (One row per shift)
    const filteredData = chamCongs.filter(cc => 
      cc.date.startsWith(filterMonth) && 
      (filterBranch === 'All' || cc.locationId === filterBranch)
    );

    if (filteredData.length === 0) {
      toast.error('Không có dữ liệu ca làm việc để xuất CSV');
      return;
    }

    const headers = [
      'Ngày', 
      'Tên nhân viên', 
      'Mã NV', 
      'Giờ vào', 
      'Giờ ra', 
      'Địa điểm', 
      'Tổng giờ', 
      'Lương cơ bản', 
      'Phụ cấp', 
      'Vi phạm', 
      'Thực lãnh'
    ];

    const rows = filteredData.map(cc => {
      const employee = nhanViens.find(nv => nv.id === cc.empId || nv.empId === cc.empId);
      const stats = allEmployeeSalaryStatsMap[cc.empId] || { 
        currentHourlyRate: employee?.hourlyRate || 0,
        responsibilityBonus: 0,
        latePenaltyTotal: 0,
        phonePenaltyTotal: 0,
        actualSalary: 0
      };
      
      return [
        cc.date,
        employee?.fullName || 'N/A',
        cc.empId,
        cc.checkInTime || '',
        cc.checkOutTime || '',
        cc.locationId,
        cc.totalHours ? cc.totalHours.toFixed(2) : '0',
        stats.currentHourlyRate,
        stats.responsibilityBonus, // Monthly context
        (cc.PhutPhatRoiApp || 0), // Shift specific violation
        cc.totalPay ? Math.round(cc.totalPay) : 0
      ].map(val => `"${val}"`).join(',');
    });

    // UTF-8 with BOM for Excel compatibility
    const csvContent = "\uFEFF" + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `Bao_cao_chi_tiet_nhan_su_${filterBranch}_${filterMonth}.csv`);
    toast.success('Đã xuất báo cáo CSV chi tiết thành công!');
  };

  const sendToGoogleScript = async (csvData: string, subject: string, recipientEmail?: string) => {
    const scriptUrl = import.meta.env.VITE_GAS_URL;
    
    if (!scriptUrl) {
      console.error("[GAS] VITE_GAS_URL is not defined in environment variables!");
      toast.error('Chưa cấu hình URL Script gửi mail (VITE_GAS_URL). Vui lòng kiểm tra lại Settings.');
      return { success: false, actualRecipient: '' };
    }
    
    try {
      // VALIDATION: Ensure we have a REAL email, not a display name
      const isValidEmail = (email: string) => {
        if (!email || typeof email !== 'string') return false;
        // Strict check: must have @ and . and no spaces
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
      };
      
      let targetRecipient = (recipientEmail || currentAdmin?.email || '').trim();
      
      console.log(`[GAS] Validating recipient: "${targetRecipient}"`);

      // Fallback 1: If current target is not a valid email, try Auth user
      if (!isValidEmail(targetRecipient)) {
        const authEmail = auth.currentUser?.email;
        if (authEmail && isValidEmail(authEmail)) {
          console.log(`[GAS] Switching invalid recipient "${targetRecipient}" to auth email: ${authEmail}`);
          targetRecipient = authEmail;
        }
      }
      
      // Fallback 2: Hard fallback to OWNER_EMAIL
      if (!isValidEmail(targetRecipient)) {
        console.log(`[GAS] Final fallback to OWNER_EMAIL: ${OWNER_EMAIL} (Previous was: "${targetRecipient}")`);
        targetRecipient = OWNER_EMAIL;
      }

      const senderEmail = (currentAdmin?.email && isValidEmail(currentAdmin.email)) 
        ? currentAdmin.email 
        : (auth.currentUser?.email || 'admin-system@gocphoxanh.com');
      
      // Prepare JSON payload for better compatibility with complex scripts
      const payload = {
        csv: csvData,
        subject: subject,
        recipient: targetRecipient,
        email: targetRecipient,
        sender: senderEmail,
        branch: filterBranchRef.current || 'All',
        timestamp: new Date().toISOString(),
        source: 'AI Studio Build'
      };

      console.log("[GAS] Dispatching JSON payload to:", targetRecipient, "(URL:", scriptUrl, ")");
      
      await fetch(scriptUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify(payload)
      });
      
      return { success: true, actualRecipient: targetRecipient };
    } catch (error) {
      console.error("[GAS] sendToGoogleScript Error:", error);
      return { success: false, actualRecipient: '' };
    }
  };

  const handleSendMonthlyReport = async () => {
    const isAdminSuper = currentAdmin?.role === 'SuperAdmin' || currentAdmin?.email === OWNER_EMAIL;
    if (!currentAdmin || !isAdminSuper) {
      toast.error('Chỉ Super Admin mới có quyền thực hiện tính năng này');
      return;
    }

    setIsSendingReport(true);
    const reportMonth = filterMonth;
    const branchName = filterBranch;
    
    try {
      toast.loading(`Đang chuẩn bị báo cáo tháng ${reportMonth} - Chi nhánh ${branchName}...`, { id: 'send-report' });
      
      // Filter logs by month AND branch (if not 'All')
      const reportData = chamCongs.filter(cc => {
        const matchesMonth = cc.date.startsWith(reportMonth);
        const matchesBranch = branchName === 'All' || cc.locationId === branchName;
        return matchesMonth && matchesBranch;
      });
      
      if (reportData.length === 0) {
        toast.error('Sếp ơi, không có dữ liệu để báo cáo!', { id: 'send-report' });
        setIsSendingReport(false);
        return;
      }

      console.log(`[REPORT] Preparing data for ${reportData.length} records...`);

      const headers = [
        'Ngày', 
        'Tên nhân viên', 
        'Mã NV', 
        'Giờ vào', 
        'Giờ ra', 
        'Địa điểm', 
        'Tổng giờ', 
        'Lương cơ bản', 
        'Vi phạm (Shift)', 
        'Thực lãnh (Shift)'
      ];

      const escapeCSV = (valValue: any) => {
        const str = String(valValue === null || valValue === undefined ? '' : valValue);
        if (str.includes(',') || str.includes('\n') || str.includes('\"')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      const rows = reportData.map(cc => {
        const employee = nhanViens.find(nv => nv.id === cc.empId || nv.empId === cc.empId);
        return [
          escapeCSV(cc.date),
          escapeCSV(employee?.fullName || 'N/A'),
          escapeCSV(cc.empId),
          escapeCSV(cc.checkInTime || ''),
          escapeCSV(cc.checkOutTime || ''),
          escapeCSV(cc.locationId),
          escapeCSV(cc.totalHours ? cc.totalHours.toFixed(2) : '0'),
          escapeCSV(employee?.hourlyRate || 0),
          escapeCSV(cc.PhutPhatRoiApp || 0),
          escapeCSV(cc.totalPay ? Math.round(cc.totalPay) : 0)
        ].join(',');
      });

      const csvContent = [headers.join(','), ...rows].join('\n');
      const subject = `[GPX] Báo cáo nhân sự - ${branchName === 'All' ? 'Tất cả chi nhánh' : branchName} - Tháng ${reportMonth}`;
      
      console.log("[REPORT] Sending to GAS via sendToGoogleScript...");
      const { success, actualRecipient } = await sendToGoogleScript(csvContent, subject, currentAdmin.email);
      
      if (success) {
        console.log("[REPORT] Script request returned success, logging to Firestore...");
        const reportId = `Report_${branchName.replace(/\s+/g, '_')}_${reportMonth}_${Date.now()}`;
        await setDoc(doc(db, 'ReportStatus', reportId), {
          type: 'MANUAL_SEND',
          branch: branchName,
          monthYear: reportMonth,
          triggeredBy: currentAdmin.email,
          triggeredAt: serverTimestamp(),
          status: 'sent_to_gas',
          subject: subject,
          recipient: actualRecipient
        });

        toast.success(`Đã gửi báo cáo thành công! Sếp vui lòng kiểm tra hộp thư (${actualRecipient})`, { 
          id: 'send-report',
          duration: 6000 
        });
      } else {
        throw new Error("Gửi dữ liệu qua GAS thất bại (Network Error)");
      }
    } catch (error) {
      console.error("Error sending report:", error);
      toast.error('Có lỗi xảy ra khi gửi báo cáo!', { id: 'send-report' });
    } finally {
      setIsSendingReport(false);
    }
  };

  return {
    exportToCSV,
    sendToGoogleScript,
    handleSendMonthlyReport,
    isSendingReport,
    setIsSendingReport
  };
};
