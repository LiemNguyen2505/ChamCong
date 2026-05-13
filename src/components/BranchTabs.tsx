import React, { useMemo } from 'react';
import { AdminAccount } from '../types/admin';

interface BranchTabsProps {
  currentAdmin: AdminAccount | null;
  activeTab: string;
  payrollActiveBranch: string;
  filterBranch: string;
  setPayrollActiveBranch: (branch: string) => void;
  setFilterBranch: (branch: string) => void;
  adminTheme: any;
  compact?: boolean;
  fullWidth?: boolean;
}

export const BranchTabs: React.FC<Partial<BranchTabsProps>> = ({
  currentAdmin,
  activeTab,
  payrollActiveBranch = '',
  filterBranch = '',
  setPayrollActiveBranch,
  setFilterBranch,
  adminTheme,
  compact = false,
  fullWidth = false
}) => {
  const isSuperAdmin = currentAdmin?.role === 'SuperAdmin';
  const isBranchAdmin = currentAdmin?.role === 'BranchAdmin';

  const allowedBranches = useMemo(() => {
    if (isSuperAdmin) return ['Góc Phố', 'Phố Xanh'];
    return currentAdmin?.locationIds || [];
  }, [currentAdmin, isSuperAdmin]);

  // Branch Managers or SuperAdmins (who use header switch) can't see the tab
  if (isBranchAdmin || isSuperAdmin) return null;
  // If only one branch allowed, don't show tabs
  if (allowedBranches.length <= 1) return null;
  
  const activeBranch = activeTab === 'bangluong' ? payrollActiveBranch : filterBranch;
  const setActiveBranch = activeTab === 'bangluong' ? setPayrollActiveBranch : setFilterBranch;

  return (
    <div className={`branch-tabs-container inline-flex ${fullWidth ? 'w-full' : 'max-w-full'} bg-white p-0.5 rounded-xl border border-stone-200 shadow-sm overflow-x-auto whitespace-nowrap scrollbar-hide`}>
      {allowedBranches.map((branch) => {
        const isActive = activeBranch === branch;
        
        return (
          <button
            key={branch}
            onClick={() => {
              if (typeof setActiveBranch === 'function') {
                setActiveBranch(branch);
              } else {
                console.warn('setActiveBranch is not a function in BranchTabs. Props:', { activeTab, setPayrollActiveBranch, setFilterBranch });
              }
            }}
            className={`${fullWidth ? 'flex-1 uppercase font-black px-4 py-3' : compact ? 'px-4 py-2' : 'px-8 py-2.5'} text-[13px] rounded-lg transition-all ${
              isActive 
                ? `${adminTheme.accent} text-white shadow-lg ${adminTheme.shadow}`
                : 'text-stone-500 hover:bg-stone-50'
            }`}
          >
            {branch === 'All' ? 'TẤT CẢ' : branch.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
};
