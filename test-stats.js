const jwt = require('jsonwebtoken');
const http = require('http');

const token = jwt.sign({ userId: 1, role: 'SUPER_ADMIN' }, 'supersecretkey');

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/pm/dashboard-stats',
  method: 'GET',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  }
};

const req = http.request(options, res => {
  let data = '';
  res.on('data', d => { data += d; });
  res.on('end', () => {
    console.log(`STATUS: ${res.statusCode}`);
    console.log(`RESPONSE: ${data}`);
  });
});

req.on('error', error => {
  console.error('ERROR:', error);
});

req.end();
