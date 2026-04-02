const fs = require('fs');
const base = 'D:\\project\\xinghe-lab\\backend\\app';
fs.mkdirSync(base + '\\algorithms', {recursive: true});
fs.mkdirSync(base + '\\ml_models', {recursive: true});
fs.writeFileSync(base + '\\algorithms\\__init__.py', '\n');
fs.writeFileSync(base + '\\ml_models\\__init__.py', '\n');
console.log('algorithms/__init__.py:', fs.existsSync(base + '\\algorithms\\__init__.py'));
console.log('ml_models/__init__.py:', fs.existsSync(base + '\\ml_models\\__init__.py'));
