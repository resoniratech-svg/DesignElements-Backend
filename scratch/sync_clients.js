
const { Client } = require('pg');
const client = new Client({
    user: 'postgres',
    password: 'Akanksha123',
    host: 'localhost',
    database: 'trek_database_restore',
    port: 5432
});

async function sync() {
    await client.connect();
    const ids = [97, 98];
    for (const user_id of ids) {
        try {
            const res = await client.query('SELECT * FROM users WHERE id = $1', [user_id]);
            if (res.rows.length === 0) {
                console.log(`User ${user_id} not found`);
                continue;
            }
            const user = res.rows[0];
            const normalizedDivision = (user.division || '').trim().toUpperCase();
            const prefix = (normalizedDivision === 'SERVICE' ? 'SER' : normalizedDivision === 'TRADING' ? 'TRD' : normalizedDivision === 'CONTRACTING' ? 'CON' : 'GEN');
            
            const lastCodeRes = await client.query('SELECT client_code FROM clients WHERE client_code LIKE $1 ORDER BY client_code DESC LIMIT 1', [prefix + '-%']);
            let nextNum = 1;
            if (lastCodeRes.rows.length > 0) {
                nextNum = parseInt(lastCodeRes.rows[0].client_code.split('-')[1], 10) + 1;
            }
            const clientCode = `${prefix}-${String(nextNum).padStart(3, '0')}`;
            
            await client.query(
                'INSERT INTO clients (name, email, phone, address, contact_person, division, sector, client_code, user_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
                [
                    user.company_name || user.name,
                    user.email,
                    user.phone,
                    user.address,
                    user.name,
                    normalizedDivision,
                    normalizedDivision,
                    clientCode,
                    user.id
                ]
            );
            console.log(`Synced user: ${user.name} with code ${clientCode}`);
        } catch (e) {
            console.error(`Failed for user ${user_id}:`, e.message);
        }
    }
    await client.end();
}

sync();
