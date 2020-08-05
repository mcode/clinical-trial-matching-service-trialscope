import * as https  from 'https';
import * as fs from 'fs';
//import { downloadRemoteBackups, TrialBackup } from './trialbackup';
import { exec } from 'child_process';
import * as parser from 'xml2json';
import { resolve } from 'dns';

export function downloadRemoteBackups(ids: string []){
    let url = 'https://clinicaltrials.gov/ct2/download_studies?term=';
    for ( const id of ids){
      url +=`${id}+OR+`;
    }
    //remove trailing +OR+
    url=url.slice(0,-4);
    console.log(url);
    const file = fs.createWriteStream("backup.zip");
   
    return new Promise<void>((resolve, reject) => {
        try {
            const request =  https.get(url, function(response) {
                response.pipe(file).on('close', () => {
                    exec('unzip ./backup -d ./backups/', (error, stdout, stderr) => {
                        resolve();
                    });
                });
            });    
        }      
        catch(err) {
            reject(err);
        }
    });
    
}
    
   /* exec(`curl ${url} --output spec/data/backup.zip && unzip spec/data/backup.zip`, function () {
      
    }); */
   

downloadRemoteBackups(['NCT03587740','NCT02513394']).then(() => {
 //   console.log(res);
    
   
    const filePath = `./backups/NCT02513394.xml`;
    const data = fs.readFileSync(filePath, { encoding: 'utf8' });
    const json = JSON.parse(parser.toJson(data));
    console.log(json.clinical_study.eligibility.criteria.textblock);
    fs.unlink("./backup.zip", err => { 
        if (err) console.log(err); 
      }); 
    fs.rmdir("./backups/", {recursive: true}, err => { 
        if (err) console.log(err); 
      }); 
});

