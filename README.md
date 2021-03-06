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
https://docs.aws.amazon.com/eventbridge/latest/APIReference/API_PutEvents.html
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

## lumigo-cli
an excellen tool to trace your AWS events using the tail commands.
- tail-sns
- tail-eventbridge-bus
- Hint: you can find the event bus name and SNS topic name in the .env file. :)

## Partial Failures using AWS Events
1. when processing async events use a Dead Letter Queue via SNS Topic or SQS Queue 
[EventBrridge] -> [Lambda] -> [DLQ]

2. ? Lamda Desinations, on supports failure and on success cases which is like a better DLQ. This provides addional response context and info without having to read logs.

3. 
- Events should be processed in real time.
- Failed events should be retried and should not block the real time constraint.
- Failed events should be retrievable.

4. DynamoDB Stream and Kinesis
- lambda fail case is BLOCKING when using these streams as a the lambdas invocation source, the lambda will coninue to retry for 24 hours :(
- therefore you need to consider partial failures and idempotency when processing Kinesis and DynamoDB srteams with lambda.
- Failed events should be retried and should not block the real time constraint.

## Event Systems n AWS ie. SNS vs SQS vs EventBridge vs Kinesis
#### Concurrency
- SNS and EventBridge have linear concurency
- SNS and EventBridge do not support batch messages, so 100 concurrent messages will invoke 100 concurent lambdas
- note EventBridge has a soft limit of 4000 messages per second (send a support ticket if you need more)

- Because SQS has batched messages it still scales linearly bu at less slope.
- SQS concurenccy is determined by the number of poller functions that AWS runs on your behalf (starts a 5) and scales to more based on the number unique groupids of batches.

- Kinesis has steped concurrency based on number of shards.
- Kinesis one execution per shard by default, where you can ingest 1Mb per shard or 1000 records per second.
- Kinesis improves concurrency per shard by allowing 10 baches of messages executed simulteancy while still guarenteeing order of messsages!

## Event Designs
1. Fan Out - unlike PubSub (which provides every service with a copy of the message), with Fan Out we divide and conquer different parts of the parent task from the original message.
[msg] -> [ventilator(SQS)] -> [lambda_1] ... [lambda_n]

2. Fan In -> aggregate the results from the fan out and produce the final result
[result_1] ... [result_n] -> [reducer]

3. Step Function - The best implementation of a Fan Out -> Fan In sevice is to utilize a step function state machine with the dynamic parallelization feature.

## Bounded Context
- fits within my head, high cohesion, same ownership
- using choreography (via events and SNS) in general for a bounded context system is a bad idea. It is hard to map the e2e solution and undnerstand what is happening when things go wrong, i.e. the workflow does not exisit as a stand alone concept making it difficult to manage. Instead of implementing loosly coupled event based bounded context systems, use a step function instead. It is a good idea to emit events from within a step function so that other services can listen to the progress of the step function. BEWARE THE COST OF STEP FUNCTIONS.


## Orchestration VS Choreography
- Orchestration within a bounded context, do not use events within the bounded context system.
- Choreography betweeen a bounded context, use events to cordinate different systems together

#### Controll Concurrency 
Problem #1: Downstream Throughput Limit (Kinesis vs. SNS/ EventBridge)
Let SNS produce 1000 messgages and therefore creates 1000 concuren execution of our lambda. Then our lambda will need to do sometthing downstrteam like talk to a DB or another service. This downstream lambda target may have a max throughput that cannot keep up with the infinite scale of SNS and lambda.
a. SNS will retry by default. But if the messages are produce at high volume for an extetnded period of time then the retries themselves will fail. Therefore, since we need percise control of the thhroughput in this case we should uttilize Kinesis. The messages will be __amortized__ or safely processed later. :)
b. If on the other hand we do not have this requirement of throughput for a downstream lambda target then we should use SNS/EventBridge

Problem #2: Downstream Outage
If the downstream lambda ttarget experiences an outage, then all of the events produces by SNS and EventBridge that triger the lambda should end up in the dead letter queue DLQ.

With Kinesis the default is to retry until success and 1 poison message can desstroy he entire shard. Additional configurations are available to handle retries.

## TODOs:
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

3. Properly test EventBridge put events. https://theburningmonk.com/2019/09/how-to-include-sns-and-kinesis-in-your-e2e-tests/
See the place-order.tests.js file and  notice that here we are mocking the EventBridge putEvent
The problem is that, to validate the events that are sent to EventBridge it'll
take a bit of extra infrastructure set up. Because you can't just call EventBridge
and ask what events it had just received on a bus recently.
TODO: implement this: https://theburningmonk.com/2019/09/how-to-include-sns-and-kinesis-in-your-e2e-tests/
This article outlines severals approaches to do this for SNS and Kinesis. But the same approaches (that are applicable for SNS) can be applied to EventBridge.
- place-order event test
- notify-restaurant event test

4. Read and understand content filtering with Event Bridge. https://www.tbray.org/ongoing/When/201x/2019/12/18/Content-based-filtering
EventBridge vs SNS vs SQS vs Kinesis 

5. Redo the order and notification workflow using a step function.
[Start] -> [Notify Restaurant] -> [Wait for Restaurant to ACCEPT] -> [Did Resatuarnt ACCEPT ?] -> If NO then [Cancel Order], If Yes, then [Notify User] -> [Wait For Restaurant to Deliver] -> If Delivered then [Complete Order], Else [Cancel Order] -> [End]
