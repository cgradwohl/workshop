// /**
//  * In this test, we check that 8 restaurants were returned, and that each has the properties name and image.
//  */
// const { init } = require('../steps/init')
// const when = require('../steps/when')
// console.log = jest.fn()

// describe(`When we invoke the GET /restaurants endpoint`, () => {
//   beforeAll(async () => await init())

//   it(`Should return an array of 8 restaurants`, async () => {
//     // here we are abstracting away HOW we invoke the get-restaurants function.
//     const res = await when.we_invoke_get_restaurants()

//     expect(res.statusCode).toEqual(200)
//     expect(res.body).toHaveLength(8)

//     for (let restaurant of res.body) {
//       expect(restaurant).toHaveProperty('name')
//       expect(restaurant).toHaveProperty('image')
//     }
//   })
// })
