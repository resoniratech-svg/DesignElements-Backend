import { pool } from '../src/config/db';

async function run() {
  try {
    const data = {
      name: 'Test Employee 1',
      role: 'Tester',
      division: 'SERVICE',
      status: 'Active',
      joined_date: new Date(),
      email: 'test1@erp.com',
      phone: '1234567890',
      address: 'Test address',
      documents: JSON.stringify([])
    };

    const result = await pool.query(
      `INSERT INTO employees 
        (name, role, division, status, joined_date, email, phone, address, documents) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
       RETURNING *`,
      [
        data.name, data.role, data.division, data.status, data.joined_date,
        data.email, data.phone, data.address, data.documents
      ]
    );
    console.log('Inserted:', result.rows[0]);
  } catch (err: any) {
    console.log('Error:', err.message);
  } finally {
    process.exit();
  }
}

run();
