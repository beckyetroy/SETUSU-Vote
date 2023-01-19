var express = require('express');
var router = express.Router();
var database = require('../database');
const bcrypt = require("bcrypt");
var mysql = require('mysql');
var adminLoggedIn = false;

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
            res.render('admin_dashboard', { title: title, action:action, data:result});
            }
            else {
                res.render('admin_dashboard', { title: title, action:action, data:result});
            }
        })
    })
}

/* GET admin login page. */
router.get('/', function(req, res, next) {
    if (adminLoggedIn) renderDashboard(res, 'Admin Dashboard', 'list');
    else res.render('admin_login', { title: 'Login' });
});

/* Login Authentication. */
router.post('/', async function(req, res, next) {
    if (adminLoggedIn) renderDashboard(res, 'Admin Dashboard', 'list');
    else {
        //Handle user log in
        const user = req.body.username;
        const password = req.body.password;

        database.getConnection ( async (err, connection)=> {
            if (err) throw (err)
            const sqlSearch = "Select * from Admin_Credentials where UserName = ?"
            const search_query = mysql.format(sqlSearch,[user])
            await connection.query (search_query, async (err, result) => {
                connection.release()
                
                if (err) throw (err)
                if (result.length == 0) {
                console.log("User does not exist")
                res.render('admin_login', { title: 'Login' });
                }
                else {
                    const hashedPassword = await bcrypt.hash(result[0].Password,10);

                    if (await bcrypt.compare(password, hashedPassword)) {
                    console.log("Login Successful")
                    adminLoggedIn = true;
                    renderDashboard(res, 'Welcome to the Admin Dashboard!', 'list');
                    } 
                    else {
                    console.log("Password Incorrect")
                    res.render('admin_login', { title: 'Login' });
                    }
                }
            })
        })
    }
});

/* Open Register Election Form */
router.post('/register-election', async function(req, res, next) {
    if (adminLoggedIn) renderDashboard(res, 'Register Election','add');
    else res.redirect('/hj9h8765qzf5jizwwnua');
});

/* Register Election */
router.post('/election-add', async function(req, res, next) {
    if (adminLoggedIn) {
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
        })
    }
    else res.redirect('/hj9h8765qzf5jizwwnua');
});

/* View Election Details */
router.get('/view/:id', function(req, res, next){
    if (adminLoggedIn) {
        var id = req.params.id;
        var query = `select concat(fName, ' ', lName) AS 'CandidateName', CandidateId, Id, Description, ElectionDate, OpenTime, CloseTime,
        CategoryName, CategoryDescription
        from Election
        left join Candidate on Election.Id = Candidate.ElectionId
        left join Category on Election.Id = Category.ElectionId
        where Election.Id = "${id}";`;
        database.getConnection( async (err, connection) => {
            if (err) console.log(err)
            connection.query(query, async (err, result) => {
                connection.release();
                if (err)
                    throw (err);
                console.log("Viewing Election");
                res.render('admin_dashboard', { title: 'View Election', action: 'view', data: result});
            })
        })
    }
    else res.redirect('/hj9h8765qzf5jizwwnua');
});

/* View Edit Election Details */
router.get('/edit/:id', function(req, res, next){
    if (adminLoggedIn) {
        var id = req.params.id;
        var query = `select Id, Description, ElectionDate, OpenTime, CloseTime, CategoryName, CategoryDescription
        from Election left join Category
        on Election.Id = Category.ElectionId
        where Id = "${id}";`;
        database.getConnection( async (err, connection) => {
            if (err) console.log(err)
            connection.query(query, async (err, result) => {
                connection.release();
                if (err)
                    throw (err);
                console.log("Editing Election");
                res.render('admin_dashboard', { title: 'Edit Election', action: 'edit', data: result});
            })
        })
    }
    else res.redirect('/hj9h8765qzf5jizwwnua');
});

/* Edit Election Details */
router.post('/edit/:id', function(req, res, next){
    if (adminLoggedIn) {
        var id = req.params.id;
        var description = req.body.electiondescription;
        var date = req.body.electiondate;
        var opentime = date + ' ' + req.body.electionopeningtime + ':00';
        var closetime = date + ' ' + req.body.electionclosingtime + ':00';
        const categories = JSON.parse(req.body.updatedCategories);

        var query = `
        UPDATE Election
        SET Description = "${description}", 
        ElectionDate = "${date}", 
        OpenTime = "${opentime}", 
        CloseTime = "${closetime}" 
        WHERE id = "${id}"
        `;
        const removeCategories = `DELETE FROM Category WHERE ElectionId = "${id}"`
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
    }
    else res.redirect('/hj9h8765qzf5jizwwnua');
});

/* Delete Election */
router.get('/delete/:id', function(req, res, next){
    if (adminLoggedIn) {
        var id = req.params.id;
        var query = `delete from Election where Id = "${id}";`;
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
    }
    else res.redirect('/hj9h8765qzf5jizwwnua');
});

