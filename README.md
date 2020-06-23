# clinical-trial-matching-service

Backend service that calls APIs for the front-end clinical-trial-matching-engine.

# Setup

1. Create a file named `.env.local` in the root of the project and add `TRIALSCOPE_TOKEN=<api_token>` to the top of the file and save (where `<api-token>` is the TrialScope-provided API token)
2. Run `npm install`
3. Run `npm run-script build`
3. Run `npm start`
4. The service will now be running at http://localhost:3000/

# Lint and tests

Use `npm run lint` to run the linter and `npm test` to run tests.