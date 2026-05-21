const jwt = require('jsonwebtoken');

const token = jwt.sign(
  {
    userId: 1,
    role: 'SUPER_ADMIN',
    division: 'all'
  },
  'supersecretkey',
  { expiresIn: '1d' }
);

async function test() {
  const res = await fetch('http://localhost:5000/api/v1/expenses', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  const data = await res.json();
  const item = data.data[0];
  console.log('FIRST ITEM IN API RESPONSE:');
  console.log('id:', item.id);
  console.log('category:', item.category);
  console.log('description:', item.description);
  console.log('date:', item.date);
  console.log('date typeof:', typeof item.date);
  console.log('created_at:', item.created_at);
}

test().catch(console.error);
