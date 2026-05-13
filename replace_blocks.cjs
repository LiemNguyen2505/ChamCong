const fs = require('fs');

const content = fs.readFileSync('src/components/AdminView.tsx', 'utf8');

// replace the login block
const loginStart = content.indexOf('    if (!isAuthenticated) {');
const loginEnd = content.indexOf('  return (', loginStart);

// find bangcong block
const bangCongStart = content.indexOf("{activeTab === 'bangcong' && (");
const bangCongEnd = content.indexOf("{activeTab === 'duyetgio' && ("); // the next block

// Let's modify the file content
let newContent = content;

if (loginStart !== -1 && loginEnd !== -1) {
  const loginReplacement = `    if (!isAuthenticated) {
      return (
        <AdminLogin
          adminLoginId={adminLoginId} setAdminLoginId={setAdminLoginId}
          loginIdError={loginIdError} showLoginPin={showLoginPin} setShowLoginPin={setShowLoginPin}
          password={password} setPassword={setPassword} pinError={pinError}
          loading={loading} handleLogin={handleLogin} handleGoogleLogin={handleGoogleLogin}
          navigate={navigate} adminTheme={adminTheme} filterBranch={filterBranch}
        />
      );
    }
`;
  newContent = 
    newContent.substring(0, loginStart) + 
    loginReplacement + 
    newContent.substring(loginEnd);
}

const bcStartPattern = "{activeTab === 'bangcong' && (";
const searchIdx = newContent.indexOf(bcStartPattern);
if (searchIdx !== -1) {
  // Let's find the closing tag safely
  const nextTagIdx = newContent.indexOf("{activeTab === 'duyetgio' && (", searchIdx);
  if (nextTagIdx !== -1) {
    newContent = newContent.substring(0, searchIdx) + newContent.substring(nextTagIdx);
  }
}

// Ensure AdminLogin is imported
newContent = newContent.replace("import { ApprovalSection } from './ApprovalSection';", "import { ApprovalSection } from './ApprovalSection';\nimport { AdminLogin } from './admin/AdminLogin';");

fs.writeFileSync('src/components/AdminView.tsx', newContent);
console.log("Replaced login and dead code");
