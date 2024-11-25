import mysql from "mysql2/promise";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();
// Get the current directory of the module (db.js)
const __dirname = path.dirname(new URL(import.meta.url).pathname);

// Define paths to your SSL certificates
// Use relative path to access certificates
const certOptions = {
  ca: fs.readFileSync(path.resolve(__dirname, "certs/server-ca.pem")),
  cert: fs.readFileSync(path.resolve(__dirname, "certs/client-cert.pem")),
  key: fs.readFileSync(path.resolve(__dirname, "certs/client-key.pem")),
};

// Create a pool of connections
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: certOptions,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export default pool;
