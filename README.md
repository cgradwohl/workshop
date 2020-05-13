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

Test Honeycomb
- less unit tests
- more integration tests
- less e2e tests

