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
    region: process.env.region});

const detectText = async (imageData) => {
  const params = {
    Image: {
      Bytes: imageData
    }
  };
  const response = await rekognition.detectText(params).promise();
  const textDetections = response.TextDetections;
  if (textDetections.length === 0) {
    return null;
  }
  const detectedText = textDetections[0].DetectedText;
  return detectedText;
};

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
    const token = jwt.sign({ voterId: Math.random().toString(36).substring(2) }, process.env.secretKey1, { expiresIn: '30m' });
    res.cookie('token', token);
    renderPage(res, '');
});

/* Save basic form details */
router.post('/', function(req, res, next) {
    const token = req.cookies.token;
    if (!token) {
        token = jwt.sign({ voterId: Math.random().toString(36).substring(2) }, process.env.secretKey1, { expiresIn: '30m' });
    }
    const decoded = jwt.verify(token, process.env.secretKey1);
    const voterId = decoded.voterId;
    const studentno = req.body.studentno;
    const election = req.body.election;
    //TODO - VERIFICATION

    //Check is user is already registered
    database.getConnection( async (err, connection) => {
        if (err) throw (err)
        const fetch_voters = `SELECT * From Voter
                                join Election
                                on Voter.ElectionId = Election.Id
                                where StudentNo = ? and
                                Voter.ElectionId = ?`;
        const check_query = mysql.format(fetch_voters,[studentno, election])

        await connection.query(check_query, async (err, result) => {
            if (err) throw (err);

            if (result.length > 0) {
                res.status(400).json({ message: 'You are already registered for this election.' });
                return;
            }

            const voter = req.body;
            const newToken = jwt.sign({ voterId: voterId, voter: voter }, process.env.secretKey1, { expiresIn: '30m' });
            res.cookie('token', newToken);
            res.status(200).json({ message: 'Basic form saved' });
        });
    });
});

/* Register Voter and Upload Card Image */
router.post('/upload-card', upload.single('image'), async function(req, res, next) {
    const token = req.cookies.token;
    const decoded = jwt.verify(token, process.env.secretKey1);
    const voter = decoded.voter;
    try {
        const imageData = req.file.buffer.toString('base64');
        const mimeType = req.file.mimetype;
    
        // set up parameters for the DetectText operation
        const detectParams = {
        Image: {
            Bytes: Buffer.from(imageData, 'base64')
        }
        };
    
        // detect text in the image
        const detectTextResponse = await rekognition.detectText(detectParams).promise();
        // Detect faces in the image
        const detectFacesResponse = await rekognition.detectFaces(detectParams).promise();

        const studentno = voter.studentno;
        const fname = voter.fname;
        const lname = voter.lname;
        const email = voter.email;
        const election = voter.election;

        let fnameFound = false;
        let lnameFound = false;
        let studentNoFound = false;
        let faceDetected = false;

        for (const textDetection of detectTextResponse.TextDetections) {
            const detectedText = textDetection.DetectedText.toLowerCase();
            const confidence = textDetection.Confidence;
        
            if ((detectedText.includes(studentno.toLowerCase())) && (confidence >= 97)) {
                console.log('Student number detected:', detectedText);
                studentNoFound = true;
            }
        
            if ((detectedText.includes(fname.toLowerCase())) && (confidence >= 97)) {
                console.log('First name detected:', detectedText);
                fnameFound = true;
            }
        
            if ((detectedText.includes(lname.toLowerCase()) && (confidence >= 97))) {
                console.log('Last name detected:', detectedText);
                lnameFound = true;
            }

            if (fnameFound && lnameFound && studentNoFound) {
                break;
            }
        }

        if (detectFacesResponse.FaceDetails.length > 0) {
            const faceDetail = detectFacesResponse.FaceDetails[0];
            const confidence = faceDetail.Confidence;
          
            if (confidence >= 97) {
              faceDetected = true;
            } else {
              faceDetected = false;
            }
        }

        if (fnameFound && lnameFound && studentNoFound && faceDetected) {
            database.getConnection( async (err, connection) => {
                if (err) throw (err)
                const sqlInsert = "insert into Voter (StudentNo, fName, lName, Email, ElectionId, CardImg, CardImgMimeType) values (?,?,?,?,?,?,?)";
                const insert_query = mysql.format(sqlInsert,[studentno, fname, lname, email, election, imageData, mimeType]);
    
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
                        console.log('here');
                        renderPage(res, 'You are already registered for this election.');
                    }
    
                    else {
                        await connection.query (insert_query, async (err, result)=> {
                            connection.release();
                            if (err) throw (err)
                            console.log("Registered Voter");
                            res.status(200).json({ message: 'Voter registered successfully' });
                        });
                    }
                });
            });
        }
        else {
            res.status(500).send({ message: 'Photo invalid.' });
        }
    } catch (error) {
        console.error('Error uploading image:', error);
        res.status(500).send({ error: 'Server error' });
    }
});

module.exports = router;