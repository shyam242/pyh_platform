import pool from "../config/db.js";


export const createUser = async (name, email, role) => {
const result = await pool.query(
"INSERT INTO users(name,email,role) VALUES($1,$2,$3) RETURNING *",
[name, email, role]
);
return result.rows[0];
};


export const findUserByEmail = async (email) => {
const result = await pool.query("SELECT * FROM users WHERE email=$1", [
email,
]);
return result.rows[0];
};

