const fs = require('fs');
let content = fs.readFileSync('src/components/AdminDashboard.jsx', 'utf8');

// Find the start of handleDownloadExcel
const startIdx = content.indexOf('const handleDownloadExcel = () => {');
// Find the end of handleDownloadAllExcel
const endMarker = 'const handleDeleteSelected = async () => {';
const endIdx = content.indexOf(endMarker);

if (startIdx !== -1 && endIdx !== -1) {
  const newFunctions = `const handleDownloadExcel = () => {
    const criteriaLabels = criteria.map(c => c.label);
    const headers = ['심사위원', '부서', ...criteriaLabels, '총점'];
    
    const rows = results.map(r => {
      const scores = criteria.map(c => r[c.id] || 0);
      return [r.name, selectedDept || '전체', ...scores, r.total];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\\n');

    const bom = '\\uFEFF';
    const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', \`평가결과_\${date}_\${selectedDept || '전체'}.csv\`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadAllExcel = async () => {
    try {
      const res = await fetch(\`http://101.79.29.163:3001/api/admin/results?department=전체&date=\${date}\`);
      const data = await res.json();
      if (data.results) {
        const criteriaLabels = criteria.map(c => c.label);
        const headers = ['심사위원', '부서', ...criteriaLabels, '총점'];
        
        const rows = data.results.map(r => {
          const scores = criteria.map(c => r[c.id] || 0);
          return [r.name, r.department_name || '부서', ...scores, r.total];
        });

        const csvContent = [
          headers.join(','),
          ...rows.map(row => row.join(','))
        ].join('\\n');

        const bom = '\\uFEFF';
        const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', \`전체_평가결과_\${date}.csv\`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (e) {
      console.error(e);
      alert('전체 데이터를 불러오는데 실패했습니다.');
    }
  };

  `;
  content = content.substring(0, startIdx) + newFunctions + content.substring(endIdx);
  fs.writeFileSync('src/components/AdminDashboard.jsx', content, 'utf8');
  console.log('Fixed!');
} else {
  console.log('Could not find markers');
}
