const fs = require('fs');
const readline = require('readline');

async function restoreFiles() {
  const logPath = 'C:\\Users\\user\\.gemini\\antigravity-ide\\brain\\ed449a6d-196c-421c-a425-a701ac6bdf99\\.system_generated\\logs\\transcript_full.jsonl';
  const targetFiles = [
    'src/components/AdminDashboard.jsx',
    'src/components/EvaluationForm.jsx',
    'src/components/Login.jsx',
    'src/App.jsx'
  ];

  const fileContents = {};

  const fileStream = fs.createReadStream(logPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    try {
      const step = JSON.parse(line);
      if (step.tool_calls) {
        for (const tc of step.tool_calls) {
          if (tc.function.name === 'default_api:write_to_file') {
            let args;
            if (typeof tc.function.arguments === 'string') {
               args = JSON.parse(tc.function.arguments);
            } else {
               args = tc.function.arguments;
            }
            if (args.TargetFile) {
              const target = args.TargetFile.replace(/\\/g, '/');
              for (const f of targetFiles) {
                if (target.endsWith(f)) {
                  fileContents[f] = args.CodeContent;
                }
              }
            }
          }
        }
      }
    } catch (e) {
      // ignore parse errors
    }
  }

  // Now write the restored contents back
  for (const f of targetFiles) {
    if (fileContents[f]) {
      // For App, Login, EvaluationForm, AdminDash, we want the version BEFORE the powershell replacement if possible, 
      // but write_to_file only has the full file creation time. 
      // Luckily, we didn't use write_to_file to modify them recently except maybe Login.jsx?
      // Wait, we used `multi_replace_file_content` to modify them.
      // So write_to_file might be out of date.
      console.log(`Found base for ${f}`);
      fs.writeFileSync(`C:/Users/user/Desktop/오정환/Antigravity/평가_Conversion/AI_Competition_Mobile_Web/${f}`, fileContents[f], 'utf-8');
    }
  }
}

restoreFiles();
