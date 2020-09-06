const when = require('../steps/when')
const given = require('../steps/given')
const tearDown = require('../steps/tearDown')
const { init } = require('../steps/init')
const AWS = require('aws-sdk')
console.log = jest.fn()

const mockPutEvents = jest.fn()
// here we are mocking the EventBridge putEvent
// The problem is that, to validate the events that are sent to EventBridge it'll
// take a bit of extra infrastructure set up. Because you can't just call EventBridge
// and ask what events it had just received on a bus recently.
// TODO: implement this: https://theburningmonk.com/2019/09/how-to-include-sns-and-kinesis-in-your-e2e-tests/
AWS.EventBridge.prototype.putEvents = mockPutEvents

describe('Given an authenticated user', () => {
  let user

  beforeAll(async () => {
    await init()
    user = await given.an_authenticated_user()
  })

  afterAll(async () => {
    await tearDown.an_authenticated_user(user)
  })

  describe(`When we invoke the POST /orders endpoint`, () => {
    let resp

    beforeAll(async () => {
      mockPutEvents.mockClear()
      mockPutEvents.mockReturnValue({
        promise: async () => {}
      })

      resp = await when.we_invoke_place_order(user, 'Fangtasia')
    })

    it(`Should return 200`, async () => {
      expect(resp.statusCode).toEqual(200)
    })

    it(`Should publish a message to EventBridge bus`, async () => {
      // here we are just validating the event shape that comes out of the event bus put event
      // only validate EventBridge was called when executing as an integration test using mocks
      // TODO: naming TEST_MODE as 'handler' for integration test mode and 'http' as e2e test mode is really stupid and confusing...change that! :)
      if (process.env.TEST_MODE === 'handler') {
        expect(mockPutEvents).toBeCalledWith({
          Entries: [
            expect.objectContaining({
              Source: 'big-mouth',
              DetailType: 'order_placed',
              Detail: expect.stringContaining(`"restaurantName":"Fangtasia"`),
              EventBusName: expect.stringMatching(process.env.bus_name)
            })
          ]
        })
      }
    })
  })
})