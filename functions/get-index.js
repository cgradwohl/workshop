const fs = require("fs")
const Mustache = require('mustache')
const http = require('axios')
const aws4 = require('aws4')
const URL = require('url')

const restaurantsApiRoot = process.env.restaurants_api
const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const template = fs.readFileSync('static/index.html', 'utf-8')

const getRestaurants = async () => {
  console.log(`loading restaurants from ${restaurantsApiRoot}...`)
  const url = URL.parse(restaurantsApiRoot)
  const opts = {
    host: url.hostname,
    path: url.pathname
  }

  // credentials are available in process.env
  console.log('ENV', JSON.stringify(process.env, null, 2));

  aws4.sign(opts)

  const httpReq = http.get(restaurantsApiRoot, {
    headers: opts.headers
  })

  console.log('1', httpReq);
  console.log('2', await httpReq);
  console.log('3', (await httpReq));
  console.log('4', (await httpReq).data);
  
  return (await httpReq).data
}

module.exports.handler = async (event, context) => {
  const restaurants = await getRestaurants()
  console.log(`found ${restaurants.length} restaurants`)  
  const dayOfWeek = days[new Date().getDay()]
  const html = Mustache.render(template, { dayOfWeek, restaurants })
  const response = {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/html; charset=UTF-8'
    },
    body: html
  }

  return response
}