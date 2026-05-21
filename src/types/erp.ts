export enum InvoiceStatus {
  PENDING = 'PENDING',
  PARTIAL = 'PARTIAL',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE'
}

export enum ApprovalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

export interface Invoice {
  id: number;
  invoice_number: string;
  client_id: number;
  project_id?: number;
  total_amount: number;
  paid_amount: number;
  balance_amount: number;
  status: InvoiceStatus;
  due_date: Date;
  division_id: number;
  is_deleted: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface ApprovalRecord {
  id: number;
  module_type: 'EXPENSE' | 'INVOICE' | 'PROJECT' | 'LEAD';
  reference_id: number;
  requested_by: number;
  assigned_to: number;
  status: ApprovalStatus;
  comments?: string;
  division_id: number;
  is_deleted: boolean;
  created_at: Date;
  updated_at: Date;
}
