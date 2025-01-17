var express = require('express');
var router = express.Router();
var database = require('../database');
const argon2 = require('argon2');
const randomstring = require("randomstring");
var mysql = require('mysql');
const jwt = require('jsonwebtoken');
var crypto = require('crypto');
const multer = require('multer');
const blockTime = 15; //15 minutes

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './public/uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now() + '-' + file.originalname);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 1000 * 1024 * 1024 },
  fileFilter: function (req, file, cb) {
    if (!file.originalname.match(/\.(jpg|jpeg|png|webp|mp4)$/)) {
      return cb(new Error('Only image and video files are allowed'));
    }
    cb(null, true);
  }
});

function validatePassword(password) {
    var pattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return pattern.test(password);
}

function renderDashboard(res, title, action, username) {
    database.getConnection ( async (err, connection)=> {
        if (err) throw (err)
        const candidate_query =
            `select Candidate.CandidateId, fName, lName, Email,
                    Instagram, Twitter, Facebook, ContactNo,
                    Category.CategoryId, CategoryName, NumVotes, Slogan, Overview,
                    Description, Username, AgendaId, Summary, Picture_path, 
                    file_id, File_Path, Type, Election.Id
                    from Candidate join Candidate_Category
                    on Candidate.CandidateId = Candidate_Category.CandidateId
                    left join Category
                    on Candidate_Category.CategoryId = Category.CategoryId
                    left join Election
                    on Candidate.ElectionId = Election.Id
                    left join Candidate_Credentials
                    on Candidate.CandidateId = Candidate_Credentials.CandidateId
                    left join Agenda
                    on Candidate.CandidateId = Agenda.CandidateId
                    left join Candidate_Media
                    on Candidate.CandidateId = Candidate_Media.CandidateId
                    where Candidate_Credentials.Username = ?`;
        const query = mysql.format(candidate_query, username);
        await connection.query (query, async (err, result) => {
            const data = result;
            const id = result[0].Id;
            const check_query = `select Id, Description, ElectionDate, OpenTime, CloseTime, CategoryId,
                CategoryName, CategoryDescription, Icon_path
                from Election left join Category
                on Election.Id = Category.ElectionId
                where Id = ?`;
            const checkQuery = mysql.format(check_query, [id]);
            await connection.query(checkQuery, async (err, result) => {
                if (err)
                    console.log(err);
                const now = new Date();
                const openTime = new Date(result[0].OpenTime);
                const closeTime = new Date(result[0].CloseTime);
                if (((now >= openTime && now <= closeTime && now.toDateString() === openTime.toDateString()) || now > openTime)
                    && action === 'editCampaign') {
                    return res.redirect('/hj9h');
                }
                else {
                    connection.release()
                    
                    if (err) throw (err)
                    if (result.length == 0) {
                    console.log("An error occurred. Please verify user details.")
                    res.render('candidate/candidate_dashboard', { title: title, action:action, data:data});
                    }
                    else {
                        res.render('candidate/candidate_dashboard', { title: title, action:action, data:data});
                    }
                }
            });
        });
    })
};

/* GET candidate login page. */
router.get('/', function(req, res, next) {
    const token = req.cookies.token;
    try {
        const decoded = jwt.verify(token, process.env.secretKey2);
        if (decoded) {
            renderDashboard(res, 'Candidate Dashboard', 'main', decoded.username);
        }
    } catch (err) {
        if (err.name === 'TokenExpiredError' || err.name === 'JsonWebTokenError') {
            res.render('candidate/candidate_login', { title: 'Login' });
        } else {
            console.log(err);
            res.render('candidate/candidate_login', { title: 'Login' });
        }
    }
});

