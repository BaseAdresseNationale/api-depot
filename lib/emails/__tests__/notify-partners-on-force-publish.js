const test = require('ava')
const formatEmail = require('../notify-partners-on-force-publish')

test('notify partner on force publish via mes-adresses', t => {
  const commune = {nom: 'Bourg-La-Reine'}
  const balId = '123456'

  const expectedTextBody = `
<!DOCTYPE html>
<html lang="fr">

<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Demande de code d’identification</title>
  <style>
    body {
      background-color: #F5F6F7;
      color: #234361;
      font-family: "SF UI Text", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
      margin: auto;
      padding: 25px;
    }

    img {
      max-height: 45px;
      background-color: #F5F6F7;
    }

    .container {
      background-color: #ebeff3;
      padding: 25px;
    }

    .token {
      font-weight: bold;
    }

    .title {
      align-items: center;
      border-bottom: 1px solid #E4E7EB;
      justify-content: center;
      margin-top: 35px;
      min-height: 8em;
      padding: 10px;
      text-align: center;
    }

    .infos > div {
      margin-top: 10px;
    }
  </style>
</head>

<body>
  <div>
    <img src="$$API_URL$$/public/images/logo-adresse.png" alt="Logo République Française">
  </div>
  <div class="title">
    <h3 style="margin:0; mso-line-height-rule:exactly;">
      La commune de Bourg-La-Reine a repris la main sur sa Base Adresse Locale
    </h3>
  </div>

  <p>
    Nous vous informons que la commune Bourg-La-Reine a publié une Base Adresse Locale via l'outil Mes-Adresses : <a href="https://mes-adresses.data.gouv.fr/bal/123456">BAL de Bourg-La-Reine</a>. Les prochaines modifications d'adressages que vous effectuerez pour cette commune ne seront donc pas publiés dans la Base Adresse Nationale.
  </p>

  <p>
    Si vous pensez qu'il s'agit d'une erreur, merci de contacter directement la commune de Bourg-La-Reine. Afin de vous permettre de continuer à mettre à jour les adresses de la commune de Bourg-La-Reine, cette dernière devra prendre contact avec nous.
  </p>

  <p><i>L’équipe adresse.data.gouv.fr</i></p>
</body>
</html>
`

  t.is(formatEmail({commune, balId, isDemoMode: false}).html, expectedTextBody)
})

test('notify partner on force publish via formulaire', t => {
  const commune = {nom: 'Antony'}

  const expectedTextBody = `
<!DOCTYPE html>
<html lang="fr">

<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Demande de code d’identification</title>
  <style>
    body {
      background-color: #F5F6F7;
      color: #234361;
      font-family: "SF UI Text", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
      margin: auto;
      padding: 25px;
    }

    img {
      max-height: 45px;
      background-color: #F5F6F7;
    }

    .container {
      background-color: #ebeff3;
      padding: 25px;
    }

    .token {
      font-weight: bold;
    }

    .title {
      align-items: center;
      border-bottom: 1px solid #E4E7EB;
      justify-content: center;
      margin-top: 35px;
      min-height: 8em;
      padding: 10px;
      text-align: center;
    }

    .infos > div {
      margin-top: 10px;
    }
  </style>
</head>

<body>
  <div>
    <img src="$$API_URL$$/public/images/logo-adresse.png" alt="Logo République Française">
  </div>
  <div class="title">
    <h3 style="margin:0; mso-line-height-rule:exactly;">
      La commune de Antony a repris la main sur sa Base Adresse Locale
    </h3>
  </div>

  <p>
    Nous vous informons que la commune Antony a publié une Base Adresse Locale. Les prochaines modifications d'adressages que vous effectuerez pour cette commune ne seront donc pas publiés dans la Base Adresse Nationale.
  </p>

  <p>
    Si vous pensez qu'il s'agit d'une erreur, merci de contacter directement la commune de Antony. Afin de vous permettre de continuer à mettre à jour les adresses de la commune de Antony, cette dernière devra prendre contact avec nous.
  </p>

  <p><i>L’équipe adresse.data.gouv.fr</i></p>
</body>
</html>
`

  t.is(formatEmail({commune}).html, expectedTextBody)
})

