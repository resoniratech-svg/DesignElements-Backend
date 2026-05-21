const jwt = require('jsonwebtoken');
const http = require('http');

const token = jwt.sign({ userId: 1, role: 'SUPER_ADMIN' }, 'supersecretkey');

const endpoints = [
  '/api/admin/dashboard-stats',
  '/api/products',
  '/api/inventory/movements',
  '/api/inventory/sales-orders',
  '/api/health'
];

async function testEndpoint(path) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost', port: 5000, path, method: 'GET',
      headers: { 'Authorization': 'Bearer ' + token }
    };
    const req = http.request(options, res => {
      let data = '';
      res.on('data', d => { data += d; });
      res.on('end', () => {
        console.log(`PATH: ${path} | STATUS: ${res.statusCode}`);
        resolve();
      });
    });
    req.on('error', e => {
      console.log(`PATH: ${path} | ERROR: ${e.message}`);
      resolve();
    });
    req.end();
  });
}

async function runTests() {
  for (const endpoint of endpoints) {
    await testEndpoint(endpoint);
  }
}

runTests();
