import { Request, Response } from "express";
import { pool } from "../../config/db";
import { success, error } from "../../utils/response";
import { createNotification } from "../notifications/notifications.service";

// --- HEPLER: STAGE PROGRESSION ---
const STAGE_ORDER = ["New", "Contacted", "Follow-up", "Converted", "Lost"];
const isValidTransition = (current: string, next: string) => {
    if (next === "Lost") return true; // Can lose a lead at any stage
    const currentIndex = STAGE_ORDER.indexOf(current);
    const nextIndex = STAGE_ORDER.indexOf(next);
    return nextIndex === currentIndex + 1;
};

// --- CORE CONTROLLER ---
export const getLeads = async (req: any, res: Response) => {
    try {
        const { role, id: userId, division: userDiv } = req.user;
        const { division: filterDiv } = req.query;

        let query = `
            SELECT l.*, u.name as assigned_to_name 
            FROM leads l 
            LEFT JOIN users u ON l.assigned_to = u.id
        `;
        let params: any[] = [];
        let count = 1;

        let whereConditions: string[] = [];

        // RBAC: Super Admin gets all, PM gets division + assigned
        if (role === "PROJECT_MANAGER") {
            whereConditions.push(`l.division = $${count++}`);
            params.push(userDiv);
            whereConditions.push(`(l.assigned_to = $${count++} OR l.created_by = $${count++})`);
            params.push(userId);
            params.push(userId);
        } else if (role === "ACCOUNTS") {
            whereConditions.push("l.status = 'Converted'");
        }

        if (filterDiv && filterDiv !== "all") {
            whereConditions.push(`LOWER(l.division) = LOWER($${count++})`);
            params.push(filterDiv.toString().trim());
        }

        if (whereConditions.length > 0) {
            query += " WHERE " + whereConditions.join(" AND ");
        }

        query += " ORDER BY l.created_at DESC";

        const result = await pool.query(query, params);
        return success(res, "Leads fetched", result.rows);
    } catch (err: any) {
        return error(res, err.message, 500);
    }
};

export const getLead = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            `SELECT l.*, u.name as assigned_to_name 
             FROM leads l 
             LEFT JOIN users u ON l.assigned_to = u.id 
             WHERE l.id = $1`,
            [id]
        );
        if (result.rows.length === 0) return error(res, "Lead not found", 404);
        return success(res, "Lead details fetched", result.rows[0]);
    } catch (err: any) {
        return error(res, err.message, 500);
    }
};

export const createLead = async (req: any, res: Response) => {
    try {
        const { 
            name, company, email, phone, division, source, notes, 
            assigned_to, assignedTo, next_follow_up_date, nextFollowUpDate, 
            priority, status 
        } = req.body;
        const { id: userId, role, division: userDiv } = req.user;

        console.log("INCOMING LEAD PAYLOAD:", req.body);

        // Fallback if frontend hasn't updated yet
        const finalDivision = division || userDiv;

        // Validation
        if (!name || !email || !finalDivision) {
            return error(res, `Missing mandatory fields: ${!name ? 'Name, ' : ''}${!email ? 'Email, ' : ''}${!finalDivision ? 'Division' : ''}`, 400);
        }

        // Robust Assignment: Default to creator if invalid or missing
        const rawAssignee = assigned_to || assignedTo;
        let finalAssignee = parseInt(rawAssignee);
        if (isNaN(finalAssignee)) {
            finalAssignee = userId; // Default to creator if missing or not an integer
        }

        const finalNextFollowUpDate = next_follow_up_date || nextFollowUpDate || null;
        const finalPriority = priority || 'Medium';
        const finalStatus = status || 'New';

        console.log("FINAL ASSIGNEE ID:", finalAssignee);

        const result = await pool.query(
            `INSERT INTO leads (name, company, email, phone, status, division, source, notes, assigned_to, created_by, next_follow_up_date, priority)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
            [
                name, company, email, phone, finalStatus, finalDivision, source, notes, 
                finalAssignee, userId, finalNextFollowUpDate || null, finalPriority
            ]
        );

        // Notification
        await createNotification({
            user_id: finalAssignee,
            title: "New Lead Assigned",
            message: `You have been assigned a new lead: ${name}`,
            type: "lead_assigned",
            reference_id: result.rows[0].id
        });

        return success(res, "Lead created", result.rows[0]);
    } catch (err: any) {
        return error(res, err.message, 500);
    }
};

export const updateLeadStatus = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { status, reason_lost } = req.body;

        const leadRes = await pool.query("SELECT * FROM leads WHERE id = $1", [id]);
        if (leadRes.rows.length === 0) return error(res, "Lead not found", 404);

        const lead = leadRes.rows[0];

        // Strict Progression Check
        if (!isValidTransition(lead.status, status)) {
            return error(res, `Invalid transition: Cannot move from ${lead.status} to ${status}. Stages must be: New -> Contacted -> Follow-up -> Converted`, 400);
        }

        // Conversion require follow-up
        if (status === "Converted") {
            const followUps = await pool.query("SELECT COUNT(*) FROM lead_follow_ups WHERE lead_id = $1", [id]);
            if (parseInt(followUps.rows[0].count) === 0) {
                return error(res, "Conversion requires at least one follow-up record", 400);
            }
        }

        await pool.query(
            "UPDATE leads SET status = $1, reason_lost = $2, updated_at = NOW() WHERE id = $3",
            [status, reason_lost, id]
        );

        return success(res, "Status updated successfully");
    } catch (err: any) {
        return error(res, err.message, 500);
    }
};

export const addFollowUp = async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const { note, next_follow_up_date } = req.body;
        const userId = req.user.id;

        const result = await pool.query(
            `INSERT INTO lead_follow_ups (lead_id, user_id, note, next_follow_up_date)
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [id, userId, note, next_follow_up_date]
        );

        // Always update next follow-up date, and auto-move status to Follow-up if it was Contacted or New
        await pool.query(
            `UPDATE leads 
             SET next_follow_up_date = COALESCE($1, next_follow_up_date),
                 status = CASE WHEN status IN ('New', 'Contacted') THEN 'Follow-up' ELSE status END,
                 updated_at = NOW()
             WHERE id = $2`,
            [next_follow_up_date || null, id]
        );

        return success(res, "Follow-up added", result.rows[0]);
    } catch (err: any) {
        return error(res, err.message, 500);
    }
};

