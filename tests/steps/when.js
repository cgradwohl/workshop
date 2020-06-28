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
const { promisify } = require('util')

/**
 * To allow the when module to toggle between "invoke function locally" and
 * "call the deployed API", we can use an environment variable that is set
 * when we run the test.
 * 
 * for integration tests we call TEST_MODE=handler at runtime
 * for e2e tests we call TEST_MODE=http at runtime
 */
const mode = process.env.TEST_MODE

const viaHandler = async (event, functionName) => {
  // sinnce we are using the middy middleware lib on our functions (which helps us access ssm), we need to promisify the callback that the middy wrapped handlers onw return.
  const handler = promisify(require(`${APP_ROOT}/functions/${functionName}`).handler)

  const context = {}

  // literally just call the function with an event and context object
  const response = await handler(event, context)
  const contentType = _.get(response, 'headers.Content-Type', 'application/json');
  if (_.get(response, 'body') && contentType === 'application/json') {
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

/**
 * When you send HTTP requests to AWS, you sign the requests so that AWS can identify who sent them.
 * We sign requests with our AWS access key, which consists of an access key ID and secret access key.
 * 
 * Signing makes sure that the request has been sent by someone with a valid access key.
 * 
 * For this test we are signing the request for API Gateway. Amazon API Gateway requires that you authenticate
 * every request you send by signing the request.
 * 
 * For payload-less methods, such as GET, the SignedHeaders string, used to sign the request using Signature Version 4,
 * must include host;x-amz-date.
 * For method requiring payloads, such as POST, the SignedHeaders string must also include content-type.
 * Unlike other AWS services, such as DynamoDB, the x-amz-target header is not required to compute the Authorization header value.
 * 
 * More Infor here: https://docs.aws.amazon.com/apigateway/api-reference/signing-requests/
 */
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
    
    const iamAuthHeader = _.get(opts, "iam_auth", false)
    if (iamAuthHeader === true) {
      headers = signHttpRequest(url)
    }

    const authHeader = _.get(opts, "auth")
    if (authHeader) {
      headers.Authorization = authHeader // this should be user.idToken
    }

    const httpReq = http.request({
      method, url, headers, data
    })

    const res = await httpReq

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
const we_invoke_search_restaurants = async (theme, user) => {
  const body = JSON.stringify({ theme })

  switch (mode) {
    case 'handler':
      // NOTE: for integration testing, we are just testing the connection from cognito to the rest of stack
      // NOTE: therefore we just invoke without the auth
      return await viaHandler({ body }, 'search-restaurants')
    case 'http':
      const auth = user.idToken
      return await viaHttp('restaurants/search', 'POST', { body, auth })
    default:
      throw new Error(`unsupported mode: ${mode}`)
  }
}

const we_invoke_place_order = async (user, restaurantName) => {
  const body = JSON.stringify({ restaurantName })

  switch (mode) {
    case 'handler':
      return await viaHandler({ body }, 'place-order')
    case 'http':
      const auth = user.idToken
      return await viaHttp('orders', 'POST', { body, auth })
    default:
      throw new Error(`unsupported mode: ${mode}`)
  }
}

const we_invoke_notify_restaurant = async (event) => {
  if (mode === 'handler') {
    await viaHandler(event, 'notify-restaurant')
  } else {
    throw new Error('not supported')
  }
}

module.exports = {
  we_invoke_get_index,
  we_invoke_get_restaurants,
  we_invoke_search_restaurants,
  we_invoke_place_order,
  we_invoke_notify_restaurant
}
