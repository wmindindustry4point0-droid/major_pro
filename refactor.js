const fs = require('fs');
const { execSync } = require('child_process');

// 1. Fix Frontend Files
const clientFiles = execSync('dir /s /b d:\\sakshi\\resume-screener\\client\\src\\*.js*').toString().split('\r\n').filter(f => f);
clientFiles.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    // Replace single quotes
    content = content.replace(/'https:\/\/hiremind-ai-4k68\.onrender\.com(.*?)'/g, '`${import.meta.env.VITE_API_URL || "http://localhost:5000"}$1`');
    // Replace backticks
    content = content.replace(/`https:\/\/hiremind-ai-4k68\.onrender\.com(.*?)`/g, '`${import.meta.env.VITE_API_URL || "http://localhost:5000"}$1`');
    fs.writeFileSync(file, content);
});

// 2. Fix Backend Files
const serverFiles = execSync('dir /s /b d:\\sakshi\\resume-screener\\server\\routes\\*.js').toString().split('\r\n').filter(f => f);
serverFiles.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/'https:\/\/hiremind-ai-1\.onrender\.com(.*?)'/g, '`${process.env.AI_SERVICE_URL || "http://127.0.0.1:5001"}$1`');
    fs.writeFileSync(file, content);
});

console.log('Environment variable refactoring complete.');
