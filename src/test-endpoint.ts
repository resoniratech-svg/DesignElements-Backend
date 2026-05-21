import axios from "axios";

async function run() {
  try {
    const res = await axios.post("http://localhost:5000/api/payments", {
       invoice_id: "INV-1001",
       invoiceId: "INV-1001",
       amount: 8,
       method: "Cash",
       date: "2026-04-08",
       division: "contracting"
    }, {
      headers: {
         // How do we bypass auth? The middleware uses `req.user`. 
         // Let's create a token or disable auth temporarily in test.
      }
    });
    console.log(res.data);
  } catch (err: any) {
    console.log(err.response?.status);
    console.log(err.response?.data);
  }
}
run();
