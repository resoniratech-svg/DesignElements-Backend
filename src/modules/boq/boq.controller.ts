import { Request, Response } from "express";
import { pool } from "../../config/db";
import { success, error } from "../../utils/response";
import { AccessGuard } from "../../services/accessGuard.service";

/**
 * Helper to calculate BOQ totals from items array
 */
const calculateBOQTotals = (items: any[]) => {
    const subtotal = items.reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(item.rate || 0)), 0);
    const tax_percentage = 0; // Defaulting for now
    const tax_amount = (subtotal * tax_percentage) / 100;
    const discount = 0;
    const total_amount = subtotal + tax_amount - discount;

    return { subtotal, tax_percentage, tax_amount, discount, total_amount };
};

export const createBOQ = async (req: any, res: Response) => {
    try {
        const {
            boq_number,
            project_name,
            client_name,
            client_id,
            division,
            sector,
            items
        } = req.body;

        const final_sector = sector || division || req.user.division;

        let final_boq = boq_number;
        if (!final_boq) {
            // Auto-generate if missing
            const yearPrefix = `BOQ-${new Date().getFullYear()}-`;
            const resData = await pool.query(`
                SELECT boq_number FROM boqs 
                WHERE boq_number LIKE $1 ORDER BY boq_number DESC LIMIT 1
            `, [`${yearPrefix}%`]);

            let nextNum = 1;
            if (resData.rows.length > 0) {
                const lastBoq = resData.rows[0].boq_number;
                const lastPart = lastBoq.split('-').pop();
                const parsed = parseInt(lastPart || "");
                if (!isNaN(parsed)) nextNum = parsed + 1;
            }
            final_boq = `${yearPrefix}${nextNum.toString().padStart(4, '0')}`;
        }

        if (!project_name || !items || !Array.isArray(items)) {
            return error(res, "Missing required fields or invalid items", 400);
        }

        const totals = calculateBOQTotals(items);
        console.log("CALCULATED TOTALS:", totals);

        // ✅ mapping: Ensure client_id points to a record in the 'users' table
        let target_user_id = client_id ? Number(client_id) : null;
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
                    console.log(`[BOQ_FIX] Mapped Client ID ${client_id} to User ID ${target_user_id}`);
                }
            }
        }

        // Insert BOQ into boqs table only (storing items as JSON)
        const result = await pool.query(
            `INSERT INTO boqs 
            (boq_number, project_name, client_name, client_id, subtotal, tax_percentage, tax_amount, discount, total_amount, items, status, title, manager_id, sector, date)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'Pending', $11, $12, $13, $14)
            RETURNING *`,
            [
                final_boq,
                project_name,
                client_name,
                target_user_id || null,
                totals.subtotal,
                totals.tax_percentage,
                totals.tax_amount,
                totals.discount,
                totals.total_amount,
                JSON.stringify(items),
                project_name,
                req.user.id, // manager_id (auto-assigned)
                final_sector, // preferred from body, fallback to user's assigned
                req.body.date || new Date()
            ]
        );

        console.log("INSERT RESULT ROW:", result.rows[0]);
        return success(res, "BOQ created successfully", result.rows[0]);

    } catch (err: any) {
        console.error("CREATE BOQ ERROR:", err);
        return error(res, `Server error: ${err.message}`, 500);
    }
};