/* Login Authentication. */
router.post('/', async function(req, res, next) {
    //Handle user log in
    const user = req.body.username;
    const password = req.body.password;
    const maxLoginAttempts = 3;

    database.getConnection ( async (err, connection)=> {
        if (err) throw (err);

        async function blockUser(user) {
            var now = new Date();
            now.setMinutes(now.getMinutes()+blockTime);
            const expiration = now;
            const sql = "UPDATE Candidate_Credentials SET BlockExpiration = ? WHERE UserName = ?";
            const query = mysql.format(sql, [expiration, user]);
            await connection.query(query, (err, result) => {
                if (err) throw err;
            });
        }

        async function checkBlockedUser(user) {
            if (user.BlockExpiration && user.BlockExpiration > Date.now()) {
                return true;
            }
            return false;
        }

        const sqlSearch = "Select * from Candidate_Credentials where Username = ?";
        const search_query = mysql.format(sqlSearch,[user]);
        await connection.query (search_query, async (err, result) => {
            connection.release();
            
            if (err) throw (err);
            if (result.length == 0 || result.length == 1 && !(result[0].Username)) {
                console.log("User does not exist")
                res.render('candidate/candidate_login', { title: 'Login' });
            }
            else {
                const blockedUser = await checkBlockedUser(result[0]);
                if (blockedUser) {
                    console.log("User account is currently blocked")
                    res.render('candidate/candidate_login', { title: 'Login' });
                    return;
                }

                // Generate a new random salt for every password
                const salt = randomstring.generate(16);

                const hashedPasswordInDB = result[0].Password;
                const saltInDB = result[0].Salt;
                let loginAttempts = result[0].LoginAttempts;

                if (await argon2.verify(hashedPasswordInDB, password, { salt: saltInDB })) {
                    console.log("Login Successful");
                    const updateSalt = "UPDATE Candidate_Credentials SET Salt = ?, LoginAttempts = 0, BlockExpiration = NULL WHERE Username = ?";
                    const update_query = mysql.format(updateSalt, [salt, user]);
                    await connection.query(update_query, async (err, result) => {
                        if (err) throw err;
                        const token = jwt.sign({username: user}, process.env.secretKey2, { expiresIn: '30m' });
                        res.cookie('token', token);
                        renderDashboard(res, 'Candidate Dashboard', 'main', user);
                    });
                }
                else {
                    console.log("Password Incorrect")
                    if (loginAttempts + 1 >= maxLoginAttempts) {
                        // block user account and IP address
                        await blockUser(user);
                        console.log('User access blocked for 15 minutes.');
                    }
                    loginAttempts ++;
                    const updateAttempts = "UPDATE Candidate_Credentials SET LoginAttempts = ? WHERE Username = ?";
                    const update_query = mysql.format(updateAttempts, [loginAttempts, user]);
                    await connection.query(update_query, async (err, result) => {
                        if (err) throw err;
                        res.render('candidate/candidate_login', { title: 'Login' });
                        return;
                    });
                }
            }
        })
    })
});

/* View User Details */
router.get('/settings', async function(req, res, next){
    const token = req.cookies.token;
    try {
        const decoded = jwt.verify(token, process.env.secretKey2);
        renderDashboard(res, 'Account Settings', 'settings', decoded.username)
    } catch (err) {
        res.redirect('/hj9h');
    }
});

/* Verify Password */
router.post('/verify-password', async function(req, res, next) {
    const token = req.cookies.token;
    try {
        const decoded = jwt.verify(token, process.env.secretKey2);
        const user = decoded.username;
        const password = req.body.password;
        database.getConnection ( async (err, connection)=> {
            if (err) throw (err);
    
            async function checkBlockedUser(user) {
                if (user.BlockExpiration && user.BlockExpiration > Date.now()) {
                    return true;
                }
                return false;
            }
    
            const sqlSearch = "Select * from Candidate_Credentials where Username = ?";
            const search_query = mysql.format(sqlSearch,[user]);
            await connection.query (search_query, async (err, result) => {
                connection.release();
                
                if (err) throw (err);
                if (result.length == 0 || result.length == 1 && !(result[0].Username)) {
                    console.log("User does not exist")
                    return res.status(500).send('Server error');
                }
                else {
                    const blockedUser = await checkBlockedUser(result[0]);
                    if (blockedUser) {
                        console.log("User account is currently blocked")
                        res.render('candidate/candidate_login', { title: 'Login' });
                        return;
                    }
    
                    const hashedPasswordInDB = result[0].Password;
                    const saltInDB = result[0].Salt;
    
                    if (await argon2.verify(hashedPasswordInDB, password, { salt: saltInDB })) {
                        if (err) throw err;
                        return res.status(200).json({ msg: 'Password verified' });
                    }
                    else {
                        return res.status(500).send('Server not verified');
                    }
                }
            })
        })
    } catch (err) {
        res.redirect('/hj9h');
    }
});

