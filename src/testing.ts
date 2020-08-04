import * as https  from 'https';
import * as fs from 'fs';
//import {downloadRemoteBackups} from './trialbackup';
import { exec } from 'child_process';
import { unzip } from 'zlib';
export function downloadRemoteBackups(ids: string []){
    let url = 'https://clinicaltrials.gov/ct2/download_studies?term=';
    for ( const id of ids){
      url +=`${id}+OR+`;
    }
    //remove trailing +OR+
    url=url.slice(0,-4);
    console.log(url);
    const file = fs.createWriteStream("backup.zip");
   
      
    const request = https.get(url, function(response) {
        response.pipe(file);
        exec('unzip ./backup -d ./backups/', function(error,stdout, stderr){
            console.log(error);
            
        });
    });

}
    
   /* exec(`curl ${url} --output spec/data/backup.zip && unzip spec/data/backup.zip`, function () {
      
    }); */
   

downloadRemoteBackups(['NCT03587740','NCT02513394']);
