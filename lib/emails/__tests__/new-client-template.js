const test = require('ava')
const formatEmail = require('../new-client-template')

test('new client email', t => {
  const client = {token: '123456', nom: 'ACME CLI'}
  const mandataire = {nom: 'ACME', email: 'acme@mail.fr'}
  const chefDeFile = {nom: 'Warner', email: 'warner@mail.fr'}

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
      <h2 style="margin:0; mso-line-height-rule:exactly;">API dépôt d’une Base Adresse Locale</h2><br />
      <h3 style="margin:0; mso-line-height-rule:exactly;">Accès autorisé</h3>
    </div>

    <div class="container">
      <h5>Voici votre jeton :</h5>
      <div class="token">123456</div>

      <h5>URL de l’API :</5>
      <div>$$API_URL$$</div>
    </div>

    <br />

    <p>Résumé des informations que vous nous avez transmises</p>
    <div class="infos">
      <div>
          <b>Solution technique</b>
          <div>ACME CLI</div>
      </div>

      <div>
          <b>Mandataire</b>
          <div>nom : ACME</div>
          <div>email : acme@mail.fr</div>
      </div>

      <div>
          <b>Chef de file</b>
          <div>nom : Warner</div>
          <div>email : warner@mail.fr</div>
      </div>
    </div>

    <p><i>L’équipe adresse.data.gouv.fr</i></p>
  </body>
  </html>
`

  t.is(formatEmail({client, mandataire, chefDeFile, isDemoMode: false}).html, expectedTextBody)
})

test('new client email / without chef de file', t => {
  const client = {token: '123456', nom: 'ACME CLI'}
  const mandataire = {nom: 'ACME', email: 'acme@mail.fr'}

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
      <h2 style="margin:0; mso-line-height-rule:exactly;">API dépôt d’une Base Adresse Locale</h2><br />
      <h3 style="margin:0; mso-line-height-rule:exactly;">Accès autorisé</h3>
    </div>

    <div class="container">
      <h5>Voici votre jeton :</h5>
      <div class="token">123456</div>

      <h5>URL de l’API :</5>
      <div>$$API_URL$$</div>
    </div>

    <br />

    <p>Résumé des informations que vous nous avez transmises</p>
    <div class="infos">
      <div>
          <b>Solution technique</b>
          <div>ACME CLI</div>
      </div>

      <div>
          <b>Mandataire</b>
          <div>nom : ACME</div>
          <div>email : acme@mail.fr</div>
      </div>

      
    </div>

    <p><i>L’équipe adresse.data.gouv.fr</i></p>
  </body>
  </html>
`

  t.is(formatEmail({client, mandataire, isDemoMode: false}).html, expectedTextBody)
})

test('new client email / demo mode', t => {
  const client = {token: '123456', nom: 'ACME CLI'}
  const mandataire = {nom: 'ACME', email: 'acme@mail.fr'}

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
      <h2 style="margin:0; mso-line-height-rule:exactly;">API dépôt d’une Base Adresse Locale [DÉMONSTRATION]</h2><br />
      <h3 style="margin:0; mso-line-height-rule:exactly;">Accès autorisé</h3>
    </div>

    <div class="container">
      <h5>Voici votre jeton :</h5>
      <div class="token">123456</div>

      <h5>URL de l’API :</5>
      <div>$$API_URL$$</div>
    </div>

    <br />

    <p>Résumé des informations que vous nous avez transmises</p>
    <div class="infos">
      <div>
          <b>Solution technique</b>
          <div>ACME CLI</div>
      </div>

      <div>
          <b>Mandataire</b>
          <div>nom : ACME</div>
          <div>email : acme@mail.fr</div>
      </div>

      
    </div>

    <p><i>L’équipe adresse.data.gouv.fr</i></p>
  </body>
  </html>
`

  t.is(formatEmail({client, mandataire, isDemoMode: true}).html, expectedTextBody)
})
