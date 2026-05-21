import { pool } from "../../config/db";

export interface CreditRequestData {
    clientId: number;
    amount: number;
    reason: string;
    notes?: string;
    approvalStatus?: string;
    requestedBy?: number;
}

export const createCreditRequestService = async (data: CreditRequestData) => {
    const { clientId, amount, reason, notes, approvalStatus, requestedBy } = data;
    
    // Fetch client name from clients table to store it in the credit_requests table
    const clientRes = await pool.query(`SELECT name, contact_person FROM clients WHERE id = $1`, [clientId]);
    const clientName = clientRes.rows[0] ? (clientRes.rows[0].contact_person || clientRes.rows[0].name) : null;

    const result = await pool.query(
        `INSERT INTO credit_requests (client_id, client_name, amount, reason, notes, approval_status, requested_by) 
         VALUES ($1, $2, $3, $4, $5, $6, $7) 
         RETURNING *`,
        [clientId, clientName, amount, reason, notes, approvalStatus || 'pending', requestedBy]
    );
    return result.rows[0];
};

export const getAllCreditRequestsService = async (filters: any = {}) => {
    const { status, clientId } = filters;
    let query = `
        SELECT cr.*, c.contact_person as client_name, u.name as requester_name, c.sector as division
        FROM credit_requests cr
        LEFT JOIN clients c ON cr.client_id = c.id
        LEFT JOIN users u ON cr.requested_by = u.id
        WHERE 1=1
    `;
    const params: any[] = [];

    if (status && status !== 'all') {
        params.push(status);
        query += ` AND cr.approval_status = $${params.length}`;
    }

    if (clientId) {
        params.push(clientId);
        query += ` AND cr.client_id = $${params.length}`;
    }

    query += ` ORDER BY cr.created_at DESC`;

    const result = await pool.query(query, params);
    return result.rows;
};

export const getCreditRequestByIdService = async (id: number) => {
    const result = await pool.query(
        `SELECT cr.*, c.name as client_name, u.name as requester_name
         FROM credit_requests cr
         LEFT JOIN clients c ON cr.client_id = c.id
         LEFT JOIN users u ON cr.requested_by = u.id
         WHERE cr.id = $1`,
        [id]
    );
    return result.rows[0];
};

export const updateCreditRequestService = async (id: number, data: Partial<CreditRequestData>) => {
    const { amount, reason, notes, approvalStatus } = data;

    // Build update query dynamically
    const fields = [];
    const params = [];

    if (amount !== undefined) { params.push(amount); fields.push(`amount = $${params.length}`); }
    if (reason !== undefined) { params.push(reason); fields.push(`reason = $${params.length}`); }
    if (notes !== undefined) { params.push(notes); fields.push(`notes = $${params.length}`); }
    if (approvalStatus !== undefined) { params.push(approvalStatus); fields.push(`approval_status = $${params.length}`); }

    if (fields.length === 0) return null;

    params.push(id);
    const query = `UPDATE credit_requests SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${params.length} RETURNING *`;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await client.query(query, params);
        const updatedRequest = result.rows[0];

        // LOGIC: If approved, update client's credit_limit
        if (approvalStatus === 'approved' && updatedRequest) {
            await client.query(
                `UPDATE clients SET credit_limit = $1, updated_at = NOW() WHERE id = $2`,
                [updatedRequest.amount, updatedRequest.client_id]
            );
        }

        await client.query('COMMIT');
        return updatedRequest;
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
};

export const deleteCreditRequestService = async (id: number) => {
    const result = await pool.query(`DELETE FROM credit_requests WHERE id = $1 RETURNING id`, [id]);
    return result.rowCount ? result.rows[0] : null;
};
