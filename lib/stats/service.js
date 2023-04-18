const {groupBy, mapValues} = require('lodash')
const {format, compareDesc, add, endOfDay} = require('date-fns')

function getCumulFirstRevisionsByDate(firstRevisions, dates) {
  const cumulFirstRevisionsByDate = []
  for (
    let dateIterator = endOfDay(new Date(dates.from.getTime()));
    compareDesc(dateIterator, endOfDay(dates.to)) >= 0;
    dateIterator = add(dateIterator, {days: 1})
  ) {
    cumulFirstRevisionsByDate.push({
      date: format(dateIterator, 'yyyy-MM-dd'),
      totalCreations: firstRevisions.filter(firstRevision => compareDesc(firstRevision.publishedAt, dateIterator) === 1).length
    })
  }

  return cumulFirstRevisionsByDate
}

function getBalsByDays(revisions) {
  const revisionsGroupByDays = groupBy(revisions, revision =>
    format(revision.publishedAt, 'yyyy-MM-dd')
  )
  return Object.entries(revisionsGroupByDays).map(([date, revisions]) => {
    const revisionsGroupByBals = groupBy(revisions, revision =>
      revision.codeCommune
    )
    return {
      date,
      publishedBAL: mapValues(revisionsGroupByBals, revisionsByBal => revisionsByBal.length)
    }
  })
}

module.exports = {
  getBalsByDays,
  getCumulFirstRevisionsByDate
}
