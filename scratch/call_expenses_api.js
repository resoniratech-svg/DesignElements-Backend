async function test() {
  try {
    const loginRes = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@erp.com', password: 'Admin@123' })
    });
    const loginData = await loginRes.json();
    const token = loginData.data.token;
    
    const expRes = await fetch('http://localhost:5000/api/v1/expenses', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const expData = await expRes.json();
    const formatted = expData.data.map(e => ({
      id: e.id,
      category: e.category,
      description: e.description,
      total_amount: e.total_amount,
      allocation_type: e.allocation_type,
      approval_status: e.approval_status,
      allocations: e.allocations
    }));
    console.log("ALL EXPENSES DATA:", JSON.stringify(formatted, null, 2));
  } catch (err) {
    console.error(err);
  }
}
test();
