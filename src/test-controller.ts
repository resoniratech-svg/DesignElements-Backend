import { createPayment } from "./modules/payments/payments.controller";

async function run() {
  const req: any = {
    body: {
      invoice_id: "INV-1001",
      invoiceId: "INV-1001",
      amount: 8,
      method: "Cash",
      date: "2026-04-08",
      division: "contracting"
    },
    user: { id: 1 },
    ip: "127.0.0.1",
    headers: { "user-agent": "test-agent" }
  };
  
  const res: any = {
    status: (code: number) => {
      console.log("STATUS:", code);
      return res;
    },
    json: (data: any) => {
      console.log("JSON:", JSON.stringify(data, null, 2));
      return res;
    }
  };
  
  try {
    await createPayment(req, res);
  } catch (err: any) {
    console.error("FATAL ERROR STACK:");
    console.error(err);
  }
  process.exit(0);
}
run();
