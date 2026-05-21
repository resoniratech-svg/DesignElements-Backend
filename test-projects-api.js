const jwt = require('jsonwebtoken');
const http = require('http');
const fs = require('fs');

const token = jwt.sign({ userId: 1, role: 'SUPER_ADMIN' }, 'supersecretkey');

function makeRequest(path) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + token
      }
    };

    const req = http.request(options, res => {
      let data = '';
      res.on('data', d => { data += d; });
      res.on('end', () => {
        resolve({ path, status: res.statusCode, data });
      });
    });

    req.on('error', error => {
      resolve({ path, status: 'NETWORK_ERROR', data: error.message });
    });

    req.end();
  });
}

async function run() {
  const reqs = [
    '/api/projects',
    '/api/invoices',
    '/api/invoices/overdue'
  ];
  const results = {};
  for (const r of reqs) {
    const res = await makeRequest(r);
    results[r] = { status: res.status, data: res.data.substring(0, 500) };
  }
  fs.writeFileSync('api_results.json', JSON.stringify(results, null, 2));
}

run();
