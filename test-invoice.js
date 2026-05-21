const jwt = require('jsonwebtoken');
const http = require('http');

// Use a secret that matches the backend JWT_SECRET or uses a common mock secret
const token = jwt.sign({ userId: 1, role: 'SUPER_ADMIN' }, process.env.JWT_SECRET || 'supersecretkey');

const payload = {
  invoice_number: "CON-INV-TEST-001",
  division: "contracting",
  client_id: 1, // Lusail Shop from my earlier check
  invoice_date: new Date().toISOString().split('T')[0],
  due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  subtotal: 10,
  tax_rate: 5,
  tax_amount: 0.5,
  discount: 0,
  total_amount: 10.5,
  status: "Unpaid",
  approval_status: "approved",
  lpo_no: "LPO-123",
  salesman: "vinay",
  qid: "QID 234",
  address: "karimnagar",
  ref_type: "General",
  ref_no: "REF-001",
  items: [
    {
      description: "abcd",
      quantity: 1,
      unit_price: 10,
      amount: 10
    }
  ]
};

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/invoices',
  method: 'POST',
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

req.write(JSON.stringify(payload));
req.end();
