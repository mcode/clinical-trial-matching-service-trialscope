class configuration {
  constructor() {
    this.TRIALSCOPE_ENDPOINT = 'https://clinicaltrialconnect.dev/graphql';
    this.PORT = 3000;
    this.TOKEN = process.env.TRIALSCOPE_TOKEN;
  }
  defaultEnvObject() {
    return {
      port : this.PORT,
      token : this.TOKEN,
      trialscope_endpoint : this.TRIALSCOPE_ENDPOINT
    };
  }
}
module.exports = configuration;
