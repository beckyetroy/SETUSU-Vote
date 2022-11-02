var mysql = require('mysql');
const dotenv = require("dotenv")

dotenv.config({ path: '.env' });

var db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

db.getConnection(function(err) {
  if (err) throw err;
  console.log("Connected!");
  });

module.exports = db;