var express = require('express');
var router = express.Router();
var database = require('../database');
const argon2 = require('argon2');
const randomstring = require("randomstring");
var mysql = require('mysql');
const jwt = require('jsonwebtoken');
var crypto = require('crypto');
const blockTime = 15; //15 minutes

function renderDashboard(res, title, action, username) {
    database.getConnection ( async (err, connection)=> {
        if (err) throw (err)
        const candidate_query =
            `select Candidate.CandidateId, fName, lName, Email,
                    CategoryName, NumVotes,
                    Description, Username
                    from Candidate join Candidate_Category
                    on Candidate.CandidateId = Candidate_Category.CandidateId
                    left join Category
                    on Candidate_Category.CategoryId = Category.CategoryId
                    left join Election
                    on Candidate.ElectionId = Election.Id
                    left join Candidate_Credentials
                    on Candidate.CandidateId = Candidate_Credentials.CandidateId
                    where Candidate_Credentials.Username = ?`;
        const query = mysql.format(candidate_query, username);
        await connection.query (query, async (err, result) => {
            connection.release()
            
            if (err) throw (err)
            if (result.length == 0) {
            console.log("An error occurred. Please verify user details.")
            res.render('candidate/candidate_dashboard', { title: title, action:action, data:result});
            }
            else {
                res.render('candidate/candidate_dashboard', { title: title, action:action, data:result});
            }
        })
    })
};

/* GET candidate login page. */
router.get('/', function(req, res, next) {
    const token = req.cookies.token;
    try {
        const decoded = jwt.verify(token, process.env.secretKey);
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
                        const token = jwt.sign({username: user}, process.env.secretKey, { expiresIn: '30m' });
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

/* Log Out */
router.get('/logout', async function(req, res, next){
    const token = req.cookies.token;
    try {
        const decoded = jwt.verify(token, process.env.secretKey);
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