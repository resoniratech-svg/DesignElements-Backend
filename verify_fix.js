const axios = require('axios');

async function testFilter() {
  try {
    const response = await axios.get('http://localhost:5000/api/users', {
      params: {
        role: 'CLIENT',
        sector: 'SERVICE'
      },
      headers: {
        // Need to bypass auth for local test or use a token. 
        // Since I'm testing the controller logic, I'll check if I can just call it 
        // but the route has authMiddleware.
      }
    });
    console.log('Results:', response.data.data.map(u => ({ name: u.name, division: u.division, sector: u.sector })));
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

// Instead of actual network request (which might fail due to auth), 
// I'll run a direct DB script to verify the query logic works as expected if I were to run it.
// But the best way is to check the backend logs if the dev server restarted.

console.log("Backend should have restarted with new logic.");
