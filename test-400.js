const jwt = require('jsonwebtoken');
const http = require('http');

const token = jwt.sign({ userId: 1, role: 'SUPER_ADMIN' }, 'supersecretkey');

const payload = {
  invoice_number: "CON-INV-FIX-400",
  division: "contracting",
  client_id: 99999, // Intentional bad ID
  invoice_date: "2026-04-06",
  due_date: "2026-04-20",
  total_amount: 10.5,
  items: []
};

const options = {
  hostname: 'localhost', port: 5000, path: '/api/invoices', method: 'POST',
  headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }
};

const req = http.request(options, res => {
  let data = '';
  res.on('data', d => { data += d; });
  res.on('end', () => {
    console.log(`STATUS: ${res.statusCode}`);
    console.log(`RESPONSE: ${data}`);
  });
});

req.write(JSON.stringify(payload));
req.end();
