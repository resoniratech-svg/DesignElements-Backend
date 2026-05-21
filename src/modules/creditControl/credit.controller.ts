import { Request, Response } from "express";
import { 
  getCreditSummaryService, 
  getInvoicesService, 
  addPaymentService 
} from "./credit.service";
import { successResponse, errorResponse } from "../../utils/response";

export const getCreditSummary = async (req: any, res: Response) => {
  try {
    let divisionId = req.user.role === "SUPER_ADMIN" ? req.query.division : req.user.division;
    if (divisionId === "undefined" || divisionId === "all") divisionId = undefined;
    
    const result = await getCreditSummaryService(divisionId);
    res.status(200).json(successResponse(result));
  } catch (err: any) {
    console.error("CREDIT SUMMARY ERROR:", err);
    res.status(500).json(errorResponse(err.message || "Failed to fetch summary"));
  }
};

export const getInvoices = async (req: any, res: Response) => {
  try {
    let divisionId = req.user.role === "SUPER_ADMIN" ? req.query.division : req.user.division;
    if (divisionId === "undefined" || divisionId === "all") divisionId = undefined;

    const result = await getInvoicesService(req.query, divisionId);
    res.status(200).json(successResponse(result));
  } catch (err: any) {
    console.error("GET INVOICES ERROR:", err);
    res.status(500).json(errorResponse(err.message || "Failed to fetch invoices"));
  }
};

export const addPayment = async (req: any, res: Response) => {
  try {
    const { invoiceId, amount, method, notes } = req.body;
    const divisionId = req.user.division;

    if (!invoiceId || !amount || !method) {
      return res.status(400).json(errorResponse("Missing required payment fields"));
    }

    const result = await addPaymentService(Number(invoiceId), Number(amount), divisionId, method, req.user.id, notes);
    res.status(201).json(successResponse(result, "Payment recorded successfully"));
  } catch (err: any) {
    console.error("ADD PAYMENT ERROR:", err);
    res.status(500).json(errorResponse(err.message || "Failed to record payment"));
  }
};