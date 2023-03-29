const test = require('ava')
const {checkQueryDateFromTo} = require('../routes')

test('checkDateFromTo lake to', async t => {
  const error = await t.throws(() =>
    checkQueryDateFromTo({query: {from: '2022-06-06'}})
  )
  t.is(error.message, 'Il manque une date from ou to')
})

test('checkDateFromTo lake from', async t => {
  const error = await t.throws(() =>
    checkQueryDateFromTo({query: {to: '2022-06-06'}})
  )
  t.is(error.message, 'Il manque une date from ou to')
})

test('checkDateFromTo bad to', async t => {
  const error = await t.throws(() =>
    checkQueryDateFromTo({query: {to: 'xxxx', from: '2022-06-06'}})
  )
  t.is(error.message, 'Les dates ne sont pas valides')
})

test('checkDateFromTo bad from', async t => {
  const error = await t.throws(() =>
    checkQueryDateFromTo({query: {to: '2022-06-06', from: 'xxxx'}})
  )
  t.is(error.message, 'Les dates ne sont pas valides')
})

test('checkDateFromTo from after to', async t => {
  const error = await t.throws(() =>
    checkQueryDateFromTo({query:
      {from: '2022-06-07', to: '2022-06-06'}
    })
  )
  t.is(error.message, 'La date from est plus vielle que la date to')
})
