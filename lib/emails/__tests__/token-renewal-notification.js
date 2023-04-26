const test = require('ava')
const formatEmail = require('../token-renewal-notification')

test('token renewal notification', t => {
  const client = {token: '123456'}

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
      <h3 style="margin:0; mso-line-height-rule:exactly;">Votre jeton vient d’être renouvelé</h3>
    </div>

    <div class="container">
      <h5>Voici votre nouveau jeton :</h5>
      <div class="token">123456</div>
    </div>

    <br />

    <p><i>L’équipe adresse.data.gouv.fr</i></p>
  </body>
  </html>
`

  t.is(formatEmail({client, isDemoMode: false}).html, expectedTextBody)
})

