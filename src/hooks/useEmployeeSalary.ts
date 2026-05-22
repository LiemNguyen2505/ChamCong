import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { calculateNetSalary } from '../utils/salaryCalculator';

export const useEmployeeSalary = (
  loggedInEmployee: any,
  monthTimesheets: any[],
  payrollAdjustments: any[],
  holidays: any[],
  targetMonth?: string,
  violations: any[] = []
) => {
  const [monthlyStats, setMonthlyStats] = useState<any>({
    totalHours: 0,
    baseSalaryTotal: 0,
    latePenaltyTotal: 0,
    phonePenaltyTotal: 0,
    actualSalary: 0
  });
  const [branchStats, setBranchStats] = useState<Record<string, any>>({});
  const [activeBranches, setActiveBranches] = useState<string[]>([]);

  useEffect(() => {
    const filterMonth = targetMonth || format(new Date(), 'yyyy-MM');
    
    if (!loggedInEmployee || !loggedInEmployee.empId) return;
    
    const empTimesheets = monthTimesheets.filter((cc: any) => 
      (cc.empId === loggedInEmployee.id || cc.empId === loggedInEmployee.empId) && 
      cc.date.startsWith(filterMonth)
    );
    
    const empViolations = violations.filter(v => 
      (v.empId === loggedInEmployee.id || v.empId === loggedInEmployee.empId) && 
      v.monthYear === filterMonth
    );
    
    // Overall stats
    const stats = calculateNetSalary(loggedInEmployee, filterMonth, empTimesheets, payrollAdjustments, holidays, {}, empViolations);
    setMonthlyStats(stats);
    
    // Determine branches
    const branches = Array.from(new Set(empTimesheets.map((cc: any) => cc.locationId).filter(Boolean))) as string[];
    setActiveBranches(branches);
    
    // Stats per branch
    const bStats: Record<string, any> = {};
    branches.forEach(branch => {
      const branchTimesheets = empTimesheets.filter((cc: any) => cc.locationId === branch);
      const branchViolations = empViolations.filter((v: any) => v.locationId === branch);
      bStats[branch] = calculateNetSalary(loggedInEmployee, filterMonth, branchTimesheets, payrollAdjustments, holidays, {}, branchViolations);
    });
    setBranchStats(bStats);
    
  }, [monthTimesheets, loggedInEmployee, holidays, payrollAdjustments, targetMonth, violations]);

  return { monthlyStats, branchStats, activeBranches };
};

