const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: Number(process.env.DB_PORT)
});

async function testCreateBOQ() {
    const client = await pool.connect();
    try {
        const items = [
            { description: "Test Item 1", quantity: 2, unit: "pcs", rate: 100 },
            { description: "Test Item 2", quantity: 5, unit: "m", rate: 50 }
        ];
        
        // Mock request body
        const body = {
            project_name: "Test Multi Item Project",
            client_name: "Test Client",
            sector: "TRADING",
            items: items,
            date: new Date()
        };
        
        // --- LOGIC FROM CONTROLLER ---
        const final_boq = `TEST-BOQ-${Date.now()}`;
        const subtotal = items.reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(item.rate || 0)), 0);
        const total_amount = subtotal;

        await client.query("BEGIN");

        const result = await client.query(
            `INSERT INTO boqs 
            (boq_number, project_name, client_name, subtotal, total_amount, items, status, sector, manager_id)
            VALUES ($1, $2, $3, $4, $5, $6, 'Pending', $7, $8)
            RETURNING id`,
            [final_boq, body.project_name, body.client_name, subtotal, total_amount, JSON.stringify(items), body.sector, 84]
        );

        const newId = result.rows[0].id;

        for (const item of items) {
            await client.query(
                `INSERT INTO boq_items (boq_id, description, quantity, unit, rate, amount)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [newId, item.description, item.quantity, item.unit, item.rate, item.quantity * item.rate]
            );
        }

        await client.query("COMMIT");
        console.log("Successfully created test BOQ with ID:", newId);
        
        const countRes = await client.query("SELECT count(*) FROM boq_items WHERE boq_id = $1", [newId]);
        console.log("Items count in boq_items:", countRes.rows[0].count);

    } catch (e) {
        await client.query("ROLLBACK");
        console.error("Test failed:", e);
    } finally {
        client.release();
        pool.end();
    }
}

testCreateBOQ();
