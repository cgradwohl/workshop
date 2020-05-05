const fs = require("fs")

// This only runs the first time our code executes in a new container
const html = fs.readFileSync('static/index.html', 'utf-8')

module.exports.handler = async (event, context) => {
  const response = {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/html; charset=UTF-8'
    },
    body: html
  }

  return response
}
