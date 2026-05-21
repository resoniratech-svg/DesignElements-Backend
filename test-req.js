const jwt = require('jsonwebtoken');
const http = require('http');

const token = jwt.sign({ userId: 1, role: 'SUPER_ADMIN' }, 'supersecretkey');

const payload = JSON.stringify({
  projectName: "test project",
  client: "bhanu",
  clientId: 1,
  budget: 5000,
  manager: "prakash",
  managerId: "2",
  startDate: "2026-04-06",
  endDate: "2026-04-15",
  description: "desc",
  division: "contracting",
  status: "Pending"
});

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/projects',
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json',
    'Content-Length': payload.length
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
