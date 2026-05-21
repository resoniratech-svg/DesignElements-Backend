const { notifyClientOfCreditRequest } = require("./src/modules/notifications/notifications.controller");
require("dotenv").config();

const mockReq = {
  body: {
    clientId: 23, // 'venu'
    amount: 1000,
    reason: "TEST NOTIFICATION AFTER FIX"
  }
};

const mockRes = {
  status: function(s) { this.statusCode = s; return this; },
  json: function(j) { 
    console.log("Response Status:", this.statusCode || 200);
    console.log("Response Body:", j);
  }
};

async function test() {
  console.log("Starting test notification...");
  try {
    await notifyClientOfCreditRequest(mockReq, mockRes);
  } catch (err) {
    console.error("Test execution failed:", err);
  }
}

test();
