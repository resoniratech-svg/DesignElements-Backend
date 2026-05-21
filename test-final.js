const jwt = require('jsonwebtoken');
const http = require('http');

const token = jwt.sign({ userId: 1, role: 'SUPER_ADMIN' }, 'supersecretkey');

const payload = {
  invoice_number: "CON-INV-PROD-001",
  division: "contracting",
  client_id: 1,
  invoice_date: "2026-04-06",
  due_date: "2026-04-20",
  subtotal: 10,
  tax_rate: 5,
  tax_amount: 0.5,
  discount: 0,
  total_amount: 10.5,
  status: "Unpaid",
  approval_status: "approved",
  items: [
    { description: "abcd", quantity: 1, unit_price: 10, amount: 10 }
  ]
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
