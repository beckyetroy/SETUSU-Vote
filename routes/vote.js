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

function renderPage(res, electionId, action, message, category, selectedOptions) {
    database.getConnection(async (err, connection) => {
      if (err) throw (err);
      const election_query = `SELECT Id, Description, Candidate.CandidateId,
                            fName, lName, Picture_path, CategoryId, OpenTime, CloseTime,
                            ElectionDate
                            FROM Election LEFT JOIN Candidate
                            ON Candidate.ElectionId = Election.Id
                            LEFT JOIN Candidate_Category
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
            const now = new Date();
            const electionDate = new Date(electionData[0].ElectionDate);
            const openTime = new Date(electionData[0].OpenTime);
            const closeTime = new Date(electionData[0].CloseTime);
            const sameDate = now.toDateString() === electionDate.toDateString();
            const withinInterval = now >= openTime && now < closeTime;
            if (withinInterval && sameDate) {
                res.render('voter/vote.ejs', { title: 'Cast Your Vote', message: message, data: electionData,
                    categorydata: categoryData, action: action, currentcategory: category, selectedOptions: selectedOptions});
                return;
            } else {
                res.render('voter/vote.ejs', { title: 'Cast Your Vote', message: "", data: electionData,
                    categorydata: "", action: 'noAccess', currentcategory: "", selectedOptions: ""});
                return;
            }
        });
      });
    });
}

/* GET vote page. */
router.get('/:id', function(req, res, next) {
    const token = jwt.sign({ voterId: Math.random().toString(36).substring(2) }, process.env.secretKey3, { expiresIn: '30m' });
    const election = req.params.id;
    res.cookie('token', token);
    renderPage(res, election, 'basicAuthentication', '', 0, {});
});

/* Verify basic details */
router.post('/:id', function(req, res, next) {
    const token = req.cookies.token;
    const studentno = req.body.studentno;
    const fname = req.body.fname;
    const lname = req.body.lname;
    const email = req.body.email;
    const election = req.params.id;

    if (!token) {
        token = jwt.sign({ voterId: Math.random().toString(36).substring(2) }, process.env.secretKey3, { expiresIn: '30m' });
    }

    else {
        try {
            const decoded = jwt.verify(token, process.env.secretKey3);
            voterId = decoded.voterId;
        }
        catch {
            res.redirect(`/vote/${election}`);
            return;
        }
    }

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
                renderPage(res, election, 'basicAuthentication', 'Voter not found. Please try again.', 0, {})
                return;
            }

            if (result[0].Voted === 1) {
                renderPage(res, election, 'basicAuthentication', 'Already Voted', 0, {})
                return;
            }

            const voter = req.body;
            const newToken = jwt.sign({ voterId: voterId, voter: voter }, process.env.secretKey3, { expiresIn: '10m' });
            res.cookie('token', newToken);
            renderPage(res, election, 'advancedAuthentication', '', 0, {});
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
        return;
    }
    try {
        const decoded = jwt.verify(token, process.env.secretKey3);
        voter = decoded.voter;
        voterId = decoded.voterId;
    }
    catch {
        res.redirect(`/vote/${election}`);
        return;
    }
    try {
        if (!voter) {
            res.redirect(`/vote/${election}`);
            return;
        }
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
                    renderPage(res, election, 'advancedAuthentication', 'Sorry, there was a problem retrieving your details. Please try again later.', 0, {});
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
                        res.status(500).send('Sorry, there was a problem verifying your details. Please try again later.');
                    } else if (data.FaceMatches.length == 0) {
                        console.log('No matching face found');
                        res.status(500).send('Facial recognition failed. Please try again.');
                    } else {
                        console.log('Face match found');
                        const faceData = data.FaceMatches[0].Face;
                        const newToken = jwt.sign({ voterId: voterId, voter: voter, image: faceData, selectedOptions: {} }, process.env.secretKey3, { expiresIn: '10m' });
                        res.cookie('token', newToken);
                        renderPage(res, election, 'vote', '', 0, {});
                    }
                });
            });
        });
    } catch (error) {
        console.error('Error handling image:', error);
        renderPage(res, election, 'advancedAuthentication', 'Sorry, there was a problem verifying your details. Please try again later.', 0, {});
    }
});

/* Render the next or previous category */
router.get('/:id/:category', function(req, res) {
    const token = req.cookies.token;
    var id = req.params.id;
    var currentcategory = parseInt(req.params.category);
    const fromButton = req.query.fromButton;
    const fromPrevButton = req.query.fromPrevButton;
    const selectedOption = req.query.selectedOption;
    var selectedOptions;
    var voter;
    var voterId;
    var image;

    if (!token) {
        res.redirect(`/vote/${id}`);
        return;
    }

    try {
        const decoded = jwt.verify(token, process.env.secretKey3);
        voter = decoded.voter;
        voterId = decoded.voterId;
        image = decoded.image;
        selectedOptions = decoded.selectedOptions;
    }
    catch {
        res.redirect(`/vote/${id}`);
        return;
    }

    if (!fromButton && !fromPrevButton) {
        res.redirect(`/vote/${id}`);
        return;
    }

    if (!voter || !image) {
        res.redirect(`/vote/${election}`);
        return;
    }

    else if (fromButton) {
        if (!selectedOptions) {
            selectedOptions = {};
        }
        selectedOptions[currentcategory] = selectedOption;
        currentcategory++;
        const newToken = jwt.sign({ voterId: voterId, voter: voter, image: image, selectedOptions: selectedOptions }, process.env.secretKey3, { expiresIn: '10m' });
        res.cookie('token', newToken);
        renderPage(res, id, 'vote', '', currentcategory, selectedOptions);
    }
    else {
        if (!selectedOptions) {
            selectedOptions = {};
        }
        if (selectedOptions[currentcategory]) {
            delete selectedOptions[currentcategory];
        }
        currentcategory--;
        const newToken = jwt.sign({ voterId: voterId, voter: voter, image: image, selectedOptions: selectedOptions }, process.env.secretKey3, { expiresIn: '10m' });
        res.cookie('token', newToken);
        renderPage(res, id, 'vote', '', currentcategory, selectedOptions);
    }
});

/* Submit Vote */
router.post('/:id/submit', async function(req, res, next) {
    const electionId = req.params.id;
    const votes = req.body;
    const token = req.cookies.token;
    const promises = [];
    var voter;
    var image;

    if (!token) {
        console.log('token error');
        res.redirect(`/vote/${id}`);
        return;
    }

    try {
        const decoded = jwt.verify(token, process.env.secretKey3);
        voter = decoded.voter;
        image = decoded.image;
    }
    catch {
        console.log('decoded error');
        res.redirect(`/vote/${id}`);
        return;
    }

    if (!voter || !image) {
        console.log('missing voter or image error');
        res.redirect(`/vote/${election}`);
        return;
    }

    Object.keys(votes).forEach(function(vote) {
        const [categoryId, candidateId] = vote.split('-');

        promises.push(new Promise((resolve, reject) => {
            database.getConnection(async (err, connection) => {
              if (err) reject(err);
        
              const vote_query = `UPDATE Candidate_Category SET NumVotes = NumVotes + 1
                                  WHERE CategoryId  = ?
                                  AND CandidateId = ?`;
              const voter_query = `UPDATE Voter SET Voted = 1
                                  WHERE StudentNo = ?`;
              const submit_query = mysql.format(vote_query, [categoryId, candidateId]);
              const update_query = mysql.format(voter_query, [voter.studentno]);
        
              try {
                await connection.query(submit_query);
                await connection.query(update_query);
                connection.release();
                resolve();
              } catch (err) {
                connection.release();
                reject(err);
              }
            });
        }));
    });
        
    Promise.all(promises)
        .then(() => {
        renderPage(res, electionId, 'vote', 'Success', 0, {});
        })
        .catch((err) => {
        console.log(err);
        renderPage(res, electionId, 'vote', 'There was a problem submitting your vote. Please try again later.', 0, {});
    });
});

module.exports = router;