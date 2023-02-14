var express = require('express');
var router = express.Router();
var database = require('../database');
var mysql = require('mysql');

function renderPage(res, message) {
    database.getConnection ( async (err, connection)=> {
        if (err) throw (err);
        const election_query = `select * from Election`;
        await connection.query (election_query, async (err, result) => {
            connection.release();
            if (err) throw (err);
            res.render('voter/registration.ejs', { title: 'Register', message: message, data: result});
        })
    })
}

/* GET register page. */
router.get('/', function(req, res, next) {
    renderPage(res, '');
});

/* Register voter */
router.post('/', function(req, res, next) {
    const studentno = req.body.studentno;
    const fname = req.body.fname;
    const lname = req.body.lname;
    const email = req.body.email;
    const election = req.body.election;

    database.getConnection( async (err, connection) => {
        if (err) throw (err)
        const sqlInsert = "insert into Voter (StudentNo, fName, lName, Email, ElectionId) values (?,?,?,?,?)";
        const insert_query = mysql.format(sqlInsert,[studentno, fname, lname, email, election]);

        var i = 0;
        const fetch_voters = `SELECT * From Voter
                                join Election
                                on Voter.ElectionId = Election.Id
                                where StudentNo = ? and
                                Voter.ElectionId = ?`;
        const check_query = mysql.format(fetch_voters,[studentno, election])

        await connection.query(check_query, async (err, result) => {
            if (err) throw (err);

            if (result.length > 0) {
                renderPage(res, 'You are already registered for this election.');
            }

            else {
                await connection.query (insert_query, async (err, result)=> {
                    connection.release();
                    if (err) throw (err)
                    console.log ("Registered Voter");
                    res.redirect("/");
                });
            }
        });
    })
});

module.exports = router;