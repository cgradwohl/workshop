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
console.log = jest.fn() // silence the funtions console logs

describe(`When we invoke the GET / endpoint`, () => {
  beforeAll(async () => await init())
  
  /**
   * How can we make the tests more reliable/ resiliant without relying on the data from the database?
   * 
   * 1. The data that the tests need to assert on inorder to pass,
   * should be created during the beforeAll() step. i.e. insert some data
   * into the DB.
   * 
   * 2. The data should then be removed during the afterAll() step.
   * 
   * 3. Since we are using infrastructure ass code is it considered best practice to spin up
   * a new testing stack, setup the data and run the tests against the test stack, then tear it all down.
   */
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
