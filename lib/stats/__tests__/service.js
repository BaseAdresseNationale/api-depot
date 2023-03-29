const test = require('ava')
const {sub, format} = require('date-fns')
const StatsService = require('../service')

test('getCumulFirstRevisionsByDate', t => {
  const revisions = [
    {publishedAt: sub(new Date(), {days: 1})},
    {publishedAt: sub(new Date(), {days: 2})},
    {publishedAt: sub(new Date(), {days: 3})},
    {publishedAt: sub(new Date(), {days: 4})},
    {publishedAt: sub(new Date(), {days: 5})},
    {publishedAt: sub(new Date(), {days: 6})}
  ]
  const res = StatsService.getCumulFirstRevisionsByDate(revisions, {from: sub(new Date(), {days: 7}), to: new Date()})
  const resExpected = [
    {date: format(sub(new Date(), {days: 7}), 'yyyy-MM-dd'), totalCreations: 0},
    {date: format(sub(new Date(), {days: 6}), 'yyyy-MM-dd'), totalCreations: 0},
    {date: format(sub(new Date(), {days: 5}), 'yyyy-MM-dd'), totalCreations: 1},
    {date: format(sub(new Date(), {days: 4}), 'yyyy-MM-dd'), totalCreations: 2},
    {date: format(sub(new Date(), {days: 3}), 'yyyy-MM-dd'), totalCreations: 3},
    {date: format(sub(new Date(), {days: 2}), 'yyyy-MM-dd'), totalCreations: 4},
    {date: format(sub(new Date(), {days: 1}), 'yyyy-MM-dd'), totalCreations: 5},
    {date: format(sub(new Date(), {days: 0}), 'yyyy-MM-dd'), totalCreations: 6}
  ]
  t.is(res.length, 8)
  t.deepEqual(res, resExpected)
})

test('getBalsByDays', t => {
  const revisions = [
    {publishedAt: sub(new Date(), {days: 2}), codeCommune: '00000'},
    {publishedAt: sub(new Date(), {days: 2}), codeCommune: '00000'},
    {publishedAt: sub(new Date(), {days: 2}), codeCommune: '00000'},
    {publishedAt: sub(new Date(), {days: 2}), codeCommune: '00001'},
    {publishedAt: sub(new Date(), {days: 5}), codeCommune: '00001'},
    {publishedAt: sub(new Date(), {days: 6}), codeCommune: '00001'}
  ]
  const res = StatsService.getBalsByDays(revisions)
  const resExpected = [
    {
      date: format(sub(new Date(), {days: 2}), 'yyyy-MM-dd'),
      publishedBAL: [
        {codeCommune: '00000', numPublications: 3},
        {codeCommune: '00001', numPublications: 1}
      ]
    },
    {
      date: format(sub(new Date(), {days: 5}), 'yyyy-MM-dd'),
      publishedBAL: [
        {codeCommune: '00001', numPublications: 1}
      ]
    },
    {
      date: format(sub(new Date(), {days: 6}), 'yyyy-MM-dd'),
      publishedBAL: [
        {codeCommune: '00001', numPublications: 1}
      ]
    }
  ]
  t.deepEqual(res, resExpected)
})

