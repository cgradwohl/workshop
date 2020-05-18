/**
 * Here we have a single test case that will get the response from get-index, inspect its status code,
 * Content-Type header and the HTML content to make sure it did return 8 restaurants. The magic, however,
 * is in when.we_invoke_get_index, beause it's abstracted away and doesn't specify HOW we invoke 
 * get-index, it allows us to reuse this test case later as an acceptance test where we'll invoke
 * get-index by calling the deployed HTTP GET / endpoint.
 */
const cheerio = require('cheerio')
const when = require('../steps/when')
const { init } = require('../steps/init')

describe(`When we invoke the GET / endpoint`, () => {
  beforeAll(async () => await init())
  
  it(`Should return the index page with 8 restaurants`, async () => {
    const res = await when.we_invoke_get_index()

    expect(res.statusCode).toEqual(200)
    expect(res.headers['Content-Type']).toEqual('text/html; charset=UTF-8')
    expect(res.body).toBeDefined()

    const $ = cheerio.load(res.body)
    const restaurants = $('.restaurant', '#restaurantsUl')
    expect(restaurants.length).toEqual(8)
  })
});
