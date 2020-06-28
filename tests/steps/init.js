const { promisify } = require('util')
const awscred = require('awscred') //resolves the AWS credentials using the awscred module and puts the access key and secret into the environment variables.
require('dotenv').config() // loading the environment variables from the .env file

let initialized = false

const init = async () => {
  if (initialized) {
    return
  }
  
  // awscred resolves AWS credentials using, in order: environment variables, INIT files, and HTTP calls
  // 1. the `serverless-export-env` plugin export our env variables to a file called .env for us
  // 2. require('dotenv').config() loads those environment variables into the execution procress
  // 3. awscred reads those variables from the environment process and resolves them for us.
  const { credentials, region } = await promisify(awscred.load)()
  
  process.env.AWS_ACCESS_KEY_ID     = credentials.accessKeyId
  process.env.AWS_SECRET_ACCESS_KEY = credentials.secretAccessKey
  process.env.AWS_REGION            = region

  // necessary to cater for when you're authenticated as an IAM role (instead of an IAM user).
  if (credentials.sessionToken) {
    process.env.AWS_SESSION_TOKEN = credentials.sessionToken
  }

  console.log('AWS credential loaded')

  initialized = true
}

module.exports = {
  init
}
