/**
 * As you can see, the viaHandler requires the /functions/get-index.handler function and calls it with the
 * event payload {}, and an empty context object {}.And to make it easier to validate the response, it also
 * parses JSON response body if the Content-Type header is application/json or omitted (which would default
 * to application/json anyway).
 * 
 * The reason why we're JSON parsing body is also to mirror the behaviour of the HTTP client axios,
 * which we'll use later when implementing our acceptance tests.
 */
const APP_ROOT = '../../'
const _ = require('lodash')
const aws4 = require('aws4')
const URL = require('url')
const http = require('axios')

/**
 * To allow the when module to toggle between "invoke function locally" and
 * "call the deployed API", we can use an environment variable that is set
 * when we run the test.
 */
const mode = process.env.TEST_MODE

const viaHandler = async (event, functionName) => {
  const handler = require(`${APP_ROOT}/functions/${functionName}`).handler

  const context = {}

  // literally just call the function with an event and context object
  const response = await handler(event, context)
  const contentType = _.get(response, 'headers.Content-Type', 'application/json');
  if (response.body && contentType === 'application/json') {
    response.body = JSON.parse(response.body);
  }
  return response
}

/**
 * 
 * Since axios has a different response structure to our Lambda function, we need the respondFrom method massage the axios response to what we need 
 */
const respondFrom = async (httpRes) => {
  return {
    statusCode: httpRes.status,
    body: httpRes.data,
    headers: {
      'Content-Type': httpRes.headers['content-type'],
      ...http.headers
    }
  }
}

const signHttpRequest = (url) => {
  const urlData = URL.parse(url)
  const opts = {
    host: urlData.hostname,
    path: urlData.pathname
  }

  aws4.sign(opts)
  return opts.headers
}

/**
 * viaHttp method makes a HTTP request to the relative path on
 * the rootUrl environment variable (which we configured in the
 * serverless.yml and loaded through .env file that's generated
 * before every test).
 * 
 * You can pass in an opts object to pass in additional arguments:
 *    body: useful for POST and PUT requests.
 *    iam_auth: we should sign the HTTP request using our IAM credentials (which is what the signHttpRequest method is for)
 *    auth: include this as the Authorization header, used for authenticating against Cognito-protected endpoints (i.e. search-restaurants)
 */
const viaHttp = async (relPath, method, opts) => {
  const url = `${process.env.rootUrl}/${relPath}`
  console.info(`invoking via HTTP ${method} ${url}`)

  try {
    const data = _.get(opts, "body")
    let headers = {}
    if (_.get(opts, "iam_auth", false) === true) {
      headers = signHttpRequest(url)
    }

    const authHeader = _.get(opts, "auth")
    if (authHeader) {
      headers.Authorization = authHeader
    }

    const httpReq = http.request({
      method, url, headers, data
    })

    const res = await httpReq

    /***
     * Since axios has a different response structure to our Lambda function, we need the respondFrom method massage the axios response to what we need.
     */
    const dude = respondFrom(res);
    console.log('DUDE', dude);
    return respondFrom(res)
  } catch (err) {
    if (err.status) {
      return {
        statusCode: err.status,
        headers: err.response.headers
      }
    } else {
      throw err
    }
  }
}

const we_invoke_get_index = async () => {
  switch (mode) {
    case 'handler':
      return await viaHandler({}, 'get-index')
    case 'http':
      return await viaHttp('', 'GET')
    default:
      throw new Error(`unsupported mode: ${mode}`)
  }
}
const we_invoke_get_restaurants = async () => {
  switch (mode) {
    case 'handler':
      return await viaHandler({}, 'get-restaurants')
    case 'http':
      return await viaHttp('restaurants', 'GET', { iam_auth: true })
    default:
      throw new Error(`unsupported mode: ${mode}`)
  }
}
const we_invoke_search_restaurants = theme => {
  let event = { 
    body: JSON.stringify({ theme })
  }
  return viaHandler(event, 'search-restaurants')
}

module.exports = {
  we_invoke_get_index,
  we_invoke_get_restaurants,
  we_invoke_search_restaurants
}
