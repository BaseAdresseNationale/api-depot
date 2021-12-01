#!/usr/bin/env node
const {outputFile} = require('fs-extra')
const csvParse = require('csv-parser')
const getStream = require('get-stream').array
const {omit} = require('lodash')
const got = require('got')

const models = {
  elu: require('./elu'),
  mandat: require('./mandats/common'),
  cm: require('./mandats/cm')
}

async function loadMandats(url, codeMandat, registry) {
  const rows = await getStream(
    got.stream(url, {responseType: 'buffer'})
      .pipe(csvParse({
        separator: '\t',
        mapHeaders: ({header}) => {
          const headersMapping = {
            ...models.elu.headersMapping,
            ...models.mandat.headersMapping,
            ...models[codeMandat].headersMapping
          }
          if (!(header in headersMapping)) {
            return null
          }

          return headersMapping[header]
        }
      }))
  )

  rows.forEach(row => {
    const elu = models.elu.prepare(row)
    const mandat = {
      ...models.mandat.prepare(row),
      ...models[codeMandat].prepare(row)
    }

    if (!elu) {
      return
    }

    if (!(elu.id in registry)) {
      registry[elu.id] = {
        ...omit(elu, 'id'),
        mandats: []
      }
    }

    registry[elu.id].mandats.push(mandat)
  })
}

async function main() {
  const registry = {}
  await loadMandats('https://www.data.gouv.fr/fr/datasets/r/d5f400de-ae3f-4966-8cb6-a85c70c6c24a', 'cm', registry)
  await outputFile('elus.json',
    '[\n' + Object.values(registry).map(item => JSON.stringify(item)).join(',\n') + ']\n'
  )
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
