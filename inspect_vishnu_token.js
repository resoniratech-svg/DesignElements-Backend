const axios = require('axios');
const jwt = require('jsonwebtoken');

async function test() {
    try {
        const response = await fetch('http://localhost:5000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'vishnu@gmail.com', password: 'password123' })
        });
        const data = await response.json();
        console.log("LOGIN DATA:", data);
        
        if (data.success) {
            const token = data.data.token;
            const decoded = jwt.decode(token);
            console.log("DECODED TOKEN:", decoded);
        }
    } catch (e) {
        console.error(e);
    }
}

test();
