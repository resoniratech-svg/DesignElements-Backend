import { Request, Response } from "express";
import * as creditRequestService from "./creditRequest.service";

export const createCreditRequest = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.id;
        const data = { ...req.body, requestedBy: userId };
        const result = await creditRequestService.createCreditRequestService(data);
        res.status(201).json({ success: true, data: result });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

import { pool } from "../../config/db";

export const getAllCreditRequests = async (req: Request, res: Response) => {
    try {
        const filters = req.query as any;
        const user = (req as any).user;
        
        if (user && user.role === 'CLIENT') {
            const clientRecord = await pool.query(
                "SELECT id FROM clients WHERE user_id = $1 OR LOWER(email) = LOWER($2)", 
                [user.id, user.email || '']
            );
            if (clientRecord.rows.length > 0) {
                filters.clientId = clientRecord.rows[0].id;
            } else {
                return res.status(200).json({ success: true, data: [] });
            }
        }

        const result = await creditRequestService.getAllCreditRequestsService(filters);
        res.status(200).json({ success: true, data: result });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getCreditRequestById = async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id as string);
        const result = await creditRequestService.getCreditRequestByIdService(id);
        if (!result) return res.status(404).json({ success: false, message: "Credit request not found" });
        res.status(200).json({ success: true, data: result });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const updateCreditRequest = async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id as string);
        const result = await creditRequestService.updateCreditRequestService(id, req.body);
        if (!result) return res.status(404).json({ success: false, message: "Credit request not found or no changes made" });
        res.status(200).json({ success: true, data: result });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const deleteCreditRequest = async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id as string);
        const result = await creditRequestService.deleteCreditRequestService(id);
        if (!result) return res.status(404).json({ success: false, message: "Credit request not found" });
        res.status(200).json({ success: true, message: "Credit request deleted successfully" });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};
