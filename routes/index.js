var express = require('express');
var router = express.Router();
var database = require('../database');

/* GET home page. */
router.get('/', function(req, res, next) {
  database.getConnection ( async (err, connection)=> {
    if (err) throw (err)
    const sqlSearch =
        `select Id, Description, ElectionDate, Icon_path,
        Candidate.CandidateId, fName, lName, CategoryName,
          Picture_Path
          FROM Election
          LEFT OUTER JOIN Candidate ON Election.Id = Candidate.ElectionId
          LEFT OUTER JOIN Candidate_Category
          ON Candidate.CandidateId = Candidate_Category.CandidateId
          LEFT OUTER JOIN Category
          ON Candidate_Category.CategoryId = Category.CategoryId;`
    await connection.query (sqlSearch, async (err, result) => {
        connection.release()
        
        if (err) throw (err)
        if (result.length == 0) {
          console.log("Nothing Registered.")
          res.render('index', { title: 'HAVE YOUR SAY', data:result});
        }
        else {
          res.render('index', { title: 'HAVE YOUR SAY', data:result});
        }
    })
  })
});

module.exports = router;
