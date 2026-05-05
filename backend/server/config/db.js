import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
  user: "postgres",
  host: "127.0.0.1",        // IMPORTANT
  database: "recruiter_platform",
  password: "Shyam2402@",         // ← SAME password you set
  port: 5432,
});

export default pool;
