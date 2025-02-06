import mysql from 'mysql';
import dotenv from 'dotenv';

dotenv.config();

const db = mysql.createConnection({
    host: process.env.DATABASE_HOST || 'localhost',  // Defaults to localhost if not set
    user: process.env.DATABASE_USER || 'root',      // Defaults to 'root' if not set
    password: process.env.DATABASE_PASSWORD || 'root',  // Defaults to 'root' if not set
    database: process.env.DATABASE || 'prohomez'     // Defaults to 'prohomez' if not set
});

db.connect(err => {
    if (err) {
        console.error('Database connection failed:', err);
        process.exit(1);
    }
    console.log('Connected to the database.');
});

export default db;
