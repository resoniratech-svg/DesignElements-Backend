const axios = require('axios');
const jwt = require('jsonwebtoken');

const token = jwt.sign({ userId: 1, role: 'SUPER_ADMIN' }, 'fallback_secret', { expiresIn: '1d' });

async function testDelete() {
  try {
    const res = await axios.get('http://localhost:5000/api/invoices', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const invoices = res.data.data;
    if (invoices.length > 0) {
      const idToDelete = invoices[0].id;
      console.log(`Deleting invoice ${idToDelete}...`);
      const delRes = await axios.delete(`http://localhost:5000/api/invoices/${idToDelete}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log("Delete Response:", delRes.data);
    } else {
      console.log("No invoices found to delete.");
    }
  } catch (err) {
    console.error("Error Response:", err.response ? err.response.data : err.message);
  }
}
testDelete();
