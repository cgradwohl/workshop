const { promisify } = require('util')
const awscred = require('awscred') //resolves the AWS credentials using the awscred module and puts the access key and secret into the environment variables.
require('dotenv').config() // loading the environment variables from the .env file

let initialized = false

const init = async () => {
  if (initialized) {
    return
  }
  
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
