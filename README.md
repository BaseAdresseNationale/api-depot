# API de dépôt d'une Base Adresse Locale dans la Base Adresse Nationale

## Pré-requis

- Node.js 16 ou supérieure
- MongoDB 4 ou supérieur
- Yarn

## Installation

### Dépendances Node.js

On commence par installer les dépendances du dépôt

```bash
yarn
```

### Produire le fichier `elus.json`

```bash
yarn habilitations:build-rne
```

### Création du fichier de définition des variables d'environnement

```bash
cp .env.sample .env
```

On pourra ensuite éditer les variables d'environnement dans le fichier `.env` si nécessaire.

## Démarrer le service

```
yarn start
```