/* Open Register Candidate Form */
router.post('/register-candidate', async function(req, res, next) {
    if (adminLoggedIn) {
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
                res.render('admin_dashboard', { title: 'Register Candidate', action:'addCandidate', data:result});
            })
        })
    }
    //renderDashboard(res, 'Register Candidate','addCandidate');
    else res.redirect('/hj9h8765qzf5jizwwnua');
});

/* Register Candidate */
router.post('/candidate-add', async function(req, res, next) {
    if (adminLoggedIn) {
        const fname = req.body.candidatefname;
        const lname = req.body.candidatelname;
        const email = req.body.candidateemail;
        const election = req.body.election;
        const category = req.body.category;

        database.getConnection( async (err, connection) => {
            if (err) throw (err)
            const sqlInsert = "insert into Candidate (fName, lName, Email, ElectionId) values (?,?,?,?)";
            const sqlInsertCategory = "insert into Candidate_Category (CategoryId, CandidateId) values (?,?)";
            const sqlInsertCredentials = "insert into Candidate_Credentials (CandidateId, Username, Password) values (?,?,?)";
            const insert_query = mysql.format(sqlInsert,[fname, lname, email, election]);

            await connection.query (insert_query, async (err, result)=> {
            connection.release();
            if (err) throw (err)
            console.log ("Created Candidate");
            const candidateId = result.insertId;
            const insert_category_query = mysql.format(sqlInsertCategory,[category, candidateId]);
            await connection.query(insert_category_query, async (err, result) => {
                if (err) throw (err);
                const insert_credentials_query = mysql.format(sqlInsertCredentials,[candidateId, "User123", "Password123"]);
                await connection.query(insert_credentials_query, (err, result) => {
                    if (err) throw (err);
                    console.log("Added category to candidate");
                    res.redirect('/hj9h8765qzf5jizwwnua');
                });
            });
            });
        })
    }
    else res.redirect('/hj9h8765qzf5jizwwnua');
});


/* View Candidate Details */
router.get('/viewcandidate/:id', function(req, res, next){
    if (adminLoggedIn) {
        var id = req.params.id;
        var query = `select Candidate.CandidateId, fName, lName, Email,
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
        where Candidate.CandidateId = "${id}";`;
        database.getConnection( async (err, connection) => {
            if (err) console.log(err)
            connection.query(query, async (err, result) => {
                connection.release();
                if (err)
                    throw (err);
                console.log("Viewing Candidate");
                res.render('admin_dashboard', { title: 'View Candidate', action: 'viewcandidate', data:result});
            })
        })
    }
    else res.redirect('/hj9h8765qzf5jizwwnua');
});

/* View Edit Candidate Details */
router.get('/editcandidate/:id', function(req, res, next){
    if (adminLoggedIn) {
        var id = req.params.id;
        var query = `SELECT fName, lName, Email, CategoryName, Candidate.CandidateId,
        Category.CategoryId, Id, Description, Username, Password
        FROM (SELECT * FROM Candidate WHERE CandidateId = "${id}") AS candidate
        LEFT JOIN Candidate_Category ON candidate.CandidateId = Candidate_Category.CandidateId
        LEFT JOIN Category ON Candidate_Category.CategoryId = Category.CategoryId
        LEFT JOIN Election ON candidate.ElectionId = Election.Id
        LEFT JOIN Candidate_Credentials ON candidate.CandidateId = Candidate_Credentials.CandidateId`;

        database.getConnection( async (err, connection) => {
            if (err) console.log(err)
            connection.query(query, async (err, result) => {
                connection.release();
                if (err)
                    throw (err);
                console.log("Editing Candidate");
                res.render('admin_dashboard', { title: 'Edit Candidate', action: 'editcandidate', data: result});
            })
        })
    }
    else res.redirect('/hj9h8765qzf5jizwwnua');
});

/* Edit Candidate Details */
router.post('/editcandidate/:id', function(req, res, next){
    if (adminLoggedIn) {
        var id = req.params.id;
        console.log(id);
        var fname = req.body.candidatefname;
        var lname = req.body.candidatelname;
        var email = req.body.candidateemail;
        var election = req.body.election;
        var category = req.body.category;
        var username = req.body.candidateusername;
        var password = req.body.candidatepassword;

        var query = `UPDATE Candidate
        inner join Candidate_Category
        on Candidate.CandidateId = Candidate_Category.CandidateId
        inner join Candidate_Credentials
        on Candidate.CandidateId = Candidate_Credentials.CandidateId
        SET fName = "${fname}", 
        lName = "${lname}", 
        Email = "${email}", 
        ElectionId = "${election}",
        CategoryId = "${category}",
        Username = "${username}",
        Password = "${password}"
        WHERE Candidate.CandidateId = "${id}"
        `;
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
    }
    else res.redirect('/hj9h8765qzf5jizwwnua');
});

/* Delete Candidate */
router.get('/deletecandidate/:id', function(req, res, next){
    if (adminLoggedIn) {
        var id = req.params.id;
        var query = `delete from Candidate where CandidateId = "${id}";`;
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
    }
    else res.redirect('/hj9h8765qzf5jizwwnua');
});

module.exports = router;
