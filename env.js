'use strict';
const fs = require('fs'),
  path = require('path');

const defaults = {
  TRIALSCOPE_ENDPOINT: 'https://clinicaltrialconnect.dev/graphql',
  PORT: 3000,
  TRIALSCOPE_TOKEN: null
};

try {
  // Sadly there is no good way to *synchronously* read lines from a file and
  // Node provides no way to make a module load wait on a Promise.
  const envLocal = fs.readFileSync(path.join(__dirname, '.env.local'), { encoding: 'utf8' });
  // Note that the following will collapse \r\r into a single line, but it
  // doesn't matter, empty lines are ignored anyway.
  for (const line of envLocal.split(/\r?[\r\n]/)) {
    const m = /^\s*(\w+)\s*=\s*(.*)\s*$/.exec(line);
    if (m) {
      const k = m[1], value = m[2];
      if (k in defaults) {
        defaults[k] = value;
      }
    }
  }
} catch(ex) {
  // Ignore ENOENT, it means the file doesn't exist, which is fine
  if (ex.code !== 'ENOENT') {
    console.error('Unexpected error loading .env.local:');
    console.error(ex);
  }
}

// Override defaults with environment variables if they exist
for (const k in defaults) {
  if (k in process.env) {
    defaults[k] = process.env[k];
  }
}

class configuration {
  constructor() {
    // Default to defaults
    for (const k in defaults) {
      this[k] = defaults[k];
    }
  }
  defaultEnvObject() {
    return {
      port: this.PORT,
      TRIALSCOPE_TOKEN: this.TRIALSCOPE_TOKEN,
      trialscope_endpoint: this.TRIALSCOPE_ENDPOINT
    };
  }
}
module.exports = configuration;

if (module.parent === null) {
  console.log('Environment as loaded:');
  for (const k in defaults) {
    console.log(`  ${k} = ${defaults[k]}`);
  }
}
