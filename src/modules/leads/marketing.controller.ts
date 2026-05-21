import { Request, Response } from "express";
import { pool } from "../../config/db";
import { success, error } from "../../utils/response";

export const getMarketingDashboardStats = async (req: any, res: Response) => {
  try {
    const { role, division: userDiv, id: userId } = req.user;
    const { division: filterDiv } = req.query;

    // RBAC: Build filter
    let whereClause = "";
    let params: any[] = [];
    
    if (role === "PROJECT_MANAGER") {
        whereClause = "WHERE division = $1 AND (assigned_to = $2 OR created_by = $3)";
        params = [userDiv, userId, userId];
    } else if (filterDiv && filterDiv !== "all") {
        // Normalize: "TRADING" -> "Trading"
        const normalizedDiv = filterDiv.toString().charAt(0).toUpperCase() + filterDiv.toString().slice(1).toLowerCase();
        whereClause = "WHERE division = $1";
        params = [normalizedDiv];
    }

    // 1. Core KPIs
    const kpiQuery = `
        SELECT 
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE status = 'Follow-up') as following_up,
            COUNT(*) FILTER (WHERE status = 'Converted') as converted,
            COUNT(*) FILTER (WHERE status = 'New') as new_leads,
            COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as recent_leads
        FROM leads
        ${whereClause}
    `;
    const kpiRes = await pool.query(kpiQuery, params);
    const kpis = kpiRes.rows[0];

    // 2. Conversion Rate
    const total = parseInt(kpis.total) || 0;
    const converted = parseInt(kpis.converted) || 0;
    const conversionRate = total > 0 ? (converted / total) * 100 : 0;

    // 3. Funnel Data (Grouped by status)
    const funnelQuery = `
      SELECT status as stage, COUNT(*) as count 
      FROM leads 
      ${whereClause}
      GROUP BY status
    `;
    const funnelResult = await pool.query(funnelQuery, params);

    // 4. Monthly Trend (Real data from created_at)
    const trendQuery = `
        SELECT TO_CHAR(created_at, 'Mon') as month, COUNT(*) as value
        FROM leads
        ${whereClause}
        GROUP BY TO_CHAR(created_at, 'Mon'), DATE_TRUNC('month', created_at)
        ORDER BY DATE_TRUNC('month', created_at) DESC
        LIMIT 6
    `;
    const trendResult = await pool.query(trendQuery, params);

    // 5. Division Breakdown (If Admin)
    let divisionData: any[] = [];
    if (role === "SUPER_ADMIN") {
        const divRes = await pool.query("SELECT division, COUNT(*) as count FROM leads GROUP BY division");
        divisionData = divRes.rows;
    }

    const stats = {
      totalLeads: total,
      followedUpLeads: parseInt(kpis.following_up),
      convertedLeads: converted,
      pendingLeads: parseInt(kpis.new_leads),
      recentLeads: parseInt(kpis.recent_leads),
      conversionRate: parseFloat(conversionRate.toFixed(2)),
      monthlyData: trendResult.rows.reverse(),
      funnelData: funnelResult.rows.map(row => ({
        stage: row.stage,
        count: parseInt(row.count)
      })),
      divisionData
    };

    return success(res, "Marketing analytics fetched", stats);
  } catch (err: any) {
    console.error("Marketing stats error:", err);
    return error(res, err.message, 500);
  }
};
