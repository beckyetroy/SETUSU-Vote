var express = require('express');
var router = express.Router();
var database = require('../database');
var mysql = require('mysql');
const AWS = require('aws-sdk');
const multer = require('multer');
const dotenv = require("dotenv");
const jwt = require('jsonwebtoken');

dotenv.config({ path: '.env' });

// set up multer storage engine
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// set up AWS SDK
const rekognition = new AWS.Rekognition({
    accessKeyId: process.env.accessKeyId,
    secretAccessKey: process.env.secretAccessKey,
    region: process.env.region
});

function renderPage(res, electionId, message) {
    database.getConnection ( async (err, connection)=> {
        if (err) throw (err);
        const election_query = `select * from Election where Id = ?`;
        const query = mysql.format(election_query, [electionId]);
        await connection.query (query, async (err, result) => {
            connection.release();
            if (err) throw (err);
            res.render('voter/vote.ejs', { title: 'Cast Your Vote', message: message, data: result});
        })
    })
}

/* GET vote page. */
router.get('/:id', function(req, res, next) {
    const token = jwt.sign({ voterId: Math.random().toString(36).substring(2) }, process.env.secretKey3, { expiresIn: '30m' });
    const election = req.params.id;
    res.cookie('token', token);
    renderPage(res, election, '');
});

/* Verify basic details */
router.post('/:id', function(req, res, next) {
    const token = req.cookies.token;
    if (!token) {
        token = jwt.sign({ voterId: Math.random().toString(36).substring(2) }, process.env.secretKey3, { expiresIn: '30m' });
    }
    const decoded = jwt.verify(token, process.env.secretKey3);
    const voterId = decoded.voterId;
    const studentno = req.body.studentno;
    const fname = req.body.fname;
    const lname = req.body.lname;
    const email = req.body.email;
    const election = req.params.id;

    // Verify User Input with DB
    database.getConnection( async (err, connection) => {
        if (err) throw (err)
        const fetch_voters = `SELECT * From Voter
                                join Election
                                on Voter.ElectionId = Election.Id
                                where StudentNo = ? and
                                Voter.ElectionId = ? and
                                fName = ? and
                                lName = ? and
                                Email = ?`;
        const check_query = mysql.format(fetch_voters,[studentno, election, fname, lname, email])

        await connection.query(check_query, async (err, result) => {
            if (err) throw (err);

            if (result.length === 0) {
                res.status(400).json({ message: 'Invalid details.' });
                return;
            }

            const voter = req.body;
            const newToken = jwt.sign({ voterId: voterId, voter: voter }, process.env.secretKey3, { expiresIn: '30m' });
            res.cookie('token', newToken);
            res.status(200).json({ message: 'Basic details verified.' });
        });
    });
});

module.exports = router;