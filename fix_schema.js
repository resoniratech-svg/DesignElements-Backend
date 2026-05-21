const fs = require('fs');
const path = 'c:/Users/kanek/Downloads/Treknewsrs_1-main/prisma/schema.prisma';
let content = fs.readFileSync(path, 'utf8');
content = content.replace(/url\s+=\s+env\("DATABASE_URL"\)/, 'url = "postgresql://postgres:postgres@localhost:5433/erp_backend_restored"');
fs.writeFileSync(path, content, 'utf8');
console.log('Fixed schema.prisma');
