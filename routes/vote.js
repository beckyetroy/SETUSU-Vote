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

function renderPage(res, electionId, action, message, category) {
    database.getConnection(async (err, connection) => {
      if (err) throw (err);
      const election_query = `SELECT Id, Description, Candidate.CandidateId,
                            fName, lName, Picture_path, CategoryId
                            FROM Election JOIN Candidate
                            ON Candidate.ElectionId = Election.Id
                            JOIN Candidate_Category
                            ON Candidate.CandidateId = Candidate_Category.CandidateId
                            WHERE Id = ?`;
      const category_query = `SELECT * FROM Category WHERE ElectionId = ?`;
      const query = mysql.format(election_query, [electionId]);
      const query2 = mysql.format(category_query, [electionId]);
      await connection.query(query, async (err, result) => {
        const electionData = result;
        if (err) throw (err);
        await connection.query(query2, async (err, result) => {
          if (err) throw (err);
          const categoryData = result;
          connection.release();
          res.render('voter/vote.ejs', { title: 'Cast Your Vote', message: message, data: electionData, categorydata: categoryData, action: action, currentcategory: category });
        });
      });
    });
}

/* GET vote page. */
router.get('/:id', function(req, res, next) {
    const token = jwt.sign({ voterId: Math.random().toString(36).substring(2) }, process.env.secretKey3, { expiresIn: '30m' });
    const election = req.params.id;
    res.cookie('token', token);
    renderPage(res, election, 'basicAuthentication', '', 0);
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
                renderPage(res, election, 'basicAuthentication', 'Invalid Details. Please try again.', 0)
                return;
            }

            const voter = req.body;
            const newToken = jwt.sign({ voterId: voterId, voter: voter }, process.env.secretKey3, { expiresIn: '10m' });
            res.cookie('token', newToken);
            renderPage(res, election, 'advancedAuthentication', '', 0);
        });
    });
});

/* Advanced authentication */
router.post('/:id/authenticate', upload.single('image'), async function(req, res, next) {
    const token = req.cookies.token;
    const election = req.params.id;
    var voter;
    var voterId;
    if (!token) {
        res.redirect(`/vote/${election}`);
    }
    try {
        const decoded = jwt.verify(token, process.env.secretKey3);
        voter = decoded.voter;
        voterId = decoded.voterId;
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
                    renderPage(res, election, 'advancedAuthentication', 'Sorry, there was a problem retrieving your details. Please try again later.', 0);
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
                        renderPage(res, election, 'advancedAuthentication', 'Sorry, there was a problem verifying your details. Please try again later.', 0);
                    } else if (data.FaceMatches.length == 0) {
                        console.log('No matching face found');
                        renderPage(res, election, 'advancedAuthentication', 'Image invalid. Please try again.', 0);
                    } else {
                        console.log('Face match found');
                        const faceData = data.FaceMatches[0].Face;
                        const newToken = jwt.sign({ voterId: voterId, voter: voter, image: faceData }, process.env.secretKey3, { expiresIn: '10m' });
                        res.cookie('token', newToken);
                        renderPage(res, election, 'vote', '', 0);
                    }
                });
            });
        });
    } catch (error) {
        console.error('Error handling image:', error);
        renderPage(res, election, 'advancedAuthentication', 'Sorry, there was a problem verifying your details. Please try again later.', 0);
    }
});

/* Render the next or previous category */
router.get('/:id/:category', function(req, res) {
    const token = req.cookies.token;
    var id = req.params.id;
    var currentcategory = parseInt(req.params.category);
    const fromButton = req.query.fromButton;
    const fromPrevButton = req.query.fromPrevButton;
    var voter;
    var voterId;
    var image;

    if (!token) {
        res.redirect(`/vote/${id}`);
    }
    try {
        const decoded = jwt.verify(token, process.env.secretKey3);
        voter = decoded.voter;
        voterId = decoded.voterId;
        image = decoded.image;
    }
    catch {
        res.redirect(`/vote/${id}`);
    }
    if (!fromButton && !fromPrevButton) {
        res.redirect(`/vote/${id}`);
        return;
    }
    else if (fromButton) {
        currentcategory++;
        renderPage(res, id, 'vote', '', currentcategory);
    }
    else {
        currentcategory--;
        renderPage(res, id, 'vote', '', currentcategory);
    }
});

module.exports = router;