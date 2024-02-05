const test = require('ava')
const {communeIsInPerimeters} = require('../perimeters')

test('communeIsInPerimeters : bad commune', t => {
  const p = [{
    type: 'commune',
    code: '91400'
  },
  {
    type: 'commune',
    code: '91401'
  }]
  t.is(communeIsInPerimeters('57415', p), false)
})

test('communeIsInPerimeters : good commune', t => {
  const p = [{
    type: 'commune',
    code: '91400'
  },
  {
    type: 'commune',
    code: '91401'
  }]
  t.is(communeIsInPerimeters('91400', p), true)
})

test('communeIsInPerimeters : bad departement', t => {
  const p = [{
    type: 'departement',
    code: '91'
  },
  {
    type: 'departement',
    code: '11'
  }]
  t.is(communeIsInPerimeters('01001', p), false)
})

test('communeIsInPerimeters : good departement', t => {
  const p = [{
    type: 'departement',
    code: '91'
  },
  {
    type: 'departement',
    code: '11'
  }]
  t.is(communeIsInPerimeters('91534', p), true)
})

test('communeIsInPerimeters : bad epci', t => {
  const p = [{
    type: 'epci',
    code: '200000172'
  },
  {
    type: 'epci',
    code: '200000438'
  }]
  t.is(communeIsInPerimeters('91400', p), false)
})

test('communeIsInPerimeters : good epci', t => {
  const p = [{
    type: 'epci',
    code: '200000172'
  },
  {
    type: 'epci',
    code: '200000438'
  }]
  t.is(communeIsInPerimeters('74042', p), true)
})
