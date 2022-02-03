const {join} = require('path')
const {readFile} = require('fs').promises
const test = require('ava')

const {applyValidateBAL} = require('../validate-bal')

test('applyValidateBAL - errored rows count', async t => {
  const balFile = await readFile(join(__dirname, 'fixtures', 'bal-valid.csv'))
  await t.throwsAsync(
    () => applyValidateBAL(balFile, '31591', {rowsCountValue: '14'}),
    undefined,
    'Le fichier BAL analysé ne comporte pas le nombre de lignes de données indiqué dans l’en-tête X-Rows-Count.'
  )
})

test('applyValidateBAL - valid', async t => {
  const balFile = await readFile(join(__dirname, 'fixtures', 'bal-valid.csv'))
  const {validation, rows} = await applyValidateBAL(balFile, '31591', {rowsCountValue: '6'})
  t.is(validation.valid, true)
  t.is(rows.length, 6)
})

test('applyValidateBAL - not valid', async t => {
  const balFile = await readFile(join(__dirname, 'fixtures', 'bal-not-valid.csv'))
  const {validation} = await applyValidateBAL(balFile, '31591', {rowsCountValue: '6'})
  t.is(validation.valid, false)
  t.is(validation.errors.length, 1)
  t.true(validation.errors.includes('voie_nom.valeur_manquante'))
})

test('applyValidateBAL - warnings', async t => {
  const balFile = await readFile(join(__dirname, 'fixtures', 'bal-warnings.csv'))
  const {validation} = await applyValidateBAL(balFile, '31591', {rowsCountValue: '6'})

  t.is(validation.valid, true)
  t.is(validation.errors.length, 0)

  t.is(validation.warnings.length, 2)
  t.deepEqual(
    validation.warnings.sort(),
    ['field.certification_commune.missing', 'source.valeur_manquante'].sort()
  )

  t.is(validation.infos.length, 1)
  t.deepEqual(
    validation.infos.sort(),
    ['cle_interop.voie_non_renseignee'].sort()
  )
})

