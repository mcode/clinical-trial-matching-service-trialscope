# clinical-trial-matching-service-trialscope

Backend service that calls [TrialScope's](https://www.trialscope.com/) APIs for the front-end clinical-trial-matching-engine.

For more information on the architecture and data schemas of the clinical trial matching system, please visit the clinical-trial-matching-engine [wiki](https://github.com/mcode/clinical-trial-matching-engine/wiki).

# Setup

1. Create a file named `.env.local` in the root of the project and add `TRIALSCOPE_TOKEN=<api_token>` to the top of the file and save (where `<api-token>` is the TrialScope-provided API token). This is loaded via [`dotenv-flow`](https://github.com/kerimdzhanov/dotenv-flow), see that documentation for details of how `.env` files are loaded.
2. Download and unzip folder of trials from (https://clinicaltrials.gov/ct2/resources/download#DownloadAllData) and place it in the src folder. Name it 'AllPublicXML'
3. Run `npm install`
4. Run `npm run-script build`
5. Run `npm start`
6. The service will now be running at http://localhost:3000/

# Requirements

The ResearchStudy object passed back by this server must be [FHIR-compliant] (https://www.hl7.org/fhir/researchstudy.html) and satisfy several requirements.
Study must contain:
- Title
- Summary
- Site location
- Phase
- Contact Information i.e. sponsor email, phone number
- Study Type
- Inclusion/ Exclusion criteria

Note: _trialbackup.ts_ provides a "backup" system for filling in information missing from the object passed back from the matching service. This system fills in the following based on the trial's NctId:
- Inclusion/Exclusion Criteria
- Phase
- Study Type
- Trial Summary


# Lint and tests

Use `npm run lint` to run the linter and `npm test` to run tests.