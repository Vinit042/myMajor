import db from "./db.js";

// Function sends a query to the database and returns the results
export function executeQuery(statement, values = []) {
  return new Promise((resolve, reject) => {
    db.query(statement, values, (error, results) => {
      if (error) reject(error);
      else resolve(results);
    });
  });
};