/* Update User Details */
router.post('/settings', async function(req, res, next){
    const token = req.cookies.token;
    try {
        const decoded = jwt.verify(token, process.env.secretKey2);
        var username = decoded.username;
        var fname = req.body.candidatefname;
        var lname = req.body.candidatelname;
        var email = req.body.candidateemail;
        var password = req.body.candidatepassword;

        var update_query;
        var query;

        //Verify Password - backend
        //Invalid or unchanged Password
        if (password === "unchanged" || !validatePassword(password)) {
            update_query = `UPDATE Candidate
                            inner join Candidate_Category
                            on Candidate.CandidateId = Candidate_Category.CandidateId
                            inner join Candidate_Credentials
                            on Candidate.CandidateId = Candidate_Credentials.CandidateId
                            SET fName = ?, 
                            lName = ?, 
                            Email = ?
                            WHERE Candidate_Credentials.Username = ?`;
            query = mysql.format(update_query, [fname, lname, email, username]);
        }
        //Valid Password
        else {
            const salt = randomstring.generate(16);
            const hashedPassword = await argon2.hash(String(password));
            update_query = `UPDATE Candidate
                                inner join Candidate_Category
                                on Candidate.CandidateId = Candidate_Category.CandidateId
                                inner join Candidate_Credentials
                                on Candidate.CandidateId = Candidate_Credentials.CandidateId
                                SET fName = ?,
                                lName = ?,
                                Email = ?,
                                Password = ?,
                                Salt = ?
                                WHERE Candidate_Credentials.Username = ?`;;
            query = mysql.format(update_query, [fname, lname, email, hashedPassword, salt, username]);
        }

        database.getConnection( async (err, connection) => {
            if (err) console.log(err)
            connection.query(query, async (err, result) => {
                connection.release();
                if (err)
                    throw (err);
                console.log ("Edited Candidate Details");
                res.redirect('/hj9h');
            })
        })
    } catch (err) {
        res.redirect('/hj9h');
    }
});

/* View User Campaign */
router.get('/campaign', async function(req, res, next){
    const token = req.cookies.token;
    try {
        const decoded = jwt.verify(token, process.env.secretKey2);
        renderDashboard(res, 'Campaign', 'editCampaign', decoded.username)
    } catch (err) {
        res.redirect('/hj9h');
    }
});

/* Upload Campaign Icon */
router.post('/upload-icon', upload.single('image'), (req, res) => {
    const token = req.cookies.token;
    try {
        const decoded = jwt.verify(token, process.env.secretKey2);
        if (decoded) {
            const filePath = req.file.path;
            res.status(200).json({ message: "File uploaded successfully!", filePath: filePath});
        }
    } catch {
        res.redirect('/hj9h');
    }
});

/* Upload Campaign Media */
router.post('/upload-media', upload.array('file', 10), (req, res) => {
    const token = req.cookies.token;
    try {
        const decoded = jwt.verify(token, process.env.secretKey2);
        if (decoded) {
            const filesData = req.files.map(file => ({
                path: file.path,
                mimeType: file.mimetype
            }));
            res.status(200).json({ message: "Files uploaded successfully!", filesData });
        }
    } catch (err) {
        res.redirect('/hj9h');
    }
});

