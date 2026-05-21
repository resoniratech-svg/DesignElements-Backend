import { Request, Response } from "express";
import { pool } from "../../config/db";
import { success, error } from "../../utils/response";
import { AccessGuard } from "../../services/accessGuard.service";

export const createProject = async (req: Request, res: Response) => {
  try {
    const {
      client_id,
      client_name,
      project_name,
      contract_value,
      start_date,
      end_date,
      manager,
      manager_id,
      description,
      division,
      status,
      uploaded_document
    } = req.body;

    // ✅ Input validation
    if (!project_name || !contract_value) {
      return error(res, "project_name and contract_value are required", 400);
    }

    if (contract_value <= 0) {
      return error(res, "Contract value must be greater than 0", 400);
    }

    // ✅ mapping: Ensure client_id points to a record in the 'users' table
    // (Since projects.client_id has a foreign key to users.id, not clients.id)
    let target_user_id = Number(client_id);
    if (target_user_id) {
        const userRoleCheck = await pool.query(
          `SELECT id FROM users WHERE id = $1 AND role_id = (SELECT id FROM roles WHERE name = 'CLIENT')`,
          [target_user_id]
        );

        if (userRoleCheck.rows.length === 0) {
          // If not a direct user ID, check if it's a client ID from the 'clients' table
          const clientMap = await pool.query(`SELECT user_id FROM clients WHERE id = $1`, [target_user_id]);
          if (clientMap.rows.length > 0 && clientMap.rows[0].user_id) {
            target_user_id = clientMap.rows[0].user_id;
            console.log(`[PROJECT_FIX] Mapped Client ID ${client_id} to User ID ${target_user_id}`);
          }
        }
    }

    const result = await pool.query(
      `INSERT INTO projects
      (client_id, client_name, project_name, contract_value, start_date, end_date, manager, manager_id, description, division, status, uploaded_document)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      RETURNING *`,
      [
        target_user_id || null,
        client_name || null,
        project_name,
        contract_value,
        start_date || null,
        end_date || null,
        manager || null,
        manager_id || null,
        description || null,
        division || null,
        status || 'Active',
        uploaded_document || null
      ]
    );

    const projectId = result.rows[0].id;

    // Trigger Notification for Manager
    if (manager_id) {
      try {
        const { createNotification } = require("../notifications/notifications.service");
        await createNotification({
          user_id: Number(manager_id),
          reference_id: projectId,
          title: "New Project Assigned",
          message: `You have been assigned as the manager for the project: ${project_name}`,
          type: "INFO"
        });
      } catch (notifErr: any) {
        console.warn("Notification for manager failed, but project created:", notifErr.message);
      }
    }

    return success(res, "Project created successfully", result.rows[0]);

  } catch (err: any) {
    console.error(err);
    return error(res, err.message || "Unknown Server Error", 500);
  }
};
export const getProjects = async (req: Request, res: Response) => {
  try {

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const division = req.query.division as string;

    const offset = (page - 1) * limit;

    const params: any[] = [];
    
    let query = `
      SELECT
        p.id,
        p.client_id,
        u.name as client_name,
        p.project_name,
        p.contract_value,
        p.start_date,
        p.end_date,
        p.manager,
        p.manager_id,
        p.description,
        p.division,
        p.status,
        p.uploaded_document,
        p.created_at
       FROM projects p
       LEFT JOIN users u ON p.client_id = u.id AND u.role_id = (SELECT id FROM roles WHERE name = 'CLIENT')
    `;

    // ✅ Centralized Scoping
    query += ` ${AccessGuard.getScopedWhere(req.user, params, "p")}`;

    // ✅ Division/Sector Filter
    if (division && division !== 'all') {
      params.push(division);
      query += ` AND UPPER(p.division::TEXT) = UPPER($${params.length})`;
    }

    query += ` ORDER BY p.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    // Count total row - Strip LIMIT and OFFSET for the count
    const countQuery = query
      .split("ORDER BY")[0] // Remove everything from ORDER BY onwards for count
      .replace(/SELECT[\s\S]*?FROM/, "SELECT COUNT(*) as count FROM");
    
    const totalRes = await pool.query(countQuery, params.slice(0, -2));
    const total = parseInt(totalRes.rows[0].count);

    const result = await pool.query(query, params);

    return success(res, "Projects fetched successfully", {
      data: result.rows,
      total,
      page,
      limit
    });

  } catch (err: any) {
    console.error(err);
    return error(res, err.message || "Unknown Server Error", 500);
  }
};
export const getProjectById = async (req: Request, res: Response) => {
  try {

    const { id } = req.params;

    let query = `
      SELECT
        p.id,
        p.client_id,
        u.name as client_name,
        p.project_name,
        p.contract_value,
        p.start_date,
        p.end_date,
        p.manager,
        p.manager_id,
        p.description,
        p.division,
        p.status,
        p.uploaded_document,
        p.created_at
       FROM projects p
       LEFT JOIN users u ON p.client_id = u.id
       WHERE p.id = $1
    `;

    const params = [id];

    // ✅ Centralized Scoping
    query += ` ${AccessGuard.getScopedAnd(req.user, params, "p")}`;

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return error(res, "Project not found", 404);
    }

    return success(res, "Project fetched successfully", result.rows[0]);

  } catch (err: any) {

    console.error(err);
    return error(res, "Server error", 500);

  }
};

export const updateProject = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    console.log("UPDATE PROJECT ID:", id, "BODY:", req.body);
    const {
      project_name,
      client_name,
      client_id,
      contract_value,
      start_date,
      end_date,
      manager,
      manager_id,
      description,
      division,
      status,
      uploaded_document
    } = req.body;

    let target_user_id = client_id !== undefined ? (client_id ? Number(client_id) : null) : undefined;
    if (target_user_id) {
      const userRoleCheck = await pool.query(
        `SELECT id FROM users WHERE id = $1 AND role_id = (SELECT id FROM roles WHERE name = 'CLIENT')`,
        [target_user_id]
      );

      if (userRoleCheck.rows.length === 0) {
        const clientMap = await pool.query(`SELECT user_id FROM clients WHERE id = $1`, [target_user_id]);
        if (clientMap.rows.length > 0 && clientMap.rows[0].user_id) {
          target_user_id = clientMap.rows[0].user_id;
          console.log(`[PROJECT_UPDATE_FIX] Mapped Client ID ${client_id} to User ID ${target_user_id}`);
        }
      }
    }

    const pmCheck = await pool.query(
      `SELECT manager_id FROM projects WHERE id = $1`,
      [id]
    );

    // Security: PMs can only update their own projects
    if (req.user && req.user.role === 'PROJECT_MANAGER' && pmCheck.rows[0]?.manager_id !== req.user.id) {
      return error(res, "Unauthorized to update this project", 403);
    }

    const result = await pool.query(
      `UPDATE projects SET
        project_name = COALESCE($1, project_name),
        client_name = COALESCE($2, client_name),
        client_id = COALESCE($3, client_id),
        contract_value = COALESCE($4, contract_value),
        start_date = COALESCE($5, start_date),
        end_date = COALESCE($6, end_date),
        manager = COALESCE($7, manager),
        description = COALESCE($8, description),
        division = COALESCE($9, division),
        status = COALESCE($10, status),
        uploaded_document = COALESCE($11, uploaded_document),
        manager_id = COALESCE($12, manager_id)
      WHERE id = $13
      RETURNING *`,
      [
        project_name || null,
        client_name || null,
        target_user_id !== undefined ? target_user_id : null,
        contract_value || null,
        start_date || null,
        end_date || null,
        manager || null,
        description || null,
        division || null,
        status || null,
        uploaded_document || null,
        manager_id || null,
        id
      ]
    );

    if (result.rows.length === 0) {
      return error(res, "Project not found", 404);
    }

    return success(res, "Project updated successfully", result.rows[0]);

  } catch (err: any) {
    console.error(err);
    return error(res, err.message || "Unknown Server Error", 500);
  }
};

export const updateProjectStatus = async (req: Request, res: Response) => {
  try {

    const { id } = req.params;
    const { status } = req.body;

    const allowedStatus = [
      "CREATED",
      "Active",
      "Ongoing",
      "In Progress",
      "Pending",
      "MOBILIZATION",
      "MATERIAL_SUPPLY",
      "INSTALLATION",
      "COMPLETED",
      "Cancelled"
    ];

    if (!allowedStatus.includes(status)) {
      return error(res, "Invalid project status", 400);
    }

    const result = await pool.query(
      `UPDATE projects
       SET status=$1
       WHERE id=$2
       RETURNING *`,
      [status, id]
    );

    if (result.rows.length === 0) {
      return error(res, "Project not found", 404);
    }

    return success(res, "Project status updated", result.rows[0]);

  } catch (err: any) {
    console.error(err);
    return error(res, err.message || "Unknown Server Error", 500);
  }
};

export const addProjectExpense = async (req: Request, res: Response) => {
  try {

    const { id } = req.params;
    const { description, amount, expense_date } = req.body;

    // Check project exists
    const project = await pool.query(
      `SELECT id FROM projects WHERE id=$1`,
      [id]
    );

    if (project.rows.length === 0) {
      return error(res, "Project not found", 404);
    }

    const result = await pool.query(
      `INSERT INTO project_expenses
      (project_id, description, amount, expense_date)
      VALUES ($1,$2,$3,$4)
      RETURNING *`,
      [id, description, amount, expense_date]
    );

    return success(res, "Expense added successfully", result.rows[0]);

  } catch (err: any) {
    console.error(err);
    return error(res, err.message || "Unknown Server Error", 500);
  }
};
export const getProjectExpenses = async (req: Request, res: Response) => {
  try {

    const { id } = req.params;

    const result = await pool.query(
      `SELECT
        id,
        description,
        amount,
        expense_date,
        created_at
       FROM project_expenses
       WHERE project_id = $1
       ORDER BY created_at DESC`,
      [id]
    );

    return success(res, "Project expenses fetched", result.rows);

  } catch (err: any) {

    console.error(err);
    return error(res, "Server error", 500);

  }
};
export const getProjectProfit = async (req: Request, res: Response) => {
  try {

    const { id } = req.params;

    const result = await pool.query(
      `SELECT
        p.contract_value,
        COALESCE(SUM(e.amount),0) AS total_expenses
       FROM projects p
       LEFT JOIN project_expenses e
       ON p.id = e.project_id
       WHERE p.id = $1
       GROUP BY p.contract_value`,
      [id]
    );

    if (result.rows.length === 0) {
      return error(res, "Project not found", 404);
    }

    const projectValue = Number(result.rows[0].contract_value);
    const totalExpenses = Number(result.rows[0].total_expenses);

    const data = {
      project_value: projectValue,
      total_expenses: totalExpenses,
      profit: projectValue - totalExpenses
    };

    return success(res, "Project profitability calculated", data);

  } catch (err: any) {

    console.error(err);
    return error(res, "Server error", 500);

  }
};

export const deleteProject = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Delete related expenses first (foreign key)
    await pool.query(`DELETE FROM project_expenses WHERE project_id = $1`, [id]);

    // Delete the project
    const result = await pool.query(
      `DELETE FROM projects WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return error(res, "Project not found", 404);
    }

    return success(res, "Project deleted successfully", result.rows[0]);

  } catch (err: any) {
    console.error(err);
    return error(res, err.message || "Unknown Server Error", 500);
  }
};

