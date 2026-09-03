const fs = require('fs');
let c = fs.readFileSync('src/components/AdminDashboard.jsx', 'utf8');
c = c.replace(/    \]\.join\('\\n'\);\n\n    const csvContent = \[/g, '    const csvContent = [');
fs.writeFileSync('src/components/AdminDashboard.jsx', c, 'utf8');
