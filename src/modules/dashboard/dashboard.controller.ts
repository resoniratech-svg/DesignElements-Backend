import { Request, Response } from "express";
import { pool } from "../../config/db";
import { success, error } from "../../utils/response";

export const getAdminDashboardStats = async (req: any, res: Response) => {
  try {
    const division = req.query.division as string;
    console.log("--- DASHBOARD STATS LOGGING START ---");
    console.log("Active Division Context:", division || 'all');
    
    let divisionFilter = "";
    let payablesDivisionFilter = ""; // Special filter for internal_expenses
    let trendDivisionFilter = ""; // For trends
    let params: any[] = [];
    if (division && division !== "all") {
      divisionFilter = " AND UPPER(division::TEXT) = UPPER($1)";
      payablesDivisionFilter = " AND EXISTS (SELECT 1 FROM expense_allocations WHERE expense_id = internal_expenses.id AND UPPER(division::TEXT) = UPPER($1))";
      trendDivisionFilter = " AND UPPER(division::TEXT) = UPPER($1)";
      params.push(division);
    }

    const runQuery = async (label: string, sql: string, p: any[]) => {
        try {
            const start = Date.now();
            const res = await pool.query(sql, p);
            console.log(`[PASS] ${label} - ${Date.now() - start}ms`);
            return res;
        } catch (err: any) {
            console.error(`[FAIL] ${label}:`, err.message);
            throw new Error(`${label}: ${err.message}`);
        }
    };

    // 1. Receivables (Unpaid Invoices)
    const receivablesRes = await runQuery("Receivables", 
      `SELECT COALESCE(SUM(balance_amount), 0) as total FROM invoices WHERE UPPER(status::TEXT) != 'PAID'${divisionFilter}`,
      params
    );

    // 2. Payables (Internal Expenses)
    const payablesRes = await runQuery("Payables",
      `SELECT COALESCE(SUM(total_amount), 0) as total FROM internal_expenses WHERE is_deleted = false AND UPPER(approval_status::TEXT) = 'APPROVED'${payablesDivisionFilter}`,
      params
    );

    // 3. Active Projects
    const projectsRes = await runQuery("ActiveProjects",
      `SELECT COUNT(*) as count FROM projects WHERE status IN ('Active', 'Ongoing', 'Pending')${divisionFilter}`,
      params
    );

    // 3.1 Inactive Projects (Completed + Cancelled)
    const inactiveProjectsRes = await runQuery("InactiveProjects",
      `SELECT COUNT(*) as count FROM projects WHERE status = 'Cancelled'${divisionFilter}`,
      params
    );

    // 3.2 Completed Projects
    const completedProjectsRes = await runQuery("CompletedProjects",
      `SELECT COUNT(*) as count FROM projects WHERE status = 'COMPLETED'${divisionFilter}`,
      params
    );

    // 4. Total Revenue
    const revenueRes = await runQuery("TotalRevenue",
      `SELECT COALESCE(SUM(total_amount), 0) as total FROM invoices WHERE 1=1${divisionFilter}`,
      params
    );

    // 5. Employee Count
    const employeesRes = await runQuery("EmployeeCount",
      `SELECT COUNT(*) as count FROM employees WHERE status = 'Active'${divisionFilter}`,
      params
    );

    // 6. Lead Conversion
    const leadsRes = await runQuery("LeadConversion",
      `SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'Converted') as converted
       FROM leads WHERE 1=1${divisionFilter}`,
      params
    );

    const totalLeads = parseInt(leadsRes.rows[0].total) || 0;
    const convertedLeads = parseInt(leadsRes.rows[0].converted) || 0;
    const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;

    // 7. Recent Invoices
    const recentInvoicesRes = await runQuery("RecentInvoices", `
      SELECT i.invoice_number, i.client_name as client, i.total_amount, i.status, i.division
      FROM invoices i
      WHERE 1=1 ${division && division !== 'all' ? 'AND UPPER(i.division::TEXT) = UPPER($1)' : ''}
      ORDER BY i.created_at DESC
      LIMIT 5
    `, division && division !== 'all' ? [division] : []);

    // 8. Lead Funnel
    const leadFunnelRes = await runQuery("LeadFunnel", `
      WITH stages AS (
        SELECT unnest(ARRAY['New', 'Contacted', 'Follow-up', 'Converted', 'Lost']) as stage
      )
      SELECT s.stage, COUNT(l.id) as count
      FROM stages s
      LEFT JOIN leads l ON s.stage = l.status ${divisionFilter.replace('division', 'l.division')}
      GROUP BY s.stage
      ORDER BY 
        CASE s.stage 
          WHEN 'New' THEN 1 
          WHEN 'Contacted' THEN 2 
          WHEN 'Follow-up' THEN 3 
          WHEN 'Converted' THEN 4 
          WHEN 'Lost' THEN 5 
        END
    `, params);

    // 9. Recent Expenses
    const recentExpensesRes = await runQuery("RecentExpenses", `
      SELECT e.id, e.description as title, u.name, 
             COALESCE(
               (SELECT string_agg(division, ', ') FROM expense_allocations WHERE expense_id = e.id),
               'PENDING'
             ) as sector,
             e.total_amount as amount, e.approval_status as status, e.date
      FROM internal_expenses e
      LEFT JOIN users u ON e.user_id = u.id
      WHERE e.is_deleted = false ${payablesDivisionFilter.replace('internal_expenses.id', 'e.id')}
      ORDER BY e.created_at DESC
      LIMIT 10
    `, params);

    // 10. Pending Payments (Top 5 Unpaid Invoices)
    const pendingPaymentsRes = await runQuery("PendingPaymentsList", `
      SELECT i.id, i.invoice_number as "invoiceNo", i.client_name as client, i.total_amount as amount, i.status, i.division, i.created_at
      FROM invoices i
      WHERE i.balance_amount > 0 ${division && division !== 'all' ? 'AND UPPER(i.division::TEXT) = UPPER($1)' : ''}
      ORDER BY i.created_at DESC
      LIMIT 5
    `, division && division !== 'all' ? [division] : []);

    // 11. Active Projects (Top 5 Active/Ongoing Projects)
    const activeProjectsListRes = await runQuery("ActiveProjectsList", `
      SELECT p.id, p.project_name as name, p.client_name as client, p.division, p.status, p.end_date as deadline,
             0 as "jobCount"
      FROM projects p
      WHERE p.status IN ('Active', 'Ongoing', 'Pending') ${division && division !== 'all' ? 'AND UPPER(p.division::TEXT) = UPPER($1)' : ''}
      ORDER BY p.created_at DESC
      LIMIT 5
    `, division && division !== 'all' ? [division] : []);

    const statsResult = {
      totalReceivables: parseFloat(receivablesRes.rows[0].total) || 0,
      totalPayables: parseFloat(payablesRes.rows[0].total) || 0,
      activeProjects: parseInt(projectsRes.rows[0].count) || 0,
      inactiveProjects: parseInt(inactiveProjectsRes.rows[0].count) || 0,
      completedProjects: parseInt(completedProjectsRes.rows[0].count) || 0,
      totalRevenue: parseFloat(revenueRes.rows[0].total) || 0,
      totalEmployees: parseInt(employeesRes.rows[0].count) || 0,
      totalLeads,
      convertedLeads,
      conversionRate: parseFloat(conversionRate.toFixed(1))
    };

    // 11. Division Performance
    const divisionPerformanceRes = await runQuery("DivisionPerformance", `
      WITH sector_revenue AS (
        SELECT division, COALESCE(SUM(total_amount), 0) as revenue
        FROM invoices
        WHERE balance_amount = 0
        GROUP BY division
      ),
      sector_expenses AS (
        SELECT ea.division, COALESCE(SUM(ea.amount), 0) as expense
        FROM internal_expenses e
        JOIN expense_allocations ea ON ea.expense_id = e.id
        WHERE UPPER(e.approval_status::TEXT) = 'APPROVED'
        GROUP BY ea.division
      ),
      sector_projects AS (
        SELECT division, COUNT(*) as count
        FROM projects
        WHERE status IN ('Active', 'Ongoing', 'Pending')
        GROUP BY division
      )
      SELECT 
        r.division, 
        r.revenue, 
        COALESCE(e.expense, 0) as expense,
        COALESCE(p.count, 0) as projects
      FROM sector_revenue r
      LEFT JOIN sector_expenses e ON UPPER(r.division::TEXT) = UPPER(e.division::TEXT)
      LEFT JOIN sector_projects p ON UPPER(r.division::TEXT) = UPPER(p.division::TEXT)
    `, []);

    const divisionPerformance = divisionPerformanceRes.rows.map(row => ({
      division: row.division,
      label: row.division?.toUpperCase() === 'TRADING' ? 'Trading Sector' : row.division?.toUpperCase() === 'CONTRACTING' ? 'Contracting Sector' : (row.division || 'General'),
      revenue: parseFloat(row.revenue),
      expense: parseFloat(row.expense),
      profit: parseFloat(row.revenue) - parseFloat(row.expense),
      projects: parseInt(row.projects),
      color: row.division?.toUpperCase() === 'TRADING' ? '#f59e0b' : '#8b5cf6'
    }));

    // 12. Revenue & Expense Trends (Last 6 Months)
    const trendsRes = await runQuery("Trends", `
      WITH month_series AS (
        SELECT 
          TO_CHAR(m, 'Mon') as month,
          DATE_TRUNC('month', m) as sort_month
        FROM generate_series(
          DATE_TRUNC('month', NOW()) - INTERVAL '11 months',
          DATE_TRUNC('month', NOW()),
          INTERVAL '1 month'
        ) m
      ),
      monthly_revenue AS (
        SELECT 
          TO_CHAR(invoice_date, 'Mon') as month,
          DATE_TRUNC('month', invoice_date) as sort_month,
          SUM(total_amount) as revenue
        FROM invoices
        WHERE balance_amount = 0
        ${trendDivisionFilter}
        GROUP BY month, sort_month
      ),
      monthly_expenses AS (
        SELECT 
          TO_CHAR(date, 'Mon') as month,
          DATE_TRUNC('month', date) as sort_month,
          SUM(total_amount) as expense
        FROM internal_expenses
        WHERE UPPER(approval_status::TEXT) = 'APPROVED'
        ${payablesDivisionFilter.replace('internal_expenses.id', 'id')}
        GROUP BY month, sort_month
      )
      SELECT 
        ms.month,
        COALESCE(r.revenue, 0) as revenue,
        COALESCE(e.expense, 0) as expense,
        (COALESCE(r.revenue, 0) - COALESCE(e.expense, 0)) as profit
      FROM month_series ms
      LEFT JOIN monthly_revenue r ON ms.month = r.month
      LEFT JOIN monthly_expenses e ON ms.month = e.month
      ORDER BY ms.sort_month ASC
    `, params);

    return success(res, "Dashboard stats fetched", {
      stats: statsResult,
      divisionPerformance,
      recentInvoices: recentInvoicesRes.rows.map(inv => ({
        id: inv.invoice_number,
        client: inv.client || 'Unknown',
        amount: parseFloat(inv.total_amount),
        status: inv.status,
        division: inv.division
      })),
      recentExpenses: recentExpensesRes.rows.map(exp => ({
        id: `EXP-${String(exp.id).split('-')[0].toUpperCase()}`,
        title: exp.title || 'Untitled Expense',
        createdBy: exp.name ? String(exp.name).trim() : 'System',
        sector: exp.sector || 'N/A',
        amount: parseFloat(exp.amount),
        status: exp.status === 'PENDING_APPROVAL' ? 'Pending' : exp.status === 'APPROVED' ? 'Approved' : exp.status === 'REJECTED' ? 'Rejected' : exp.status,
        date: exp.date
      })),
      pendingPayments: pendingPaymentsRes.rows.map(p => ({
        id: p.id,
        invoiceNo: p.invoiceNo,
        client: p.client || 'N/A',
        amount: parseFloat(p.amount),
        status: p.status,
        division: p.division
      })),
      activeProjects: activeProjectsListRes.rows.map(p => ({
        id: p.id,
        name: p.name,
        client: p.client || 'N/A',
        division: p.division,
        status: p.status,
        deadline: p.deadline ? new Date(p.deadline).toLocaleDateString() : null,
        jobCount: parseInt(p.jobCount) || 0
      })),
      leadFunnel: leadFunnelRes.rows.map(f => ({
        stage: f.stage,
        count: parseInt(f.count) || 0
      })),
      revenueTrends: trendsRes.rows.map(row => ({
        month: row.month,
        revenue: parseFloat(row.revenue),
        expense: parseFloat(row.expense),
        profit: parseFloat(row.profit)
      }))
    });

  } catch (err: any) {
    console.error("DASHBOARD STATS DIAL-IN ERROR:", err.message);
    return error(res, err.message, 500);
  }

};
