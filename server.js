try{
	var express = require('express'),
		app = express(),
		bodyParser = require('body-parser'),
		config = require('./env.js'),
		enviroment = new config().defaultEnvObject(),
		fetch = require('node-fetch');
		app.use(bodyParser.json());
		
		app.use(function (req, res, next) {
   
         // Website you wish to allow to connect
         res.setHeader('Access-Control-Allow-Origin', '*');
     
         // Request methods you wish to allow
         res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
     
         // Request headers you wish to allow
         res.setHeader('Access-Control-Allow-Headers', 'Cache-Control, Pragma, Origin, Authorization, Content-Type, X-Requested-With, WU-Api-Key, WU-Api-Secret');
         
         next();
      });
      
     
	  
	  /* Default call*/
      app.get('/', function(req, res) {
			   res.status(200).send("Hello from Clinical Trial");
       });
	   
	   /* get clinical trial results*/
      app.post('/getClinicalTrial', function(req, res) {
				var myHeaders = new fetch.Headers;
				myHeaders.append("Content-Type", "application/json");
				myHeaders.append("Authorization", "Bearer "+enviroment.token);
				
				var raw = JSON.stringify({"query": req.body.inputParam});

				var requestOptions = {
				  method: 'POST',
				  headers: myHeaders,
				  body: raw,
				  redirect: 'follow'
				};
				
				fetch(enviroment.trialscope_endpoint, requestOptions)
				  .then(response => response.text())
				  .then(result => {
					  res.status(200).send(result);
				  })
				  .catch(error =>{
					  res.status(400).send(error);
				  });
       });
	  
	  app.listen(enviroment.port)
}
catch(e){
}