import { pool } from "../../config/db";

export const proService = {
  getContracts: async () => {
    // Source 1: employees table
    const query = `
      SELECT DISTINCT ON (e.id)
        e.id,
        e.name as employee_name,
        e.role,
        e.division as "sector",
        e.joined_date as "startDate",
        e.status,
        e.qid_number,
        e.passport_number,
        u.name as client_name,
        COALESCE(u.company_name, e.company) as company_name
      FROM employees e
      LEFT JOIN users u ON (LOWER(e.company) = LOWER(u.name) OR LOWER(e.company) = LOWER(u.company_name))
      LEFT JOIN roles r ON u.role_id = r.id AND r.name = 'CLIENT'
      ORDER BY e.id, u.created_at DESC
    `;
    const result = await pool.query(query);

    const employees = result.rows.map(row => ({
      id: `EMP-${row.id}`,
      clientId: row.id,
      clientName: row.client_name || "N/A",
      companyName: row.company_name || "Design Elements",
      role: row.role || "Staff",
      sector: row.sector || "N/A",
      division: row.sector || "N/A",
      title: row.employee_name,
      startDate: row.startDate,
      endDate: null,
      status: row.status === 'Active' ? 'Active' : 'Inactive',
      type: "Staff",
      qid: row.qid_number,
      passport: row.passport_number
    }));

    return employees;
  },

  getAllDocuments: async () => {
    // Source 1: employees table
    const docQuery = `
      SELECT DISTINCT ON (e.id)
        e.id, 
        e.name as employee_name, 
        e.division as "sector",
        e.qid_number, e.qid_expiry,
        e.passport_number, e.passport_expiry,
        e.joined_date as "startDate",
        e.documents,
        e.role,
        u.name as client_name,
        COALESCE(u.company_name, e.company) as company_name
      FROM employees e
      LEFT JOIN users u ON (LOWER(e.company) = LOWER(u.name) OR LOWER(e.company) = LOWER(u.company_name))
      LEFT JOIN roles r ON u.role_id = r.id AND r.name = 'CLIENT'
      ORDER BY e.id, u.created_at DESC
    `;
    const result = await pool.query(docQuery);

    const empDocs: any[] = [];
    const now = new Date();

    for (const row of result.rows) {
      const docs = [];

      // 1. Check dedicated columns
      if (row.qid_number && row.qid_expiry) {
        docs.push({ name: "QID", number: row.qid_number, expiryDate: row.qid_expiry });
      }
      if (row.passport_number && row.passport_expiry) {
        docs.push({ name: "Passport", number: row.passport_number, expiryDate: row.passport_expiry });
      }

      // 2. Check JSON documents array if it exists
      if (row.documents) {
        try {
          const extraDocs = typeof row.documents === 'string' ? JSON.parse(row.documents) : row.documents;
          if (Array.isArray(extraDocs)) {
            extraDocs.forEach((d: any) => {
              if (d.type && d.number && d.expiryDate) {
                // Avoid duplicates with dedicated columns
                if (d.type !== "QID" && d.type !== "Passport") {
                  docs.push({ name: d.type, number: d.number, expiryDate: d.expiryDate, url: d.fileUrl });
                }
              }
            });
          }
        } catch (e) { }
      }

      for (const doc of docs) {
        const expiry = new Date(doc.expiryDate);
        const diffTime = expiry.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        let status: "Active" | "Expiring Soon" | "Expired" = "Active";
        if (diffDays < 0) {
          status = "Expired";
        } else if (diffDays <= 30) {
          status = "Expiring Soon";
        }

        empDocs.push({
          id: `emp-${row.id}-${doc.name.toLowerCase().replace(/\s+/g, '-')}`,
          clientId: row.id,
          clientName: row.employee_name,
          companyName: row.company_name || "Design Elements",
          role: row.role || "Staff",
          name: doc.name,
          type: "Employee Doc",
          number: doc.number,
          expiryDate: doc.expiryDate,
          status: status,
          category: "HR",
          sector: row.sector,
          contractStartDate: row.startDate,
          contractRenewalDate: doc.expiryDate,
          documentUrl: (doc as any).url || null
        });
      }
    }

    return empDocs;
  },

  getTasks: async (clientId?: string) => {
    // Return empty for now as tasks table doesn't exist
    return [];
  },

  runExpiryCheck: async () => {
    // This could trigger notifications in the future
    return { success: true, checked: 0, alerts: 0 };
  }
};
