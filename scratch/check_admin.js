const http = require('http');

// First login to get token
const loginData = JSON.stringify({ email: 'admin@erp.com', password: 'admin123' });

const loginReq = http.request({
  hostname: 'localhost',
  port: 5000,
  path: '/api/auth/login',
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
}, (loginRes) => {
  let data = '';
  loginRes.on('data', (chunk) => { data += chunk; });
  loginRes.on('end', () => {
    try {
      const result = JSON.parse(data);
      console.log('Login result:', result.success ? 'SUCCESS' : 'FAILED');
      const token = result.data ? result.data.token : null;
      console.log('Got token:', token ? 'YES' : 'NO');

      if (!token) {
        console.log('Login failed response:', data);
        return;
      }

      // Now fetch documents with token
      const docReq = http.request({
        hostname: 'localhost',
        port: 5000,
        path: '/api/pro/documents/all',
        method: 'GET',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      }, (docRes) => {
        let docData = '';
        docRes.on('data', (chunk) => { docData += chunk; });
        docRes.on('end', () => {
          try {
            const docs = JSON.parse(docData);
            if (Array.isArray(docs)) {
              console.log(`\nTotal documents: ${docs.length}`);
              const expiring = docs.filter(d => d.status === 'Expiring Soon');
              const expired = docs.filter(d => d.status === 'Expired');
              const active = docs.filter(d => d.status === 'Active');
              console.log(`Expiring Soon: ${expiring.length}`);
              console.log(`Expired: ${expired.length}`);
              console.log(`Active: ${active.length}`);
              console.log('\nExpiring Soon Docs:');
              expiring.forEach(d => {
                console.log(`  [${d.status}] ${d.clientName} - ${d.name} (${d.number}) - expires: ${d.expiryDate}`);
              });
            } else {
              console.log('Response:', JSON.stringify(docs, null, 2));
            }
          } catch (e) {
            console.log('Raw:', docData);
          }
        });
      });
      docReq.on('error', console.error);
      docReq.end();
    } catch (e) {
      console.log('Login parse error:', e.message, data);
    }
  });
});

loginReq.on('error', console.error);
loginReq.write(loginData);
loginReq.end();
