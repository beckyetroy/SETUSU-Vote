var express = require('express');

var router = express.Router();

var database = require('../database');

router.get("/", function(request, response, next){

	var query = "select fName, lName, Email, StudentNo, Voted, Description as 'Election'  from Voter join Election on Voter.ElectionId = Election.ElectionId;";

	database.query(query, function(error, data){
        console.log(data);

		if(error)
		{
			throw error; 
		}
		else
		{
			response.render('sample_data', {title:'Displaying Data on Front-End', action:'list', sampleData:data});
		}

	});

});

module.exports = router;