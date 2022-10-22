var mysql = require('mysql');
const dotenv = require("dotenv")

dotenv.config({ path: '.env' });

var con = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

con.connect(function(err) {
  if (err) throw err;
  console.log("Connected!");
  con.query("select concat(fName, ' ', lName) as 'Candidate', Email as 'Email Address', StudentNo as 'Student Number', Voted as 'Voted (Bool)', Description as 'Election'  from Voter join Election on Voter.ElectionId = Election.ElectionId;", function (err, result) {
    if (err) throw err;
    console.log(result);
});});