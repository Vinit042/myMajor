import mysql from 'mysql2';
import dotenv from 'dotenv';

dotenv.config();

// Create a connection pool to the MySQL database
const connectDB = mysql.createPool({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER, 
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});


export default connectDB;
