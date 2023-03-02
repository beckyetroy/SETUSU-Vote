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
        const election_query = `select Id, Description, Candidate.CandidateId,
                                fName, lName, Picture_path
                                from Election join Candidate
                                on Candidate.ElectionId = Election.Id
                                join Candidate_Category
                                on Candidate.CandidateId = Candidate_Category.CandidateId
                                where Id = ?`;
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
            connection.release();
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

/* Advanced authentication */
router.post('/:id/authenticate', upload.single('image'), async function(req, res, next) {
    const token = req.cookies.token;
    const election = req.params.id;
    var voter;
    if (!token) {
        res.redirect(`/vote/${election}`);
    }
    try {
        const decoded = jwt.verify(token, process.env.secretKey3);
        voter = decoded.voter;
    }
    catch {
        res.redirect(`/vote/${election}`);
    }
    try {
        const imageData = req.file.buffer.toString('base64');
        const mimeType = req.file.mimetype;

        // Verify Image with Card
        database.getConnection( async (err, connection) => {
            connection.release();
            if (err) throw (err)
            const fetch_voter = `SELECT CardImg From Voter
                                    where StudentNo = ?`;
            const check_query = mysql.format(fetch_voter,[voter.studentno])

            await connection.query(check_query, async (err, result) => {
                if (err) throw (err);

                if (result.length === 0) {
                    console.log('Image not found.');
                    res.status(400).json({ message: 'Error retrieving card image.' });
                    return;
                }

                const cardImg = result[0].CardImg;
                const faceMatchThreshold = 90;

                const params = {
                    SourceImage: {
                      Bytes: Buffer.from(imageData, 'base64')
                    },
                    TargetImage: {
                      Bytes: cardImg
                    },
                    SimilarityThreshold: faceMatchThreshold
                };

                rekognition.compareFaces(params, function (err, data) {
                    if (err) {
                        console.error('Error comparing faces:', err);
                        res.status(500).send({ error: 'Server error' });
                    } else if (data.FaceMatches.length == 0) {
                        console.log('No matching face found');
                        res.status(401).send({ error: 'Authentication failed' });
                    } else {
                        console.log('Face match found');
                        res.status(200).send({ message: 'Authentication successful' });
                    }
                });
            });
        });
    } catch (error) {
        console.error('Error handling image:', error);
        res.status(500).send({ error: 'Server error' });
    }
});

module.exports = router;