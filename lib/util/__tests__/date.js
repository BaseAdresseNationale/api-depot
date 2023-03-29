const test = require('ava')
const DateUtil = require('../date')

test('isValidDate invalid', t => {
  const res = DateUtil.isValidDate('xxxxx')
  t.is(res, false)
})

test('isValidDate valid', t => {
  const res = DateUtil.isValidDate('2022-06-08')
  t.is(res, true)
})

test('checkFromIsBeforeTo invalid', t => {
  const res = DateUtil.checkFromIsBeforeTo('2022-06-08', '2022-06-07')
  t.is(res, false)
})

test('checkFromIsBeforeTo valid', t => {
  const res = DateUtil.checkFromIsBeforeTo('2022-06-06', '2022-06-07')
  t.is(res, true)
})
