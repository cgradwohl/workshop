const middy = require('middy')
const EventBridge = require('aws-sdk/clients/eventbridge')
const eventBridge = new EventBridge()
const chance = require('chance').Chance()

const busName = process.env.bus_name

/**
 * As part of the POST body in the request, it expects the restaurantName to be passed in.
 * And upon receiving a request, all it's doing is publishing an event to the EventBridge
 * bus and let some other process handle it, we will have to create a rule for this PUT event
 * of DetailType: 'order_placed' and as part of that event bridge rule we would attach a target
 * process to run when this event is published in our system.
 */
module.exports.handler = middy(async (event) => {
  const restaurantName = JSON.parse(event.body).restaurantName

  // validate the restaurant name data?

  const orderId = chance.guid()
  console.log(`placing order ID [${orderId}] to [${restaurantName}]`)

  await eventBridge.putEvents({
    Entries: [{
      Source: 'big-mouth',
      DetailType: 'order_placed',
      Detail: JSON.stringify({
        orderId,
        restaurantName,
      }),
      EventBusName: busName
    }]
  }).promise()

  console.log(`published 'order_placed' event into EventBridge`)

  const response = {
    statusCode: 200,
    body: JSON.stringify({ orderId })
  }

  return response
})
