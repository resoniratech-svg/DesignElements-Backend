import { pool } from '../src/config/db';

const mapEmployee = (row: any) => ({
  id: row.id,
  name: row.name,
  role: row.role,
  division: row.division,
  status: row.status,
  joinedDate: row.joined_date,
  email: row.email,
  phone: row.phone,
  address: row.address,
  documents: row.documents || []
});

async function run() {
  try {
    const division = 'SERVICE';
    
    // 1. Fetch from employees table
    let empQuery = "SELECT * FROM employees";
    let params = [];
    if (division && division !== "all") {
      empQuery += " WHERE UPPER(division) = UPPER($1)";
      params.push(division);
    }
    const empResult = await pool.query(empQuery, params);
    const employees = empResult.rows;

    // 2. Fetch from users table
    let userQuery = `
      SELECT 
        id, name, email, phone, role, division, status, address,
        start_date as "joined_date"
      FROM users 
      WHERE is_deleted = false AND role != 'SUPER_ADMIN'
    `;
    if (division && division !== "all") {
      userQuery += " AND UPPER(division) = UPPER($1)";
    }
    const userResult = await pool.query(userQuery, params);
    const userEmployees = userResult.rows;

    // Combined & De-duplicate
    const combined = [...employees];
    const seenEmails = new Set(employees.map(e => e.email?.toLowerCase()).filter(Boolean));
    const seenNames = new Set(employees.map(e => e.name?.toLowerCase()).filter(Boolean));

    for (const u of userEmployees) {
      const email = u.email?.toLowerCase();
      const name = u.name?.toLowerCase();
      if (!seenEmails.has(email) && !seenNames.has(name)) {
        combined.push(u);
      }
    }

    console.log('Combined Employees count:', combined.length);
    console.log('Names:', combined.map(e => e.name));
  } catch (err: any) {
    console.log('Error:', err.message);
  } finally {
    process.exit();
  }
}

run();
