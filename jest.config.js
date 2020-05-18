/**
 * This file configures Jest, the test framework we'll be using.
 * In this case, the testMatch attribute tells Jest where to find our tests.
 */
module.exports = {  
  testEnvironment: 'node',
  testMatch: ['**/test_cases/**/*']
}