const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
  user: 'postgres',
  host: '127.0.0.1',
  database: 'erp_backend_restored',
  password: 'root',
  port: 5433,
});

async function generateSchema() {
  const client = await pool.connect();
  try {
    const res = await client.query(`
      SELECT table_name, column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position;
    `);

    const tables = {};
    res.rows.forEach(row => {
      if (!tables[row.table_name]) tables[row.table_name] = [];
      tables[row.table_name].push(row);
    });

    let prismaSchema = `generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

`;

    for (const [tableName, columns] of Object.entries(tables)) {
      prismaSchema += `model ${tableName.charAt(0).toUpperCase() + tableName.slice(1)} {\n`;
      columns.forEach(col => {
        let type = 'String';
        if (col.data_type.includes('int')) type = 'Int';
        else if (col.data_type.includes('numeric') || col.data_type.includes('decimal')) type = 'Decimal';
        else if (col.data_type.includes('timestamp') || col.data_type.includes('date')) type = 'DateTime';
        else if (col.data_type.includes('boolean')) type = 'Boolean';
        else if (col.data_type.includes('json')) type = 'Json';

        const nullable = col.is_nullable === 'YES' ? '?' : '';
        const isId = col.column_name === 'id' ? '@id @default(autoincrement())' : '';
        
        prismaSchema += `  ${col.column_name} ${type}${nullable} ${isId}\n`;
      });
      prismaSchema += `}\n\n`;
    }

    fs.writeFileSync('schema.prisma', prismaSchema);
    console.log('Generated schema.prisma from DB columns.');
  } finally {
    client.release();
    await pool.end();
  }
}

generateSchema();
