const jwt = require('jsonwebtoken');
const axios = require('axios');

async function test() {
    const secret = "supersecretkey";
    
    // Create a token for vishnu (userId 4 or whatever it is, client_id 1)
    // I'll find vishnu's ID first.
    const token = jwt.sign(
        {
            userId: 1, // dummy for now, we'll find real one
            role: 'CLIENT',
            client_id: 1
        },
        secret,
        { expiresIn: "1d" }
    );

    try {
        const res = await fetch('http://localhost:5000/api/portal/billing/summary', {
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        console.log("SUMMARY RESPONSE:", res.status, data);
    } catch (e) {
        console.error("ERROR:", e);
    }
}

test();