/* Edit User Campaign */
router.post('/campaign', async function(req, res, next){
    const token = req.cookies.token;
    try {
        const decoded = jwt.verify(token, process.env.secretKey2);
        var username = decoded.username;
        var contactno = req.body.candidatecontactno;
        var slogan = req.body.candidateslogan;
        var overview = req.body.candidateoverview;
        var facebook = req.body.candidatefacebook;
        var twitter = req.body.candidatetwitter;
        var instagram = req.body.candidateinstagram;
        var candidateid = req.body.candidateid;
        var categoryid = req.body.categoryid;
        const agendas = req.body.updatedAgendas ? JSON.parse(req.body.updatedAgendas) : [];
        const picture = req.body.picture ? req.body.picture.replace('public', '') : null;
        const media = req.body.media ? JSON.parse(req.body.media) : [];

        var update_query;
        var query;

        const remove_agenda_query = `DELETE FROM Agenda WHERE CandidateId = ?`;
        const remove_media_query = `DELETE FROM Candidate_Media WHERE CandidateId = ?`;
        const removeAgendas = mysql.format(remove_agenda_query, [candidateid]);
        const removeMedia = mysql.format(remove_media_query, [candidateid]);
        const sqlInsertAgenda = "insert into Agenda (CandidateId, CategoryId, Summary) values (?,?,?)";

        update_query = `UPDATE Candidate
                            inner join Candidate_Category
                            on Candidate.CandidateId = Candidate_Category.CandidateId
                            inner join Candidate_Credentials
                            on Candidate.CandidateId = Candidate_Credentials.CandidateId
                            left join Agenda
                            on Candidate.CandidateId = Agenda.CandidateId
                            SET ContactNo = ?,
                            Instagram = ?,
                            Twitter = ?,
                            Facebook = ?,
                            Slogan = ?,
                            Overview = ?
                            WHERE Candidate_Credentials.Username = ?`;
        query = mysql.format(update_query, [contactno, instagram, twitter, facebook, slogan, overview, username]);

        database.getConnection( async (err, connection) => {
            if (err) throw(err)
            connection.query(query, async (err, result) => {
                if (err) throw (err);
                await connection.query(removeAgendas, async (err, result) => {
                    if (err) throw (err);
                    for (let i = 0; i < agendas.length; i++) {
                        const agenda = agendas[i];
            
                        const insert_agenda_query = mysql.format(sqlInsertAgenda,[candidateid, categoryid, agenda]);
                        await connection.query(insert_agenda_query, async (err, result) => {
                            if (err) throw (err);
                            connection.query(query, async (err, result) => {
                                if (err) throw (err);
                            });
                        });
                    }
                    upload_query = `UPDATE Candidate_Category SET picture_path = ? WHERE CandidateId = ?`;
                    query = mysql.format(upload_query, [picture, candidateid]);
                    await connection.query(query, async (err, results) => {
                        if (err) throw (err);
                        await connection.query(removeMedia,  async (err, results) => {
                            if (err) throw (err);
                            if (media.length > 0) {
                                const mediaQuery = `INSERT INTO Candidate_Media (CandidateId, CategoryId, file_path, type) VALUES ?`;
                                const mediaValues = media.map(file => [candidateid, categoryid, file.path.replace('public', ''), file.mimeType.startsWith('image') ? 'image' : 'video']);
    
                                await connection.query(mediaQuery, [mediaValues], async (err, results) => {
                                    if (err) {
                                        console.error(err);
                                    }
                                });
                            }
                        });
                    });
                    console.log("Edited Campaign");
                    return res.redirect('/hj9h');
                });
            });
        })
    } catch (err) {
        console.log(err);
        res.redirect('/hj9h');
    }
});

/* Log Out */
router.get('/logout', async function(req, res, next){
    const token = req.cookies.token;
    try {
        const decoded = jwt.verify(token, process.env.secretKey2);
        res.clearCookie('token');
        database.getConnection( async (err, connection) => {
            const updateLogIn = "UPDATE Candidate_Credentials SET LoginAttempts = 0 WHERE Username = ?";
            const update_query = mysql.format(updateLogIn, [decoded.username]);
            await connection.query(update_query, async (err, result) => {
                if (err) throw err;
                res.redirect('/hj9h');
            });
        });
    } catch (err) {
        res.redirect('/hj9h');
    }
});

module.exports = router;