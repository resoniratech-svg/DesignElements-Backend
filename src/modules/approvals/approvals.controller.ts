import { Response } from "express";
import { 
  getPendingApprovalsService, 
  processApprovalService 
} from "./approvals.service";
import { successResponse, errorResponse } from "../../utils/response";

export const getPendingDocuments = async (req: any, res: Response) => {
  try {
    const { status } = req.query;
    const role = (req.user.role || "").toString().toUpperCase().replace("_", " ").trim();
    const isSuperAdmin = role === "SUPER ADMIN";
    const divisionFromQuery = req.query.division;
    const divisionId = (isSuperAdmin && divisionFromQuery && divisionFromQuery !== 'all') ? divisionFromQuery : (isSuperAdmin ? undefined : req.user.division);
    
    console.log(`[APPROVALS DEBUG] Fetching status: ${status}, divisionId: ${divisionId}, Role: ${role}`);
    
    const result = await getPendingApprovalsService(divisionId, status as string);
    
    console.log(`[APPROV ALS DEBUG] Found ${result.length} items`);
    
    res.status(200).json(successResponse(result));
  } catch (err: any) {
    console.error("GET PENDING ERROR:", err);
    res.status(500).json(errorResponse(err.message || "Failed to fetch pending items"));
  }
};

export const processApproval = async (req: any, res: Response) => {
  try {
    const { entityId, entityType, status, comments } = req.body;
    const userId = req.user.id;

    if (!entityId || !entityType || !status) {
      return res.status(400).json(errorResponse("Missing required approval fields"));
    }

    const result = await processApprovalService(entityType, Number(entityId), status, userId, comments);
    res.status(200).json(successResponse(result, `Item ${status} successfully`));
  } catch (err: any) {
    console.error("PROCESS APPROVAL ERROR:", err);
    res.status(500).json(errorResponse(err.message || "Failed to process approval"));
  }
};