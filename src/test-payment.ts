import { financeService } from "./services/financeService";
import api from "./services/api";

api.interceptors.request.clear();
api.defaults.headers.common["Authorization"] = "Bearer " + "test_token"; // Mock if needed, or hit directly via node script.

async function testPayment() {
  try {
    const res = await api.post("http://localhost:5000/api/payments", {
      invoice_id: "CON-INV-006",
      invoiceId: "CON-INV-006",
      amount: 8,
      method: "Cash",
      date: "2026-04-08",
      division: "contracting"
    }, {
      // Need login simulation if authMiddleware is active
    });
    console.log(res.data);
  } catch (err: any) {
    console.error(err.response?.data || err.message);
  }
}
// testPayment();
