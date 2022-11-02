var express = require('express');
var router = express.Router();
var database = require('../database');
const bcrypt = require("bcrypt");
var mysql = require('mysql');

/* GET admin login page. */
router.get('/', function(req, res, next) {
    res.render('admin_login', { title: 'Login' });
});

/* Login Authentication. */
router.post('/', async function(req, res, next) {
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
                res.render('admin_dashboard', { title: 'Dashboard' });
                } 
                else {
                console.log("Password Incorrect")
                res.render('admin_login', { title: 'Login' });
                }
            }
        })
    })
});

module.exports = router;