export const updateBOQ = async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const {
            project_name,
            client_name,
            client_id,
            items,
            status,
            title,
            sector
        } = req.body;

        // Fetch existing items if not provided to recalculate totals
        let finalItems = items;
        if (!finalItems) {
            const existing = await pool.query("SELECT items FROM boqs WHERE id = $1", [id]);
            if (existing.rows.length === 0) return error(res, "BOQ not found", 404);
            finalItems = existing.rows[0].items || [];
        }

        const totals = calculateBOQTotals(finalItems);

        // ✅ mapping: Ensure client_id points to a record in the 'users' table
        let target_user_id = client_id !== undefined ? (client_id ? Number(client_id) : null) : undefined;
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
                    console.log(`[BOQ_FIX] Mapped Client ID ${client_id} to User ID ${target_user_id}`);
                }
            }
        }

        const result = await pool.query(
            `UPDATE boqs 
            SET project_name = COALESCE($1, project_name),
    client_name = COALESCE($2, client_name),
    client_id = COALESCE($3, client_id),
    subtotal = $4,
    tax_percentage = $5,
    tax_amount = $6,
    discount = $7,
    total_amount = $8,
    items = $9,
    status = COALESCE($10, status),
    title = COALESCE($11, title),
    sector = COALESCE($12, sector),
    updated_at = NOW()
WHERE id = $13
            RETURNING *`,
            [
                project_name,
                client_name,
                target_user_id !== undefined ? target_user_id : null,
                totals.subtotal,
                totals.tax_percentage,
                totals.tax_amount,
                totals.discount,
                totals.total_amount,
                JSON.stringify(finalItems),
                status,
                title || project_name,
                sector,
                id
            ]
        );

        if (result.rows.length === 0) {
            return error(res, "BOQ not found", 404);
        }

        return success(res, "BOQ updated successfully", result.rows[0]);
    } catch (err: any) {
        console.error("UPDATE BOQ ERROR:", err);
        return error(res, `Server error: ${err.message}`, 500);
    }
};

export const getBOQs = async (req: any, res: Response) => {
    try {
        const { role, id: userId } = req.user;
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 10;
        const sector = req.query.sector as string;
        const offset = (page - 1) * limit;

        const params: any[] = [];
        let scopedWhere = AccessGuard.getScopedWhere(req.user, params, "b");

        // Add sector filter if provided
        if (sector && sector !== 'all') {
            params.push(sector);
            scopedWhere += ` AND UPPER(COALESCE(b.sector, '')) = UPPER($${params.length})`;
        }

        // Base query for counting
        const countQuery = `
            SELECT COUNT(*) as count 
            FROM boqs b 
            LEFT JOIN users u ON b.client_id = u.id
            ${scopedWhere}
        `;
        const totalRes = await pool.query(countQuery, params);
        const total = parseInt(totalRes.rows[0].count);

        // Base query for fetching data
        let query = `
            SELECT b.*, b.created_at as date, COALESCE(b.sector, u.sector, u.division) as resolved_sector 
             FROM boqs b 
             LEFT JOIN users u ON b.client_id = u.id
             ${scopedWhere} 
             ORDER BY b.created_at DESC
             LIMIT $${params.length + 1} OFFSET $${params.length + 2}
        `;
        params.push(limit, offset);

        const result = await pool.query(query, params);

        // Map through results to ensure total_amount is calculated from items if column is 0/null
        const boqs = result.rows.map(boq => {
            let calculatedTotal = 0;
            if (boq.items && Array.isArray(boq.items)) {
                calculatedTotal = boq.items.reduce((sum: number, item: any) =>
                    sum + (Number(item.quantity || 0) * Number(item.rate || 0)), 0);
            }
            return {
                ...boq,
                total_amount: Number(boq.total_amount) || calculatedTotal,
                sector: boq.resolved_sector || boq.sector // Ensure sector is prioritized
            };
        });

        return success(res, "BOQs fetched successfully", {
            data: boqs,
            total,
            page,
            limit
        });
    } catch (err) {
        console.error(err);
        return error(res, "Server error", 500);
    }
};

export const getBOQById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const params: any[] = [id];
        const scopedAnd = AccessGuard.getScopedAnd(req.user, params, "b");

        const result = await pool.query(
            `SELECT b.*, b.created_at as date, COALESCE(b.sector, u.sector, u.division) as resolved_sector 
             FROM boqs b 
             LEFT JOIN users u ON b.client_id = u.id
             WHERE b.id = $1 ${scopedAnd}`,
            params
        );

        if (result.rows.length === 0) {
            return error(res, "BOQ not found", 404);
        }

        const boq = result.rows[0];
        let calculatedTotal = 0;
        if (boq.items && Array.isArray(boq.items)) {
            calculatedTotal = boq.items.reduce((sum: number, item: any) =>
                sum + (Number(item.quantity || 0) * Number(item.rate || 0)), 0);
        }

        return success(res, "BOQ details fetched", {
            ...boq,
            total_amount: Number(boq.total_amount) || calculatedTotal,
            sector: boq.resolved_sector || boq.sector
        });
    } catch (err) {
        console.error(err);
        return error(res, "Server error", 500);
    }
};