export const getPMDashboardStats = async (req: Request, res: Response) => {
  try {
    const pm_filter = req.user?.role === 'PROJECT_MANAGER' ? 'AND manager_id = $1' : '';
    const pm_params = req.user?.role === 'PROJECT_MANAGER' ? [req.user.id] : [];

    const activeProjectsRes = await pool.query(`
      SELECT COUNT(*) as total FROM projects 
      WHERE status IN ('Active', 'In Progress', 'Pending', 'MOBILIZATION', 'MATERIAL_SUPPLY', 'INSTALLATION')
      ${pm_filter}
    `, pm_params);

    const inactiveProjectsRes = await pool.query(`
      SELECT COUNT(*) as total FROM projects 
      WHERE status IN ('COMPLETED', 'Cancelled')
      ${pm_filter}
    `, pm_params);

    const completedProjectsRes = await pool.query(`
      SELECT COUNT(*) as total FROM projects 
      WHERE status = 'COMPLETED'
      ${pm_filter}
    `, pm_params);

    const statusDistRes = await pool.query(`
      SELECT status, COUNT(*) as count FROM projects 
      WHERE 1=1 ${pm_filter}
      GROUP BY status
    `, pm_params);

    const jobStats = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE j.status NOT IN ('Completed', 'Delivered')) as ongoing_jobs,
        COUNT(*) FILTER (WHERE j.status IN ('Completed', 'Delivered')) as completed_jobs,
        COUNT(*) FILTER (WHERE j.status <> 'Completed' AND j.due_date < NOW()) as overdue_tasks
      FROM jobs j
      LEFT JOIN projects p ON j.project_id = p.id
      WHERE 1=1 ${pm_filter ? 'AND p.manager_id = $1' : ''}
    `, pm_params);

    const recentJobs = await pool.query(`
      SELECT j.*, p.project_name
      FROM jobs j
      LEFT JOIN projects p ON j.project_id = p.id
      WHERE 1=1 ${pm_filter ? 'AND p.manager_id = $1' : ''}
      ORDER BY j.created_at DESC
      LIMIT 10
    `, pm_params);

    const stats = {
      activeProjects: Number(activeProjectsRes.rows[0]?.total || 0),
      inactiveProjects: Number(inactiveProjectsRes.rows[0]?.total || 0),
      completedProjects: Number(completedProjectsRes.rows[0]?.total || 0),
      ongoingJobs: Number(jobStats.rows[0]?.ongoing_jobs || 0),
      completedJobs: Number(jobStats.rows[0]?.completed_jobs || 0),
      overdueTasks: Number(jobStats.rows[0]?.overdue_tasks || 0)
    };

    const projectDistribution = statusDistRes.rows.map(r => ({
      name: r.status,
      value: Number(r.count)
    }));

    return success(res, "PM Dashboard stats fetched", {
      stats,
      projectDistribution,
      recentJobs: recentJobs.rows
    });

  } catch (err: any) {
    console.error(err);
    return error(res, err.message || "Unknown Server Error", 500);
  }
};
