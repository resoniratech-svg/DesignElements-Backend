import { Pool, types } from "pg";
import dotenv from "dotenv";

dotenv.config();

// Parse DATE columns (OID 1082) and TIMESTAMP columns (OID 1114) as raw string format instead of Date objects in local timezone
types.setTypeParser(1082, (val) => val);
types.setTypeParser(1114, (val) => val);

const poolConfig = process.env.DATABASE_URL 
  ? { connectionString: process.env.DATABASE_URL }
  : {
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      password: process.env.DB_PASSWORD,
      port: Number(process.env.DB_PORT),
    };

export const pool = new Pool(poolConfig);


export default pool;