export const updateBOQStatus = async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const { role } = req.user;

        console.log(`[BOQ_DEBUG] Request: ID=${id}, Status=${status}, Role=${role}`);

        if (!status) return error(res, "Missing status in request body", 400);

        // Fetch current status and trim/uppercase for robustness
        const currentBOQ = await pool.query("SELECT TRIM(status) as status FROM boqs WHERE id = $1", [id]);

        if (currentBOQ.rows.length === 0) {
            console.error(`[BOQ_DEBUG] BOQ ID ${id} not found.`);
            return error(res, `BOQ with ID ${id} not found`, 404);
        }

        const currentStatusClean = (currentBOQ.rows[0].status || "").toUpperCase();
        const nextStatusClean = status.trim().toUpperCase();
        const userRoleClean = (role || "").trim().toUpperCase();

        console.log(`[BOQ_DEBUG] Transition: ${currentStatusClean} -> ${nextStatusClean} (Role: ${userRoleClean})`);

        const isSuperAdmin = userRoleClean === 'SUPER_ADMIN' || userRoleClean === 'SUPER ADMIN';
        const isAdmin = ['ACCOUNTS', 'PROJECT_MANAGER', 'ADMIN'].includes(userRoleClean) || isSuperAdmin;

        let allowed = false;

        // ✅ SENIOR FIX: Super Admin always allowed to bypass sequence
        if (isSuperAdmin) {
            console.log(`[BOQ_DEBUG] Role is Super Admin - Workflow Bypass Granted.`);
            allowed = true;
        } else if (isAdmin) {
            // Standard Admin Workflow: PENDING -> UNDER PROCESS -> APPROVED
            if (currentStatusClean === 'PENDING' && nextStatusClean === 'UNDER PROCESS') allowed = true;
            else if (currentStatusClean === 'UNDER PROCESS' && nextStatusClean === 'APPROVED') allowed = true;
        } else if (userRoleClean === 'CLIENT') {
            // Client Workflow: Only Approve/Reject when Under Process
            if (currentStatusClean === 'UNDER PROCESS' && ['APPROVED', 'REJECTED'].includes(nextStatusClean)) allowed = true;
        }

        if (!allowed) {
            const msg = `Unauthorized transition from ${currentStatusClean} to ${nextStatusClean} for role ${userRoleClean}`;
            console.warn(`[BOQ_DEBUG] ${msg}`);
            return error(res, msg, 403);
        }

        console.log(`[BOQ_DEBUG] Executing SQL UPDATE for ID ${id}...`);
        const result = await pool.query(
            "UPDATE boqs SET status = $1, updated_at = NOW() WHERE id = $2::INT RETURNING *",
            [status, id]
        );

        if (result.rowCount === 0) {
            console.error(`[BOQ_DEBUG] SQL Update affected 0 rows for ID ${id}.`);
            return error(res, "Update failed: Record not found during transition execution.", 500);
        }

        console.log(`[BOQ_DEBUG] Successfully updated BOQ ${id} to ${status}`);
        return success(res, `BOQ status updated to ${status}`, result.rows[0]);

    } catch (err: any) {
        console.error("[BOQ_DEBUG] UNEXPECTED EXCEPTION:", err);
        return error(res, `Internal Server Error: ${err.message}`, 500);
    }
};

export const deleteBOQ = async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        await client.query("BEGIN");

        // Handle foreign keys
        await client.query("DELETE FROM boq_items WHERE boq_id = $1", [id]);

        await client.query("DELETE FROM boqs WHERE id = $1", [id]);

        await client.query("COMMIT");
        return success(res, "BOQ deleted successfully");
    } catch (err) {
        if (client) await client.query("ROLLBACK");
        console.error(err);
        return error(res, "Server error", 500);
    } finally {
        client.release();
    }
};
