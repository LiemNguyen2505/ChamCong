const fs = require('fs');

const content = fs.readFileSync('src/components/AdminView.tsx', 'utf8');
const lines = content.split('\n');

const startIndex = lines.findIndex(l => l.includes('export default function AdminView({'));
const endIndex = 1968; // line 1969 is 1968 in 0-indexed array

const logicContent = lines.slice(startIndex + 8, endIndex).join('\n'); // skip '}) {'

// Find all const [name, setName] 
const stateRegex = /const \[([a-zA-Z0-9_]+),\s*([a-zA-Z0-9_]+)\]\s*=\s*useState/g;
let states = [];
let match;
while ((match = stateRegex.exec(logicContent)) !== null) {
  states.push(match[1]);
  states.push(match[2]);
}

// Find all const funcName = 
const funcRegex = /const ([a-zA-Z0-9_]+)\s*=\s*(?:async\s)?(?:\([^)]*\)|[a-zA-Z0-9_]+)\s*=>/g;
let funcs = [];
while ((match = funcRegex.exec(logicContent)) !== null) {
  funcs.push(match[1]);
}

// other consts (like useMemo results and refs)
const refRegex = /const ([a-zA-Z0-9_]+)\s*=\s*useRef/g;
const memoRegex = /const ([a-zA-Z0-9_]+)\s*=\s*useMemo/g;

let refs = [];
while ((match = refRegex.exec(logicContent)) !== null) refs.push(match[1]);

let memos = [];
while ((match = memoRegex.exec(logicContent)) !== null) memos.push(match[1]);

// deduplicate
let extractedVars = Array.from(new Set([...states, ...funcs, ...refs, ...memos]));
// manual additions for things that might not be matched by regex
extractedVars.push('adminDisplayName', 'pendingRequests', 'approvalHistory', 'historySearchTerm', 'requestTypeFilter', 'nhanViens', 'chamCongs', 'lichLamViecs', 'xinNghiPheps', 'holidays', 'filteredChamCongs', 'payrollAdjustments', 'canhBaos', 'adminTheme', 'BottomNav', 'SidebarItem', 'allEmployeeSalaryStatsMap');

const hooksFile = `import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { db, auth } from '../firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc, updateDoc, getDocs, where, deleteField, getDoc, setDoc, increment, limit, writeBatch } from 'firebase/firestore';
import { format, differenceInMonths, parseISO, addMonths } from 'date-fns';
import { vi } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { useNavigate } from 'react-router-dom';
import { Employee, AdminAccount, ApprovalRequest, PlanningGoal, SalaryHistory, AuditLog, Timesheet, ShiftTask, WorkSchedule, LeaveRequest, Alert, AppNotification, PayrollAdjustment, HolidayConfig } from '../types/admin';
import { calculateNetSalary, calculateTtnPenalty, getPreviousMonthRates, roundToUnit } from '../utils/salaryCalculator';
import { LayoutDashboard, CheckCircle2, Calendar, DollarSign, TableProperties, ShieldCheck, Users, AlertCircle, HistoryIcon, X, ChevronLeft } from 'lucide-react';
import { motion } from 'motion/react';

// Toast mock if not imported
const toast: any = (() => {}) as any;
toast.loading = () => {};
toast.success = () => {};
toast.error = () => {};

export function useAdminLogic(globalData: any, fetchInitialData: any, isLoading: boolean) {
  const navigate = useNavigate();
  ${logicContent.replace(/const navigate = useNavigate\(\);\n/, '').replace(/import { motion } from 'motion\/react';\n/g, '')}

  return {
    navigate,
    ${extractedVars.filter(v => logicContent.includes(v) || v === 'currentAdmin').join(',\n    ')}
  };
}
`;

fs.writeFileSync('src/hooks/useAdminLogic.tsx', hooksFile);

// Now generate the replacement content for AdminView.tsx
const replacement = `export default function AdminView({ 
  globalData, 
  fetchInitialData, 
  isLoading: isGlobalLoading 
}: { 
  globalData: any, 
  fetchInitialData: (monthYear?: string, force?: boolean) => Promise<any>, 
  isLoading: boolean 
}) {
  const logic = useAdminLogic(globalData, fetchInitialData, isGlobalLoading);
  const {
    ${extractedVars.filter(v => logicContent.includes(v) || v === 'currentAdmin').join(',\n    ')}
  } = logic;
`;

const updatedAdminView = lines.slice(0, startIndex).join('\n') + '\n' + replacement + '\n' + lines.slice(endIndex).join('\n');
fs.writeFileSync('src/components/AdminView.tsx', updatedAdminView);
console.log("Done");
