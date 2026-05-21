const bcrypt = require('bcrypt');

async function test() {
  const hash = '$2b$10$r54f0X7zj3PzAsngvfFG1.FC8ArODWmreh1xeSPgRPPz0c3EjeUqC';
  
  const match1 = await bcrypt.compare('admin123', hash);
  const match2 = await bcrypt.compare('adminpassword123', hash);
  const match3 = await bcrypt.compare('Admin@123', hash);
  
  console.log('Is admin123 matching?', match1);
  console.log('Is adminpassword123 matching?', match2);
  console.log('Is Admin@123 matching?', match3);
}

test();
