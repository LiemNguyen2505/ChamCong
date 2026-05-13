const fs = require('fs');

const content = fs.readFileSync('src/components/AdminView.tsx', 'utf8');
const startPattern = 'export default function AdminView({';
const startIndex = content.indexOf(startPattern);
const endPattern = '    if (!isAuthenticated) {';
const endIndex = content.indexOf(endPattern);

const logicContent = content.substring(content.indexOf('}) {', startIndex) + 4, endIndex);

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
const simpleConstRegex = /const ([a-zA-Z0-9_]+)\s*=\s*[^=]/g;

let refs = [];
while ((match = refRegex.exec(logicContent)) !== null) refs.push(match[1]);

let memos = [];
while ((match = memoRegex.exec(logicContent)) !== null) memos.push(match[1]);

// deduplicate
const allVars = Array.from(new Set([...states, ...funcs, ...refs, ...memos, 'adminDisplayName', 'pendingRequests', 'approvalHistory', 'historySearchTerm', 'requestTypeFilter', 'nhanViens', 'chamCongs', 'lichLamViecs', 'xinNghiPheps', 'holidays', 'filteredChamCongs', 'payrollAdjustments', 'canhBaos', 'adminTheme']));

// Some vars we know exist from globalData spreading.
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

// Toast mock if not imported
const toast: any = (() => {}) as any;
toast.loading = () => {};
toast.success = () => {};
toast.error = () => {};

export function useAdminLogic(globalData: any, fetchInitialData: any, isLoading: boolean) {
  ${logicContent.replace(/const navigate = useNavigate\(\);\n/, '')}

  return {
    navigate,
    ${allVars.filter(v => logicContent.includes(v) || v === 'currentAdmin').join(',\n    ')}
  };
}
`;

fs.mkdirSync('src/hooks', { recursive: true });
fs.writeFileSync('src/hooks/useAdminLogic.ts', hooksFile);

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
    ${allVars.filter(v => logicContent.includes(v) || v === 'currentAdmin').join(',\n    ')}
  } = logic;
  const navigate = logic.navigate;
`;

const updatedAdminView = content.substring(0, startIndex) + replacement + content.substring(endIndex);
fs.writeFileSync('src/components/AdminView_updated.tsx', updatedAdminView);
console.log("Done");
