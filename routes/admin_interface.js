var express = require('express');
var router = express.Router();
var database = require('../database');
const bcrypt = require("bcrypt");
var mysql = require('mysql');
var adminLoggedIn = false;

function renderDashboard(res, title, action) {
    database.getConnection ( async (err, connection)=> {
        if (err) throw (err)
        const sqlSearch = "Select * from Election"
        await connection.query (sqlSearch, async (err, result) => {
            connection.release()
            
            if (err) throw (err)
            if (result.length == 0) {
            console.log("No Elections Registered.")
            res.render('admin_dashboard', { title: title, action:action, electionData:result});
            }
            else {
                res.render('admin_dashboard', { title: title, action:action, electionData:result});
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

        database.getConnection( async (err, connection) => {
            if (err) throw (err)
            const sqlInsert = "insert into Election (Description, ElectionDate, OpenTime, CloseTime) values (?,?,?,?)";
            const insert_query = mysql.format(sqlInsert,[description, date, opentime, closetime]);

            await connection.query (insert_query, (err, result)=> {
            connection.release();
            if (err) throw (err)
            console.log ("Created Election");
            res.redirect('/hj9h8765qzf5jizwwnua');
            })
        })
    }
    else res.redirect('/hj9h8765qzf5jizwwnua');
});

/* View Election Details */
router.get('/view/:id', function(req, res, next){
    if (adminLoggedIn) {
        var id = req.params.id;
        var query = `select concat(fName, ' ', lName) AS 'CandidateName', Id, Description, ElectionDate, OpenTime, CloseTime
        from Candidate join Election
        on Election.Id = Candidate.ElectionId
        where Id = "${id}";`;
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
        var query = `select * from Election where Id = "${id}";`;
        database.getConnection( async (err, connection) => {
            if (err) console.log(err)
            connection.query(query, async (err, result) => {
                connection.release();
                if (err)
                    throw (err);
                console.log("Editing Election");
                res.render('admin_dashboard', { title: 'Edit Election', action: 'edit', data: result[0]});
            })
        })
    }
    else res.redirect('/hj9h8765qzf5jizwwnua');
});

/* Edit Election Details */
router.post('/edit/:id', function(req, res, next){
    if (adminLoggedIn) {
        var id = req.params.id;
        console.log(id);
        var description = req.body.electiondescription;
        var date = req.body.electiondate;
        var opentime = date + ' ' + req.body.electionopeningtime + ':00';
        var closetime = date + ' ' + req.body.electionclosingtime + ':00';

        var query = `
        UPDATE Election
        SET Description = "${description}", 
        ElectionDate = "${date}", 
        OpenTime = "${opentime}", 
        CloseTime = "${closetime}" 
        WHERE id = "${id}"
        `;
        database.getConnection( async (err, connection) => {
            if (err) console.log(err)
            connection.query(query, async (err, result) => {
                connection.release();
                if (err)
                    throw (err);
                console.log ("Edited Election");
                res.redirect('/hj9h8765qzf5jizwwnua');
            })
        })
    }
    else res.redirect('/hj9h8765qzf5jizwwnua');
});

module.exports = router;
