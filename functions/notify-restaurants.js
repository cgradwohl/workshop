const middy = require('middy')
const EventBridge = require('aws-sdk/clients/eventbridge')
const eventBridge = new EventBridge()
const SNS = require('aws-sdk/clients/sns')
const sns = new SNS()

const busName = process.env.bus_name
const topicArn = process.env.restaurant_notification_topic


/**
 * This notify-restaurant function would be trigger by EventBridge, and by the place_order event that we publish from the place-order function.
 */
module.exports.handler = middy(async (event) => {
  // note: when EventBridge invokes our function, event.detail is going to be an object, and it's called detail not Detail
  // even though the put event we defined in the place order funciton was event.Detail :
  /**
   * await eventBridge.putEvents({
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
   */
  const order = event.detail
  const snsReq = {
    Message: JSON.stringify(order),
    TopicArn: topicArn
  };

  // here we publish a message to the RestaurantNotificationTopic SNS topic to notify the restaurant of a new order.
  await sns.publish(snsReq).promise()

  const { restaurantName, orderId } = order
  console.log(`notified restaurant [${restaurantName}] of order [${orderId}]`)

  // And then it will publish a restaurant_notified event.
  await eventBridge.putEvents({
    Entries: [{
      Source: 'big-mouth',
      DetailType: 'restaurant_notified',
      Detail: JSON.stringify(order),
      EventBusName: busName
    }]
  }).promise()

  console.log(`published 'restaurant_notified' event to EventBridge`)
})
