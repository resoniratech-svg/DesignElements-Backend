const jwt = require('jsonwebtoken');
const http = require('http');

const token = jwt.sign({ userId: 1, role: 'SUPER_ADMIN' }, 'supersecretkey');

const payload = JSON.stringify({
  project_name: "test project",
  client_name: "bhanu",
  client_id: null,
  contract_value: 5000,
  start_date: "2026-04-06",
  end_date: "2026-04-15",
  manager: "prakash",
  description: null,
  division: "contracting"
});

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/projects',
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload)
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

req.write(payload);
req.end();
