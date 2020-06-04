const DocumentClient = require('aws-sdk/clients/dynamodb').DocumentClient
const dynamodb = new DocumentClient()
const middy = require('middy')
const { ssm } = require('middy/middlewares')

const { serviceName, stage } = process.env
const tableName = process.env.restaurants_table

const findRestaurantsByTheme = async (theme, count) => {
  console.log(`finding (up to ${count}) restaurants with the theme ${theme}...`)
  const req = {
    TableName: tableName,
    Limit: count,
    FilterExpression: "contains(themes, :theme)",
    ExpressionAttributeValues: { ":theme": theme }
  }

  const resp = await dynamodb.scan(req).promise()
  console.log(`found ${resp.Items.length} restaurants`)
  return resp.Items
}

const defaultResults = ssm({
  cache: true,
  cacheExpiryInMillis: 5 * 60 * 1000, // 5 mins
  names: {
    config: `/${serviceName}/${stage}/search-restaurants/config`
  },
  onChange: () => {
    const config = JSON.parse(process.env.config)
    process.env.defaultResults = config.defaultResults
  }
});

// we asked the middleware to put the secretString in the context object instead of the environment variable.
// To give our function permission to decrypt the secret value using KMS, we need the ARN for the key.
// we can provision a SSM parameter with the KMS key's ARN, thus allowing our function to access it
const secretString = ssm({
  cache: true,
  cacheExpiryInMillis: 5 * 60 * 1000, // 5 mins
  names: {
    secretString: `/${serviceName}/${stage}/search-restaurants/secretString` // note this param is KMS encrypted.
  },
  setToContext: true
})

module.exports.handler = middy(async (event, context) => {
  const req = JSON.parse(event.body)
  const theme = req.theme
  const restaurants = await findRestaurantsByTheme(theme, process.env.defaultResults)
  const response = {
    statusCode: 200,
    body: JSON.stringify(restaurants)
  }

  console.info('SUPER SSM SECRET  --->   ', context.secretString)

  return response
})
.use(defaultResults)
.use(secretString)
