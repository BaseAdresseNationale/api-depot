const {template} = require('lodash')

const bodyTemplate = template(`
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

    .code {
      font-size: 42px;
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
  </style>
</head>

<body>
  <div>
    <img src="$$API_URL$$/public/images/logo-adresse.png" alt="Logo République Française">
  </div>
  <div class="title">
    <h2 style="margin:0; mso-line-height-rule:exactly;">Publication de la Base Adresse Locale de <%= nomCommune %>
    </h2><br>
    <h3 style="margin:0; mso-line-height-rule:exactly;">Demande d'authentification</h3>
  </div>

  <div class="container">
    <h3>Voici votre code :</h5>
    <div class="code"><%= pinCode %></div>
  </div>

  <br />

  <p>Pourquoi ce courriel vous est envoyé ?</p>
  <p>
    Une personne souhaite s’authentifier en tant qu’agent ou élu habilité afin de publier la Base Adresse Locale de la commune de <%= nomCommune %>.
      Si vous n'êtes pas à l'origine de cette demande, merci d'ignorer ce courriel.
  </p>

  <p><i>L’équipe adresse.data.gouv.fr</i></p>
</body>

</html>
`)

function formatEmail(data) {
  const {pinCode, nomCommune} = data

  return {
    subject: 'Demande de code d’identification',
    html: bodyTemplate({pinCode, nomCommune})
  }
}

module.exports = formatEmail
