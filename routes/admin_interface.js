var express = require('express');
var router = express.Router();
var database = require('../database');
const bcrypt = require("bcrypt");
var mysql = require('mysql');
var adminLoggedIn = false;

function renderDashboard(req, res, next) {
    console.log('test');
    database.getConnection ( async (err, connection)=> {
        if (err) throw (err)
        const sqlSearch = "Select * from Election"
        await connection.query (sqlSearch, async (err, result) => {
            connection.release()
            
            if (err) throw (err)
            if (result.length == 0) {
            console.log("No Elections Registered.")
            //TODO
            }
            else {
                res.render('admin_dashboard', { title: 'Admin Dashboard' , action:'list', electionData:result});
            }
        })
    })
}

/* GET admin login page. */
router.get('/', function(req, res, next) {
    if (adminLoggedIn) renderDashboard(req, res, next);
    else res.render('admin_login', { title: 'Login' });
});

/* Login Authentication. */
router.post('/', async function(req, res, next) {
    if (adminLoggedIn) renderDashboard(req, res, next);
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
                    renderDashboard(req, res, next);
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
    res.render('admin_register_election', { title: 'Register Election' });
});

/* Register Election */
router.post('/election-add', async function(req, res, next) {
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
});

module.exports = router;
