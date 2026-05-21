import { Timestamp } from 'firebase/firestore';

export interface Employee {
  id: string;
  empId: string;
  phone: string;
  fullName: string;
  hourlyRate: number;
  responsibilityBonus: number;
  pinCode: string;
  isFirstLogin: boolean;
  joinDate: string;
  workType?: 'Part Time' | 'Full Time';
  retainedSalaryAmount?: number;
  retainedSalaryStatus?: 'Chưa giữ' | 'Đã giữ' | 'Đã trả';
  retainedSalaryBranch?: string;
  locationId?: string;
  locationIds?: string[];
  lastSalaryReviewDate?: any;
  createdAt?: any;
  bankAccount?: string;
  notes?: string;
  defaultRole?: 'QUẦY' | 'PV';
  cccd?: string;
  shiftsPerWeek?: number;
}

export interface AdminAccount {
  id: string;
  email: string;
  role: 'SuperAdmin' | 'BranchAdmin';
  locationIds: string[];
  pin: string;
  notificationSettings?: {
    enabled: boolean;
    filterEmpId: string;
  };
}

export interface ApprovalRequest {
  id: string;
  empId: string;
  fullName: string;
  locationId: string;
  type: string;
  status: 'pending' | 'approved' | 'rejected';
  timestamp: any;
  createdAt?: any;
  details: any;
  note?: string;
  adminId?: string;
  processedAt?: any;
}

export interface PlanningGoal {
  id: string; // branchId_position
  branchId: string;
  position: 'QUẦY' | 'PV';
  goalShifts: number;
}

export interface SalaryHistory {
  id: string;
  empId: string;
  fullName: string;
  oldRate: number;
  newRate: number;
  oldBonus: number;
  newBonus: number;
  effectiveDate: any;
  reason: string;
  approvedBy: string;
}

export interface AuditLog {
  id: string;
  action: string;
  target: string;
  details: string;
  adminId: string;
  adminEmail: string;
  timestamp: any;
}

export interface Timesheet {
  id: string;
  timesheetId: string;
  date: string;
  empId: string;
  locationId: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  gpsIn?: { lat: number, lng: number } | null;
  gpsOut?: { lat: number, lng: number } | null;
  photoCheckIn?: string | null;
  photoCheckOut?: string | null;
  SaiSoGPS: number;
  AnhVaoCa: string | null;
  AnhRaCa: string | null;
  PhutPhatRoiApp: number;
  SoLanRoiApp: number;
  totalHours: number;
  totalPay: number;
  status: string; // Add this
  createdByAdminId?: string;
  incompleteTasks?: string[];
  checkoutRequiresApproval?: boolean;
  scheduledShiftEndTime?: string;
  selectedShiftEndTime?: string;
  note?: string;
  isEndTimeModified?: boolean;
  latePenaltyMinutes?: number;
  lateMinutes?: number;
  isLateExcused?: boolean;
  isAbandonedShift?: boolean;
  isOutsideSchedule?: boolean;
  outsideScheduleReason?: string;
  checkoutRejectedBy?: string;
  checkoutRejectedAt?: any;
  checkoutApprovedBy?: string;
  checkoutApprovedAt?: any;
  checkinApprovedBy?: string;
  checkinApprovedAt?: any;
}

export interface ShiftTask {
  id: string;
  content: string;
  isCompleted: boolean;
  createdBy: 'manager' | 'employee';
  isHandover?: boolean;
  handoverApproved?: boolean;
}

export interface WorkSchedule {
  id: string;
  date: string;
  empId: string;
  locationId: string;
  shiftName: string;
  startTime: string;
  endTime: string;
  status: string;
  isOff?: boolean;
  isAbsent?: boolean;
  roleInShift?: 'QUẦY' | 'PV' | 'BOTH';
  taskNote?: string;
  tasks?: ShiftTask[];
  notes?: string;
  colorLabel?: string;
}

export interface LeaveRequest {
  id: string;
  requestDate: string;
  empId: string;
  locationId: string;
  leaveDate: string;
  reason: string;
  status: 'cho_duyet' | 'da_duyet' | 'tu_choi';
}

export interface Alert {
  id: string;
  empId: string;
  fullName: string;
  locationId: string;
  timestamp: string;
  message: string;
}

export interface AppNotification {
  id: string;
  recipientId: string;
  locationId: string;
  title: string;
  message: string;
  type: 'violation' | 'salary' | 'shift' | 'system' | 'support' | 'approval' | 'penalty';
  priority?: 'low' | 'medium' | 'high';
  isRead: boolean;
  readBy?: string[];
  createdAt: any;
  senderId?: string;
  relatedId?: string;
}

export interface PayrollAdjustment {
  id: string;
  empId: string;
  monthYear: string; // "yyyy-MM"
  hourlyRate?: number;
  responsibilityBonus?: number;
  penalty: number;
  penaltyNote?: string;
  retainedSalary?: number;
  retainedSalaryNote?: string;
  retainedMonth?: string;
  retainedBranch?: string;
  returnRetainedSalary: number;
  extraAdditions: number;
  extraAdditionsNote?: string;
  advanceSalary: number;
  advanceSalaryNote?: string;
  materialLoss: number;
  materialLossNote?: string;
  ttnPercentage?: number;
  ttnPercentageNote?: string;
  overrideTtnPercentage?: number;
  overrideLatePenalty?: number;
  overrideLateMinutes?: number;
  overridePhonePenalty?: number;
  overridePhoneCount?: number;
  note: string;
}

export interface HolidayConfig {
  id: string;
  date: string; // "yyyy-MM-dd"
  name: string;
  multiplier: number;
}

export interface Violation {
  id: string;
  empId: string;
  monthYear: string; // "yyyy-MM"
  date: string; // "yyyy-MM-dd"
  type: string;
  note?: string;
  adminId: string;
  timestamp: any;
  locationId?: string;
  isConfirmed?: boolean;
  confirmedAt?: any;
  isRejected?: boolean;
  rejectedAt?: any;
}

declare global {
  interface Window {
    hasCleanedUp?: boolean;
    hasInitialBulletinLoaded?: boolean;
  }
}
