export async function main(event, context) {
  const params = {
    TableName: "fe_dev_profiles",
    // 'KeyConditionExpression' defines the condition for the query
    // - 'userId = :userId': only return items with matching 'userId'
    //   partition key
    // 'ExpressionAttributeValues' defines the value in the condition
    // - ':userId': defines 'userId' to be Identity Pool identity id
    //   of the authenticated user
    KeyConditionExpression: "userId = :userId",
    ExpressionAttributeValues: {
      ":userId": event.requestContext.identity.cognitoIdentityId
    }
  };

  try {
    const result = await dynamoDbLib.call("query", params);
    // Return the matching list of items in response body
    return success(result.Items);
  } catch (e) {
    return failure({ status: false });
  }
}

## Integration Tests
Test the integration points in the real systems.
- for positive paths can use real services
- for failure conditions use stubs and mocks so it does not break live services

## e2e or Acceptance Tests
- use real services
- from the api surface to the data persistence layer


Observation
1. more managed services
2. lambda very simple
3. smaller deploy units
4. more configurations

Conclusion
1. the risk of shipping broken software has largely shifted to how your lambda functions integrate with external and AWS services.
2. the risk of misconfiguration both app and IAM has exploded
3. risk profile of serverless is much different

The Test Honeycomb
- less unit tests
- more integration tests
- less e2e tests

## Serverless Project Organization
1. mono repo - easier and faster development times, requires less processes for small teams (100 devs or less)
2. one repo per service - requires more tooling, maintence, documentation and process. better for large orgs (100 devs or more)

## AWS EventBridge
- One of the benefits to using Event Bridge is that you can do content based pattern matching against the content (message) itself, where as 
with SNS you you can only do message filtering based on the message attributes. 

1. Event Bus
- collecting events from a bus and do something
- publishing events to a bus
- there is always a default event bus that the other aws services uses

2. Rules
- you can patern match with rules to the default event bus, rules are identical
- an AWS Event, like a poilcy document, is a formatted JSON blob
```
{
  "version": "0",
  "id": "6a7e8feb-b491-4cf7-a9f1-bf3703467718",
  "detail-type": "EC2 Instance State-change Notification",
  "source": "aws.ec2",
  "account": "111122223333",
  "time": "2017-12-22T18:43:48Z",
  "region": "us-west-1",
  "resources": [
    "arn:aws:ec2:us-west-1:123456789012:instance/ i-1234567890abcdef0"
  ],
  "detail": {
    "instance-id": " i-1234567890abcdef0",
    "state": "terminated"
  }
}
```
But if you are using a custom event bus then you can make custom PUTs to the EventBus
Sends custom events to Amazon EventBridge so that they can be matched to rules.
```
{
   "Entries": [ 
      { 
         "Detail": "string",
         "DetailType": "string",
         "EventBusName": "string",
         "Resources": [ "string" ],
         "Source": "string",
         "Time": number
      }
   ]
}
```

3. Schema Registry 
- to see what event you have in the bus
- your schemas contains all the events from AWS services that you have published to the default Event Bus
- if you want to discover all the events you have published to your custom event buses you need to enable Schema discovery which has an associated cost.

4. Third Party Systems
- you can listen to third party events as opposed to a web hook

TODOs:
1. Make the Tests more reliable
How can we make the tests more reliable/ resiliant without relying on the data from the database?
a. The data that the tests need to assert on inorder to pass, should be created during the beforeAll() step. i.e. insert some data into the DB.
b. The data should then be removed during the afterAll() step.
c. Since we are using infrastructure as code is it considered best practice to spin up a new testing stack, setup the data and run the tests against the test stack, then tear it all down.

2. Implement query string param constraints with SMM
But when we do that, we're gonna want to make sure we have some validation in place so that count has to be within some reasonable range.

We can communicate operation constraints like this (i.e. maxCount) to other services by publishing them as SSM parameters. e.g.

/{service-name}/{stage}/get-restaurants/constraints/maxCount /{service-name}/{stage}/search-restaurants/constraints/maxCount

Or maybe we can bundle everything into a single JSON file, and publish a single parameter.

/{service-name}/{stage}/serviceQuotas

(following AWS's naming)

We're not going to implement it here, but please feel free to take a crack at this yourself if you fancy exploring this idea further ;-)

