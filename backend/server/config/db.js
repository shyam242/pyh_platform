import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
  user: process.env.DB_USER || "postgres",
  host: process.env.DB_HOST || "127.0.0.1",
  database: process.env.DB_NAME || "recruiter_platform",
  password: process.env.DB_PASSWORD || "Shyam2402@",
  port: process.env.DB_PORT || 5432,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

export default pool;
