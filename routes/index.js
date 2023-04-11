var express = require('express');
var router = express.Router();
var database = require('../database');
var mysql = require('mysql');

/* GET home page. */
router.get('/', function(req, res, next) {
  database.getConnection ( async (err, connection)=> {
    if (err) throw (err)
    const sqlSearch =
        `select Id, Description, ElectionDate, Icon_path,
        Candidate.CandidateId, fName, lName, CategoryName,
          Picture_Path, OpenTime, CloseTime
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

/* GET election list page. */
router.get('/elections', function(req, res, next) {
  database.getConnection ( async (err, connection)=> {
    if (err) throw (err)
    const sqlSearch =
        `select Id, Description, ElectionDate, OpenTime, CloseTime, Icon_path,
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
          res.render('elections', { title: 'ALL ELECTIONS', data:result});
        }
        else {
          res.render('elections', { title: 'ALL ELECTIONS', data:result});
        }
    })
  })
});

/* GET candidate list page. */
router.get('/candidates', function(req, res, next) {
  database.getConnection ( async (err, connection)=> {
    if (err) throw (err)
    const sqlSearch =
        `select Id, Description, ElectionDate, Icon_path, OpenTime, CloseTime,
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
          res.render('candidates', { title: 'ALL CANDIDATES', data:result});
        }
        else {
          res.render('candidates', { title: 'ALL CANDIDATES', data:result});
        }
    })
  })
});

/* GET election info page. */
router.get('/election/:id', function(req, res, next) {
  const election = req.params.id;
  database.getConnection ( async (err, connection)=> {
    if (err) throw (err)
    const sqlElection =
        `select Id, Description, ElectionDate, OpenTime, CloseTime, 
        Category.CategoryId, CategoryName, CategoryDescription,
        Candidate.CandidateId, fName, lName, Picture_path, Icon_path
        from Election LEFT OUTER JOIN Candidate ON Election.Id = Candidate.ElectionId
          LEFT OUTER JOIN Candidate_Category
          ON Candidate.CandidateId = Candidate_Category.CandidateId
          LEFT OUTER JOIN Category
          ON Candidate_Category.CategoryId = Category.CategoryId
        where Id = ?;`
      const query = mysql.format(sqlElection, [election]);
    await connection.query (query, async (err, result) => {
        connection.release()
        if (err) throw (err)
        if (result.length == 0) {
          res.redirect('/');
        }
        else {
          res.render('election_info', { data:result});
        }
    })
  })
});

/* GET candidate info page. */
router.get('/candidate/:id', function(req, res, next) {
  const candidate = req.params.id;
  database.getConnection ( async (err, connection)=> {
    if (err) throw (err)
    const sqlCandidate =
        `select Candidate.CandidateId, fName, lName, Email,
        Instagram, Twitter, Facebook, ContactNo,
        Category.CategoryId, CategoryName, Slogan, Overview,
        Description, Id, AgendaId, Summary, Picture_Path, 
        file_id, File_Path, Type
        from Candidate join Candidate_Category
        on Candidate.CandidateId = Candidate_Category.CandidateId
        left join Category
        on Candidate_Category.CategoryId = Category.CategoryId
        left join Election
        on Candidate.ElectionId = Election.Id
        left join Agenda
        on Candidate.CandidateId = Agenda.CandidateId
        left join Candidate_Media
        on Candidate.CandidateId = Candidate_Media.CandidateId
        where Candidate.CandidateId = ?;`
      const query = mysql.format(sqlCandidate, [candidate]);
    await connection.query (query, async (err, result) => {
        connection.release()
        if (err) throw (err)
        if (result.length == 0) {
          res.redirect('/');
        }
        else if ((result[0].fName === 'Reopen') && (result[0].lName === 'Election')) {
          res.redirect('/');
        }
        else {
          res.render('candidate_info', { data:result});
        }
    })
  })
});

module.exports = router;
