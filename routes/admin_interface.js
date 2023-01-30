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
    database.getConnection ( async (err, connection)=> {
        if (err) throw (err)
        const sqlSearch =
            `select * from Election
            left outer join Candidate
            on Election.Id = Candidate.ElectionId
            union
            select * from Election
            right outer join Candidate
            on Election.Id = Candidate.ElectionId;`
        await connection.query (sqlSearch, async (err, result) => {
            connection.release()
            
            if (err) throw (err)
            if (result.length == 0) {
            console.log("Nothing Registered.")
            res.render('admin/admin_dashboard', { title: title, action:action, data:result});
            }
            else {
                res.render('admin/admin_dashboard', { title: title, action:action, data:result});
            }
        })
    })
};

var Password = {
    _pattern : /[a-zA-Z0-9_\-\+\.]/,
    _getRandomByte : function() {
        return crypto.randomBytes(1)[0];
    },

    generate : function(length) {
        return Array.apply(null, {'length': length})
        .map(function() {
            var result;
            while(true) {
                result = String.fromCharCode(this._getRandomByte());
                if(this._pattern.test(result)) return result;
            }
        }, this)
        .join('');
    }
};

/* GET admin login page. */
router.get('/', function(req, res, next) {
    const token = req.cookies.token;
    try {
        const decoded = jwt.verify(token, process.env.secretKey);
        if (decoded) {
            renderDashboard(res, 'Admin Dashboard', 'list');
        }
    } catch (err) {
        if (err.name === 'TokenExpiredError' || err.name === 'JsonWebTokenError') {
            res.render('admin/admin_login', { title: 'Login' });
        } else {
            console.log(err);
            res.render('admin/admin_login', { title: 'Login' });
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
            const sql = "UPDATE Admin_Credentials SET BlockExpiration = ? WHERE UserName = ?";
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

        const sqlSearch = "Select * from Admin_Credentials where UserName = ?";
        const search_query = mysql.format(sqlSearch,[user]);
        await connection.query (search_query, async (err, result) => {
            connection.release();
            
            if (err) throw (err);
            if (result.length == 0) {
                console.log("User does not exist")
                res.render('admin/admin_login', { title: 'Login' });
            }
            else {
                const blockedUser = await checkBlockedUser(result[0]);
                if (blockedUser) {
                    console.log("User account is currently blocked")
                    res.render('admin/admin_login', { title: 'Login' });
                    return;
                }

                const salt = randomstring.generate(16);

                const hashedPasswordInDB = result[0].Password;
                const saltInDB = result[0].Salt;
                let loginAttempts = result[0].LoginAttempts;

                if (await argon2.verify(hashedPasswordInDB, password, { salt: saltInDB })) {
                    console.log("Login Successful");
                    const updateSalt = "UPDATE Admin_Credentials SET Salt = ?, LoginAttempts = 0, BlockExpiration = NULL WHERE UserName = ?";
                    const update_query = mysql.format(updateSalt, [salt, user]);
                    await connection.query(update_query, async (err, result) => {
                        if (err) throw err;
                        const token = jwt.sign({username: user}, process.env.secretKey, { expiresIn: '15m' });
                        res.cookie('token', token);
                        renderDashboard(res, 'Admin Dashboard', 'list');
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
                    const updateAttempts = "UPDATE Admin_Credentials SET LoginAttempts = ? WHERE UserName = ?";
                    const update_query = mysql.format(updateAttempts, [loginAttempts, user]);
                    await connection.query(update_query, async (err, result) => {
                        if (err) throw err;
                        res.render('admin/admin_login', { title: 'Login' });
                        return;
                    });
                }
            }
        })
    })
});

/* Open Register Election Form */
router.post('/register-election', async function(req, res, next) {
    const token = req.cookies.token;
    try {
        const decoded = jwt.verify(token, process.env.secretKey);
        if (decoded) {
            renderDashboard(res, 'Register Election','add');
        }
    } catch (err) {
        res.redirect('/hj9h8765qzf5jizwwnua');
    }
});

/* Register Election */
router.post('/election-add', async function(req, res, next) {
    const token = req.cookies.token;
    try {
        const decoded = jwt.verify(token, process.env.secretKey);
        if (decoded) {
            const description = req.body.electiondescription;
            const date = req.body.electiondate;
            const opentime = date + ' ' + req.body.electionopeningtime + ':00';
            const closetime = date + ' ' + req.body.electionclosingtime + ':00';
            const categories = JSON.parse(req.body.categories);

            database.getConnection( async (err, connection) => {
                if (err) throw (err)
                const sqlInsert = "insert into Election (Description, ElectionDate, OpenTime, CloseTime) values (?,?,?,?)";
                const insert_query = mysql.format(sqlInsert,[description, date, opentime, closetime]);
                const sqlInsertCategory = "insert into Category (CategoryName, CategoryDescription, ElectionId) values (?,?,?)";

                await connection.query (insert_query, async (err, result)=> {
                    connection.release();
                    if (err) throw (err)
                    console.log ("Created Election");
                    const electionId = result.insertId;
                    for (let i = 0; i < categories.length; i++) {
                        const category = categories[i];
                        const categoryName = category.name;
                        const categoryDescription = category.description;
            
                        const insert_category_query = mysql.format(sqlInsertCategory,[categoryName, categoryDescription, electionId]);
                        await connection.query(insert_category_query, async (err, result) => {
                            if (err) throw (err);
                        });
                    }
                    res.redirect('/hj9h8765qzf5jizwwnua');
                });
            });
        }
    } catch (err) {
        res.redirect('/hj9h8765qzf5jizwwnua');
    }
});

/* View Election Details */
router.get('/view/:id', async function(req, res, next){
    const token = req.cookies.token;
    try {
        const decoded = jwt.verify(token, process.env.secretKey);
        var id = req.params.id;
        const view_query = `select concat(fName, ' ', lName) AS 'CandidateName', CandidateId, Id, Description, ElectionDate, OpenTime, CloseTime,
                    CategoryName, CategoryDescription
                    from Election
                    left join Candidate on Election.Id = Candidate.ElectionId
                    left join Category on Election.Id = Category.ElectionId
                    where Election.Id = ?`;
        const query = mysql.format(view_query, [id]);
        database.getConnection( async (err, connection) => {
            if (err) console.log(err)
            connection.query(query, async (err, result) => {
                connection.release();
                if (err)
                    throw (err);
                console.log("Viewing Election");
                res.render('admin/admin_dashboard', { title: 'View Election', action: 'view', data: result});
            })
        })
    } catch (err) {
        res.redirect('/hj9h8765qzf5jizwwnua');
    }
});

/* View Edit Election Details */
router.get('/edit/:id', async function(req, res, next){
    const token = req.cookies.token;
    try {
        const decoded = jwt.verify(token, process.env.secretKey);
        var id = req.params.id;
        const edit_query = `select Id, Description, ElectionDate, OpenTime, CloseTime, CategoryName, CategoryDescription
                            from Election left join Category
                            on Election.Id = Category.ElectionId
                            where Id = ?`;
        const query = mysql.format(edit_query, [id]);
        database.getConnection( async (err, connection) => {
            if (err) console.log(err)
            connection.query(query, async (err, result) => {
                connection.release();
                if (err)
                    throw (err);
                console.log("Editing Election");
                res.render('admin/admin_dashboard', { title: 'Edit Election', action: 'edit', data: result});
            })
        })
    } catch (err) {
        res.redirect('/hj9h8765qzf5jizwwnua');
    }
});

/* Edit Election Details */
router.post('/edit/:id', async function(req, res, next){
    const token = req.cookies.token;
    try {
        jwt.verify(token, process.env.secretKey);
        var id = req.params.id;
        var description = req.body.electiondescription;
        var date = req.body.electiondate;
        var opentime = date + ' ' + req.body.electionopeningtime + ':00';
        var closetime = date + ' ' + req.body.electionclosingtime + ':00';
        const categories = JSON.parse(req.body.updatedCategories);

        var id = req.params.id;
        const update_query = `UPDATE Election
                            SET Description = ?, 
                            ElectionDate = ?, 
                            OpenTime = ?, 
                            CloseTime = ? 
                            WHERE id = ?`;
        const query = mysql.format(update_query, [description, date, opentime, closetime, id]);

        const remove_category_query = `DELETE FROM Category WHERE ElectionId = ?`;
        const removeCategories = mysql.format(remove_category_query, [id]);
        const sqlInsertCategory = "insert into Category (CategoryName, CategoryDescription, ElectionId) values (?,?,?)";

        database.getConnection( async (err, connection) => {
            if (err) console.log(err)
            connection.query(query, async (err, result) => {
                if (err) throw (err);
                await connection.query(removeCategories, async (err, result) => {
                    if (err) throw (err);
                    for (let i = 0; i < categories.length; i++) {
                        const category = categories[i];
                        const categoryName = category.name;
                        const categoryDescription = category.description;
            
                        const insert_category_query = mysql.format(sqlInsertCategory,[categoryName, categoryDescription, id]);
                        await connection.query(insert_category_query, async (err, result) => {
                            if (err) throw (err);
                        });
                    }
                });
                connection.release();
                console.log ("Edited Election");
                res.redirect('/hj9h8765qzf5jizwwnua');
            })
        })
    } catch (err) {
        res.redirect('/hj9h8765qzf5jizwwnua');
    }
});

/* Delete Election */
router.get('/delete/:id', async function(req, res, next){
    const token = req.cookies.token;
    try {
        const decoded = jwt.verify(token, process.env.secretKey);
        var id = req.params.id;
        const remove_query = `delete from Election where Id = ?`;
        const query = mysql.format(remove_query, [id]);
        database.getConnection( async (err, connection) => {
            if (err) console.log(err)
            connection.query(query, async (err, result) => {
                connection.release();
                if (err)
                    throw (err);
                console.log("Deleted Election");
                res.redirect('/hj9h8765qzf5jizwwnua');
            })
        })
    } catch (err) {
        res.redirect('/hj9h8765qzf5jizwwnua');
    }
});

/* Open Register Candidate Form */
router.post('/register-candidate', async function(req, res, next) {
    const token = req.cookies.token;
    try {
        const decoded = jwt.verify(token, process.env.secretKey);
        database.getConnection ( async (err, connection)=> {
            if (err) throw (err)
            const sqlSearch =
                `select * from Election
                left outer join Candidate
                on Election.Id = Candidate.ElectionId
                left outer join Category
                on Election.Id = Category.ElectionId
                union
                select * from Election
                right outer join Candidate
                on Election.Id = Candidate.ElectionId
                right outer join Category
                on Election.Id = Category.ElectionId;`
            await connection.query (sqlSearch, async (err, result) => {
                connection.release()

                if (err) throw (err)
                res.render('admin/admin_dashboard', { title: 'Register Candidate', action:'addCandidate', data:result});
            })
        })
    } catch (err) {
        res.redirect('/hj9h8765qzf5jizwwnua');
    }
});

/* Register Candidate */
router.post('/candidate-add', async function(req, res, next) {
    const token = req.cookies.token;
    try {
        const decoded = jwt.verify(token, process.env.secretKey);
        const fname = req.body.candidatefname;
        const lname = req.body.candidatelname;
        const email = req.body.candidateemail;
        const election = req.body.election;
        const category = req.body.category;
        var password = Password.generate(16);
        const salt = randomstring.generate(16);
        const hashedPassword = await argon2.hash(String(password));
        console.log(hashedPassword);
        console.log(password);
        var username = fname.charAt(0) + lname;

        database.getConnection( async (err, connection) => {
            if (err) throw (err)
            const sqlInsert = "insert into Candidate (fName, lName, Email, ElectionId) values (?,?,?,?)";
            const sqlInsertCategory = "insert into Candidate_Category (CategoryId, CandidateId) values (?,?)";
            const sqlInsertCredentials = "insert into Candidate_Credentials (CandidateId, Username, Password, Salt) values (?,?,?,?)";
            const insert_query = mysql.format(sqlInsert,[fname, lname, email, election]);

            var i = 0;
            const fetch_candidates = `SELECT * From Candidate
                                    join Candidate_Credentials
                                    on Candidate.CandidateId = Candidate_Credentials.CandidateId`;

            await connection.query(fetch_candidates, async (err, result) => {
                if (err) throw (err);

                for (candidate of result) {
                    if (candidate.Username === username) {
                        i++;
                        username = username + String(i);
                    }
                }

                await connection.query (insert_query, async (err, result)=> {
                    connection.release();
                    if (err) throw (err)
                    console.log ("Created Candidate");
                    const candidateId = result.insertId;
                    const insert_category_query = mysql.format(sqlInsertCategory,[category, candidateId]);
                    await connection.query(insert_category_query, async (err, result) => {
                        if (err) throw (err);
                        const insert_credentials_query = mysql.format(sqlInsertCredentials,[candidateId, username, hashedPassword, salt]);
                        await connection.query(insert_credentials_query, (err, result) => {
                            if (err) throw (err);
                            res.render('admin/admin_dashboard', { title: 'Credentials', action: 'generatecandidate', username: String(username), password: String(password)});
                        });
                    });
                });
            });
        })
    } catch (err) {
        console.log(err);
        res.redirect('/hj9h8765qzf5jizwwnua');
    }
});

/* View Candidate Details */
router.get('/viewcandidate/:id', async function(req, res, next){
    const token = req.cookies.token;
    try {
        const decoded = jwt.verify(token, process.env.secretKey);
        var id = req.params.id;
        const view_query = `select Candidate.CandidateId, fName, lName, Email,
                            CategoryName, NumVotes,
                            Description, Username, Password
                            from Candidate join Candidate_Category
                            on Candidate.CandidateId = Candidate_Category.CandidateId
                            left join Category
                            on Candidate_Category.CategoryId = Category.CategoryId
                            left join Election
                            on Candidate.ElectionId = Election.Id
                            left join Candidate_Credentials
                            on Candidate.CandidateId = Candidate_Credentials.CandidateId
                            where Candidate.CandidateId = ?`;
        const query = mysql.format(view_query, [id]);
        database.getConnection( async (err, connection) => {
            if (err) console.log(err)
            connection.query(query, async (err, result) => {
                connection.release();
                if (err) throw (err);
                const hashedPasswordInDB = result[0].Password;
                const saltInDB = result[0].Salt;
                const candidatePassword = await argon2.verify(hashedPasswordInDB, { salt: saltInDB });
                result[0].Password = candidatePassword;
                console.log(candidatePassword);
                console.log(result[0].Password);
                console.log("Viewing Candidate");
                res.render('admin/admin_dashboard', { title: 'View Candidate', action: 'viewcandidate', data:result});
            })
        })
    } catch (err) {
        res.redirect('/hj9h8765qzf5jizwwnua');
    }
});

/* View Edit Candidate Details */
router.get('/editcandidate/:id', async function(req, res, next){
    const token = req.cookies.token;
    try {
        const decoded = jwt.verify(token, process.env.secretKey);
        var id = req.params.id;
        const cand_query = `SELECT fName, lName, Email, CategoryName, Candidate.CandidateId,
                            Category.CategoryId, Id, Description, Username, Password
                            FROM (SELECT * FROM Candidate WHERE CandidateId = ?) AS candidate
                            LEFT JOIN Candidate_Category ON candidate.CandidateId = Candidate_Category.CandidateId
                            LEFT JOIN Category ON Candidate_Category.CategoryId = Category.CategoryId
                            LEFT JOIN Election ON candidate.ElectionId = Election.Id
                            LEFT JOIN Candidate_Credentials ON candidate.CandidateId = Candidate_Credentials.CandidateId`;
        const candidateQuery = mysql.format(cand_query, [id]);
        const categoryQuery = `SELECT * FROM Category`;
        const electionQuery = `SELECT * FROM Election`;

        database.getConnection( async (err, connection) => {
            if (err) console.log(err)
            const [candidateResult, categoryResult, electionResult] = await Promise.all([
                new Promise((resolve, reject) => {
                    connection.query(candidateQuery, (err, result) => {
                        if (err) reject(err);
                        else resolve(result);
                    });
                }),
                new Promise((resolve, reject) => {
                    connection.query(categoryQuery, (err, result) => {
                        if (err) reject(err);
                        else resolve(result);
                    });
                }),
                new Promise((resolve, reject) => {
                    connection.query(electionQuery, (err, result) => {
                        if (err) reject(err);
                        else resolve(result);
                    });
                })
            ]);
            connection.release();
            const candidatePassword = await argon2.verify(candidateResult[0].Password, process.env.secretKey);
            candidateResult[0].Password = candidatePassword;
            console.log(candidatePassword);
            console.log(candidateResult[0].Password);
            console.log("Editing Candidate");
            res.render('admin/admin_dashboard', { title: 'Edit Candidate', action: 'editcandidate', data: candidateResult,
                categoryData: categoryResult, electionData: electionResult});
        })
    } catch (err) {
        res.redirect('/hj9h8765qzf5jizwwnua');
    }
});

/* Edit Candidate Details */
router.post('/editcandidate/:id', async function(req, res, next){
    const token = req.cookies.token;
    try {
        const decoded = jwt.verify(token, process.env.secretKey);
        var id = req.params.id;
        var fname = req.body.candidatefname;
        var lname = req.body.candidatelname;
        var email = req.body.candidateemail;
        var election = req.body.election;
        var category = req.body.category;
        var username = req.body.candidateusername;
        var password = req.body.candidatepassword;

        const update_query = `UPDATE Candidate
                            inner join Candidate_Category
                            on Candidate.CandidateId = Candidate_Category.CandidateId
                            inner join Candidate_Credentials
                            on Candidate.CandidateId = Candidate_Credentials.CandidateId
                            SET fName = ?, 
                            lName = ?, 
                            Email = ?, 
                            ElectionId = ?,
                            CategoryId = ?,
                            Username = ?,
                            Password = ?
                            WHERE Candidate.CandidateId = ?`;
        const query = mysql.format(update_query, [fname, lname, email, election, category, username, password, id]);

        database.getConnection( async (err, connection) => {
            if (err) console.log(err)
            connection.query(query, async (err, result) => {
                connection.release();
                if (err)
                    throw (err);
                console.log ("Edited Candidate");
                res.redirect('/hj9h8765qzf5jizwwnua');
            })
        })
    } catch (err) {
        res.redirect('/hj9h8765qzf5jizwwnua');
    }
});

/* Delete Candidate */
router.get('/deletecandidate/:id', async function(req, res, next){
    const token = req.cookies.token;
    try {
        const decoded = jwt.verify(token, process.env.secretKey);
        var id = req.params.id;
        const delete_query = `delete from Candidate where CandidateId = ?`;
        const query = mysql.format(delete_query, [id]);
        database.getConnection( async (err, connection) => {
            if (err) console.log(err)
            connection.query(query, async (err, result) => {
                connection.release();
                if (err)
                    throw (err);
                console.log("Deleted Candidate");
                res.redirect('/hj9h8765qzf5jizwwnua');
            })
        })
    } catch (err) {
        res.redirect('/hj9h8765qzf5jizwwnua');
    }
});

/* Log Out */
router.get('/logout', async function(req, res, next){
    const token = req.cookies.token;
    try {
        const decoded = jwt.verify(token, process.env.secretKey);
        res.clearCookie('token');
        database.getConnection( async (err, connection) => {
            const updateLogIn = "UPDATE Admin_Credentials SET LoginAttempts = 0 WHERE UserName = ?";
            const update_query = mysql.format(updateLogIn, [decoded.username]);
            await connection.query(update_query, async (err, result) => {
                if (err) throw err;
                res.redirect('/hj9h8765qzf5jizwwnua');
            });
        });
    } catch (err) {
        res.redirect('/hj9h8765qzf5jizwwnua');
    }
});

module.exports = router;
