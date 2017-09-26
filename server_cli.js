const socdb = require('./server')

async function main () {
  const server = new socdb.Server({port: 6001})
  await server.start()
}

main()
