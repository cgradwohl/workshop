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

const we_invoke_get_index = () => viaHandler({}, 'get-index')
const we_invoke_get_restaurants = () => viaHandler({}, 'get-restaurants')

module.exports = {
  we_invoke_get_index,
  we_invoke_get_restaurants
}
