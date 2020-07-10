# clinical-trial-matching-service

Backend service that calls [TrialScope's](https://www.trialscope.com/) APIs for the front-end clinical-trial-matching-engine.

For more information on the architecture and data schemas of the clinical trial matching system, please visit the clinical-trial-matching-engine [wiki](https://github.com/mcode/clinical-trial-matching-engine/wiki).

# Setup

1. Create a file named `.env.local` in the root of the project and add `TRIALSCOPE_TOKEN=<api_token>` to the top of the file and save (where `<api-token>` is the TrialScope-provided API token)
2. Download and unzip folder of trials from (https://clinicaltrials.gov/ct2/resources/download#DownloadAllData) and place it in the src folder. Name it 'AllPublicXML'
3. Run `npm install`
4. Run `npm run-script build`
5. Run `npm start`
6. The service will now be running at http://localhost:3000/

# Lint and tests

Use `npm run lint` to run the linter and `npm test` to run tests.