export const convertLead = async (req: any, res: Response) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        await client.query("BEGIN");

        const leadRes = await client.query("SELECT * FROM leads WHERE id = $1", [id]);
        if (leadRes.rows.length === 0) throw new Error("Lead not found");
        const lead = leadRes.rows[0];

        if (lead.status === "Converted") throw new Error("Lead already converted");

        // Verify Follow-up
        const followUps = await client.query("SELECT COUNT(*) FROM lead_follow_ups WHERE lead_id = $1", [id]);
        if (parseInt(followUps.rows[0].count) === 0) {
            throw new Error("Conversion requires at least one follow-up record");
        }

        const prefix = lead.division === "Trading" ? "TRD" : "CON";
        const latestCodeRes = await client.query(
            "SELECT client_code FROM clients WHERE client_code LIKE $1 ORDER BY client_code DESC LIMIT 1",
            [`${prefix}-%`]
        );

        let nextNumber = 1;
        if (latestCodeRes.rows.length > 0) {
            const lastCode = latestCodeRes.rows[0].client_code;
            nextNumber = parseInt(lastCode.split("-")[1]) + 1;
        }
        const clientCode = `${prefix}-${nextNumber.toString().padStart(3, '0')}`;

        // 2. Create Client
        const clientResult = await client.query(
            `INSERT INTO clients (name, email, phone, division, client_code, status, contact_person)
             VALUES ($1, $2, $3, $4, $5, 'Active', $6) RETURNING *`,
            [lead.company || lead.name, lead.email, lead.phone, lead.division, clientCode, lead.name]
        );

        // 3. Update Lead
        await client.query("UPDATE leads SET status = 'Converted', updated_at = NOW() WHERE id = $1", [id]);

        await client.query("COMMIT");
        return success(res, "Lead converted to Client successfully", { client: clientResult.rows[0] });

    } catch (err: any) {
        await client.query("ROLLBACK");
        return error(res, err.message, 500);
    } finally {
        client.release();
    }
};

export const getLeadFollowUps = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            "SELECT f.*, u.name as user_name FROM lead_follow_ups f LEFT JOIN users u ON f.user_id = u.id WHERE f.lead_id = $1 ORDER BY f.created_at DESC",
            [id]
        );
        return success(res, "Follow-ups fetched", result.rows);
    } catch (err: any) {
        return error(res, err.message, 500);
    }
};

export const updateLead = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { 
            name, company, email, phone, division, source, notes, priority,
            assigned_to, assignedTo, next_follow_up_date, nextFollowUpDate, status
        } = req.body;

        const rawAssignee = assigned_to || assignedTo;
        const finalAssignee = rawAssignee ? parseInt(rawAssignee) : undefined;
        
        let finalNextFollowUpDate = next_follow_up_date !== undefined ? next_follow_up_date : nextFollowUpDate;
        if (finalNextFollowUpDate === '') {
            finalNextFollowUpDate = null;
        }

        const hasAssignedTo = assigned_to !== undefined || assignedTo !== undefined;
        const hasNextFollowUpDate = next_follow_up_date !== undefined || nextFollowUpDate !== undefined;
        const hasStatus = status !== undefined;

        const result = await pool.query(
            `UPDATE leads 
             SET name = COALESCE($1, name), 
                 company = COALESCE($2, company), 
                 email = COALESCE($3, email), 
                 phone = COALESCE($4, phone), 
                 division = COALESCE($5, division), 
                 source = COALESCE($6, source), 
                 notes = COALESCE($7, notes),
                 priority = COALESCE($8, priority),
                 assigned_to = CASE WHEN $13::boolean THEN $9 ELSE assigned_to END,
                 next_follow_up_date = CASE WHEN $14::boolean THEN $10 ELSE next_follow_up_date END,
                 status = CASE WHEN $15::boolean THEN $11 ELSE status END,
                 updated_at = NOW() 
             WHERE id = $12 RETURNING *`,
            [
                name || null, 
                company || null, 
                email || null, 
                phone || null, 
                division || null, 
                source || null, 
                notes || null, 
                priority || null, 
                finalAssignee || null, 
                finalNextFollowUpDate || null, 
                status || null, 
                id,
                hasAssignedTo,
                hasNextFollowUpDate,
                hasStatus
            ]
        );

        if (result.rows.length === 0) return error(res, "Lead not found", 404);
        return success(res, "Lead updated successfully", result.rows[0]);
    } catch (err: any) {
        return error(res, err.message, 500);
    }
};

export const deleteLead = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        // Use a transaction to clean up follow-ups
        const client = await pool.connect();
        try {
            await client.query("BEGIN");
            await client.query("DELETE FROM lead_follow_ups WHERE lead_id = $1", [id]);
            const result = await client.query("DELETE FROM leads WHERE id = $1 RETURNING *", [id]);
            await client.query("COMMIT");

            if (result.rows.length === 0) return error(res, "Lead not found", 404);
            return success(res, "Lead deleted successfully");
        } catch (e: any) {
            await client.query("ROLLBACK");
            throw e;
        } finally {
            client.release();
        }
    } catch (err: any) {
        return error(res, err.message, 500);
    }
};
