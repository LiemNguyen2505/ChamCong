const fs = require('fs');

function replaceFile(path, searchStr, replaceStr) {
  if (fs.existsSync(path)) {
    let content = fs.readFileSync(path, 'utf8');
    content = content.split(searchStr).join(replaceStr);
    fs.writeFileSync(path, content);
  }
}

replaceFile('src/components/admin/AdminManagement.tsx', "fetchInitialData(undefined, true)", "fetchInitialData(undefined, ['admins'])");
replaceFile('src/components/EmployeeManagement.tsx', "fetchInitialData(undefined, true)", "fetchInitialData(undefined, ['nhanViens'])");
replaceFile('src/components/FinancialModal.tsx', "fetchInitialData(filterMonth, true)", "fetchInitialData(filterMonth, ['salaryHistories'])");
replaceFile('src/components/HolidayConfigModal.tsx', "fetchInitialData(undefined, true)", "fetchInitialData(undefined, ['holidays'])");
replaceFile('src/hooks/useAdminViolations.ts', "fetchInitialData(filterMonth, true)", "fetchInitialData(filterMonth, ['violations'])");
replaceFile('src/App.tsx', "fetchInitialData(undefined, true)", "fetchInitialData(undefined, true)"); // leave App.tsx manual refresh alone
