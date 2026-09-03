const fs = require('fs');

const fixSyntax = (file) => {
  let c = fs.readFileSync(file, 'utf8');
  
  // Fix AdminDashboard missing quotes
  c = c.replace(/label: '([^']*)', maxScore: 10, description: '([^']*)' \}\]/g, "label: '새 항목', maxScore: 10, description: '최대 10점' }]");
  c = c.replace(/\?\?\/label>/g, "</label>");
  c = c.replace(/\?\?\/button>/g, "</button>");
  c = c.replace(/\?\?\/span>/g, "</span>");
  c = c.replace(/\?\?\/p>/g, "</p>");
  c = c.replace(/\?\?\/h1>/g, "</h1>");
  c = c.replace(/\?\?\/h3>/g, "</h3>");

  // Fix EvaluationForm
  c = c.replace(/\{selectedDept \|\| '[^']*\} 珥앹젏 \?됯퇏/g, "{selectedDept || '부서'} 총점 평균");
  c = c.replace(/\{user.name\} \?\?\/span>/g, "{user.name} 님</span>");
  
  fs.writeFileSync(file, c, 'utf8');
};

fixSyntax('src/components/AdminDashboard.jsx');
fixSyntax('src/components/EvaluationForm.jsx');
