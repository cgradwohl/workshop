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

### Integration Tests
Test the integration points in the real systems.
- for positive paths can use real services
- for failure conditions use stubs and mocks so it does not break live services

### e2e or Acceptance Tests
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

TODO:
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

