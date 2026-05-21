import { Request, Response } from "express";
import { proService } from "./pro.service";

export const getContracts = async (req: Request, res: Response) => {
  try {
    const contracts = await proService.getContracts();
    res.json(contracts);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const getAllDocuments = async (req: Request, res: Response) => {
  try {
    const documents = await proService.getAllDocuments();
    res.json(documents);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const getTasks = async (req: Request, res: Response) => {
  try {
    const { clientId } = req.query;
    const tasks = await proService.getTasks(clientId as string);
    res.json(tasks);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const runExpiryCheck = async (req: Request, res: Response) => {
  try {
    const result = await proService.runExpiryCheck();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
