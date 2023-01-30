var express = require('express');
var router = express.Router();
var database = require('../database');
const argon2 = require('argon2');
const randomstring = require("randomstring");
var mysql = require('mysql');
const jwt = require('jsonwebtoken');
var crypto = require('crypto');
const blockTime = 15; //15 minutes

function renderDashboard(res, title, action) {
    console.log("Logged in");
};

/* GET candidate login page. */
router.get('/', function(req, res, next) {
    const token = req.cookies.token;
    try {
        const decoded = jwt.verify(token, process.env.secretKey);
        if (decoded) {
            renderDashboard(res, 'Candidate Dashboard', 'list');
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
                        const token = jwt.sign({username: user}, process.env.secretKey, { expiresIn: '15m' });
                        res.cookie('token', token);
                        renderDashboard(res, 'Candidate Dashboard', 'list');
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

module.exports = router;