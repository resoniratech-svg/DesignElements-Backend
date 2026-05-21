import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware";
import { pool } from "../../config/db";

const router = Router();

router.get("/dashboard", authMiddleware, async (req: any, res) => {
  try {
    const userId = req.user.id;

    console.log(`[DASHBOARD] Fetching stats for user ID: ${userId}`);

    // Active Projects count (everything except cancelled/completed)
    const projectsRes = await pool.query(
      `SELECT COUNT(*) as count FROM projects WHERE client_id = $1 AND LOWER(TRIM(status)) NOT IN ('cancelled', 'completed')`,
      [userId]
    );

    // Total Projects count
    const totalProjectsRes = await pool.query(
      `SELECT COUNT(*) as count FROM projects WHERE client_id = $1`,
      [userId]
    );

    // BOQs count
    const boqsRes = await pool.query(
      `SELECT COUNT(*) as count FROM boqs WHERE client_id = $1`,
      [userId]
    );

    // Quotations count
    const quotationsRes = await pool.query(
      `SELECT COUNT(*) as count FROM quotations WHERE client_id = $1`,
      [userId]
    );

    // Pending billing
    const billingRes = await pool.query(
      `SELECT COALESCE(SUM(balance_amount), 0) as pending FROM invoices WHERE client_id = $1 AND LOWER(TRIM(status)) != 'paid'`,
      [userId]
    );

    // Expiring employee documents - look up client record by matching user email
    let expiringCount = 0;
    try {
      const userRes = await pool.query("SELECT email FROM users WHERE id = $1", [userId]);
      if (userRes.rows.length > 0) {
        const userEmail = userRes.rows[0].email;
        const clientRes = await pool.query("SELECT id FROM clients WHERE email = $1", [userEmail]);
        if (clientRes.rows.length > 0) {
          const clientRecordId = clientRes.rows[0].id;
          const expiringRes = await pool.query(
            `SELECT COUNT(*) as count FROM client_licenses WHERE client_id = $1 AND expiry_date <= NOW() + INTERVAL '30 days'`,
            [clientRecordId]
          );
          expiringCount = Number(expiringRes.rows[0]?.count || 0);
        }
      }
    } catch (licErr: any) {
      console.error("License check error:", licErr.message);
    }

    const stats = {
      activeProjects: Number(projectsRes.rows[0]?.count || 0),
      totalProjects: Number(totalProjectsRes.rows[0]?.count || 0),
      totalBoqs: Number(boqsRes.rows[0]?.count || 0),
      totalQuotations: Number(quotationsRes.rows[0]?.count || 0),
      pendingBilling: Number(billingRes.rows[0]?.pending || 0),
      expiringEmployees: expiringCount
    };

    console.log(`[DASHBOARD] Stats for user ${userId}:`, stats);
    res.json({ data: { stats } });
  } catch (err: any) {
    console.error("Dashboard error:", err);
    res.json({ data: { stats: { activeProjects: 0, totalProjects: 0, totalBoqs: 0, totalQuotations: 0, pendingBilling: 0, expiringEmployees: 0 } } });
  }
});

router.get("/documents", authMiddleware, async (req: any, res) => {
  try {
    const clientId = req.user.client_id;
    if (!clientId) {
      return res.json({ data: [] });
    }

    const result = await pool.query(
      `SELECT 
        cl.id,
        cl.license_type as "name",
        cl.license_type as "type",
        cl.license_number as "number",
        cl.expiry_date as "expiryDate",
        cl.document_url as "documentUrl"
      FROM client_licenses cl
      WHERE cl.client_id = $1`,
      [clientId]
    );

    const documents = result.rows.map(row => {
      const expiry = new Date(row.expiryDate);
      const now = new Date();
      let status = "Active";
      const diffTime = expiry.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 0) status = "Expired";
      else if (diffDays <= 30) status = "Expiring Soon";

      return {
        id: `lic-${row.id}`,
        name: row.name || "License",
        number: row.number,
        issueDate: "2024-01-01", 
        expiryDate: row.expiryDate,
        status: status,
        category: "Compliance",
        documentUrl: row.documentUrl
      };
    });

    const agreementResult = await pool.query(
      `SELECT 
        ca.id,
        ca.title as "name",
        ca.start_date as "startDate",
        ca.end_date as "expiryDate",
        ca.file_url as "documentUrl"
      FROM client_agreements ca
      WHERE ca.client_id = $1`,
      [clientId]
    );

    const agreementDocs = agreementResult.rows.map(row => {
      const expiry = new Date(row.expiryDate);
      const now = new Date();
      let status = "Active";
      const diffTime = expiry.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 0) status = "Expired";
      else if (diffDays <= 30) status = "Expiring Soon";

      return {
        id: `agr-${row.id}`,
        name: row.name || "Contract Agreement",
        number: "AGR-" + row.id,
        issueDate: row.startDate,
        expiryDate: row.expiryDate,
        status: status,
        category: "Contract",
        documentUrl: row.documentUrl
      };
    });

    res.json({ data: [...documents, ...agreementDocs] });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/tasks", authMiddleware, (req, res) => {
  res.json({
    data: [
      { id: "T1", title: "Renew Immigration Card", description: "Government fee payment pending", status: "In Progress", priority: "High", dueDate: "2026-04-15" },
      { id: "T2", title: "Update Signature Authorization", description: "Awaiting original QID from client", status: "Pending", priority: "Medium", dueDate: "2026-03-20" },
      { id: "T3", title: "Visa Stamping - 2 Employees", description: "Medical completed", status: "Completed", priority: "Low", dueDate: "2026-02-15" }
    ]
  });
});

router.get("/contracts", authMiddleware, (req, res) => {
  res.json({
    data: [
      { id: "C1", name: "Monthly PRO Support", billingCycle: "Monthly", amount: 2500, startDate: "2025-01-01", nextRenewalDate: "2026-04-01", status: "Active" }
    ]
  });
});


router.post("/documents/:id/upload", authMiddleware, async (req: any, res) => {
  try {
    const { id } = req.params;
    const { fileName } = req.body;
    
    if (id.startsWith('lic-')) {
      const dbId = id.replace('lic-', '');
      await pool.query(
        `UPDATE client_licenses SET document_url = $1 WHERE id = $2`,
        [fileName, dbId]
      );
    } else if (id.startsWith('agr-')) {
      const dbId = id.replace('agr-', '');
      await pool.query(
        `UPDATE client_agreements SET file_url = $1 WHERE id = $2`,
        [fileName, dbId]
      );
    }

    res.json({ success: true, message: "Document uploaded successfully" });
  } catch (error: any) {
    console.error("Upload error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/profile", authMiddleware, (req, res) => {
  res.json({
    data: {
      companyName: "ABC Trading & Contracting",
      contactPerson: "Ahmed Ali",
      email: "ahmed@abctrading.com",
      phone: "+974 5555 1234",
      address: "Building 45, Lusail Marina, Doha, Qatar"
    }
  });
});

export default router;
