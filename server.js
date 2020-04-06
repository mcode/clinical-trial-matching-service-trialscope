try{
	var express = require('express'),
		app = express(),
		bodyParser = require('body-parser'),
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
               res.status(200).send('Hello from Clinical Trial');
       });
	   
	   /* get clinical trial results*/
      app.post('/getClinicalTrial', function(req, res) {
				var myHeaders = new fetch.Headers;
				myHeaders.append("Content-Type", "application/json");
				myHeaders.append("Authorization", "Bearer ***REMOVED***");
				
				var raw = JSON.stringify({"query":"{baseMatches(conditions:["+req.body.conditions+"],baseFilters: {coordinates:{latitude:40.713216,longitude:-75.7496572 },travelRadius:"+req.body.travelRadius+",gender:FEMALE,age:50,phase:"+req.body.phase+",studyType:"+req.body.studyType+"}){totalCount    edges{      node{        nctId        title        conditions        gender        phase        minimumAge        maximumAge        sites {          facility          contactName          contactEmail          contactPhone          latitude          longitude        }      }    }  }}"});

				var requestOptions = {
				  method: 'POST',
				  headers: myHeaders,
				  body: raw,
				  redirect: 'follow'
				};
				
				fetch("https://clinicaltrialconnect.dev/graphql", requestOptions)
				  .then(response => response.text())
				  .then(result => {
					  res.status(200).send(result);
				  })
				  .catch(error =>{
					  res.status(400).send(error);
				  });
       });
	  
	  app.listen(3000)
}
catch(e){
}