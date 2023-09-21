# Relazione "Social Network for Music"

> Relazione del progetto "Social Network for Music" per il corso "Programmazione e linguaggi per il web" (a.a. 2022-2023).

> Realizzata da: Yassine Gourram\
> Matricola: 01796A

## Indice

- [Avvio del sito](#avvio-del-sito)
- [Struttura del sito web](#struttura-del-sito-web)
  - [Swagger](#swagger)
- [Operazioni richieste](#operazioni-richieste)
- [Scelte implementative](#scelte-implementative)
  - [Gestione delle sessioni e autenticazione](#gestione-delle-sessioni-e-autenticazione)
  - [Interazione con l’API di Spotify](#interazione-con-l'api-di-spotify)
    - [Generi delle tracce](#generi-delle-tracce)
- [Dipendenze](#dipendenze)

## Avvio del sito

Una volta scaricato o clonato il codice sorgente sarà necessario:

- Scaricare i moduli e dipendenze (node_modules).

```bash
npm install
```

- Aggiungere un file .env nella main directory che conterrà:

```env
    DATABASE_URL =
    JWT_SECRET =
    #(Spotify API)
    CLIENT_ID =
    CLIENT_SECRET =
    PORT =
```

- Avviare il server.

```bash
node src/server.js
```

> Se si scarica come dipendenza anche _nodemon_ si può utilizzare `npm start`

Una volta seguiti i vari passi sarà possibile accedere al sito all'indirizzo. (per poter utilizzare i link presenti nella guida si suggerisce la porta 3000).
**[http://localhost:3000](http://localhost:3000/)**.

## Struttura del sito web

La struttura del sito è composta in due sezioni principali:

Sezione dedicata al **frontend** `public`:

- Le pagine `.html` .
- `style` cartella contenente i file `.css`.
- `img` contiene le immagini utilizzate per il sito.
- `main.js` uno script comune a tutte le pagine (comportamenti "visivi" che tutte le pagine hanno in comune).

Sezione dedicata al **backend** `src`:

- `server.js`: server principale per il funzionamento del server (node.js - express)
- **config**
  - `db.js`: configurazione e avvio (automatico) del server database _MongoDB_
- **models**
  - `playlist.js`: schema delle playlist nel db
  - `user.js`: schema degli utenti nel db
- **routes**
  - `auth.js`: le funzionalità che permettono l'autenticazione dell'utente per accedere alle pagine protette ( è stato utilizzato **JWT**)
  - `pages.js`: gestisce i redirect alle pagine del sito web
  - `playlist.js`: le funzionalità che riguardano l'interazione con le playlist
  - `user.js`: le funzionalità che riguardano a gestione e personalizzazione degli utenti.
  - `spotify.js`: le funzionalità che gestiscono i dati ricevuti dall'API di spotify.
    > `spotify.js` si interfaccia direttamente con l'API ma passa attraverso `./src/utility/spotify-api-calls.js`
- **utility**
  - `spotify-api-calls.js`: contiene le funzioni che permettono di fare direttamente il _fetch_ dei dati ricevuti dall'API di spotify. Inoltre contiene le funzionalità che permetto il _refresh_ del token per utilizzare l'API
  - `swagger.js`: genera lo **_swagger_**.
  - `swagger-output.json`: file di output dello swagger.
  - `utility.js  `: contiene le funzionalità di utilità.

### Swagger

L'API dell'applicazione segue i principi **REST** e la sua documentazione è reperibile attraverso uno **Swagger**.
Per accedere allo swagger basta recarsi all'indirizzo **[http://localhost:3000/api-docs/](http://localhost:3000/api-docs/)**.
Il rebuild dello swagger può essere effettuato con il comando:

```bash
npm run swagger
```

## Scelte implementative

### Gestione delle sessioni e autenticazione

La gestione delle sessioni avviene tramite il middleware express-session del modulo express, questo mi ha permesso di avere un sistema conveniente per memorizzare i dati relativi alla sessione, questi vengono utilizzati ed aggiornati in base all'attività dell'utente.

```javascript
const express = require('express');
const app = express();
const session = require('express-session');

app.use(
  session({
    secret: '...',
    resave: true,
    saveUninitialized: true,
  })
);
```

La logica che riguarda le autorizzazioni di accesso alle pagine è contenuta in `auth.js`. Quest'ultima sfrutta JWT per la verifica del token, in questo modo abbiamo la funzione `auth` che ci permette di verificare nelle richieste degli endpoint che l'accesso da parte dell'utente sia legale.

```javascript
const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  const token = req.session.token;

  if (!token) {
    return res.redirect('/login');
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.redirect('/login');
    }
    next();
  });
};

module.exports = auth;
```

> express-session è utilizzato per gestire l'autenticazione e le sessioni (principalmente le variabili di sessione) degli utenti durante la navigazione nel sito web, mentre JWT viene utilizzato per autenticare le richieste API in maniera più sicura. Le due tecnologie quindi hanno mansioni diverse ma sono utilizzate in modo complementare. Questa è una scelta comune per avere un maggiore controllo e scalabilità del server.

### Interazione con l'API di Spotify

Tutta la logica che riguarda le chiamate e il parse dei dati ricevuti da Spotify avviene nel file `utility/spotify-api-calls.js` che funge come interfaccia.
Per interagire con l'API di Spotify è necessario avere (oltre al `CLIENT ID` e `CLIENT_SECRET`) un access_token, a questo proposito ho implementato una funzione che mi consente di rinnovare il token e salvarlo nel database.
La scelta di salvare il token nel database è stata fatta per:

- Nascondere il token dal frontend.
- Aumentare le prestazioni (non dovendo generare un nuovo token per ogni richiesta).
- Avere informazioni aggiuntive riguardanti il token, come la data e ora di generazione.

```javascript
const refreshToken = async () => {
  const { CLIENT_ID, CLIENT_SECRET } = process.env;

  const res = await fetch(URL, {
    method: 'POST',
    headers: {
      Authorization:
        'Basic ' +
        Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  const { access_token: token } = await res.json();

  await Token.deleteMany({});
  await new Token({ token }).save();

  return token;
};
```

In questo modo quando verranno effettuate delle richieste a spotify verrà utilizzato il token nel database e qualora il token fosse scaduto, questo verrà rigenerato automaticamente.

### Generi delle tracce

L'API di Spotify non consente di avere il genere musicale delle tracce, l'unico modo per avere degli "pseudo-generi" è attraverso quelli dell'artista. Tuttavia questo approccio presenta diversi problemi tra cui

- Alcuni artisti non hanno generi musicali associati.
- Alcuni artisti hanno numerosi generi musicali associati.
- Qual'ora l'artista avesse più generi musicali non è possibile associare correttamente un sottoinsieme di generi alla traccia.

Considerando tutte queste problematiche è stato deciso di omettere l'informazione dei generi nelle info della traccia, dato che sarebbe stata un informazione approssimativa.
Tuttavia è stata comunque implementata la funzionalità di ricerca di un brano in base al genere attraverso l'endpoint `/recommendations` ( impostando come seed il genere interessato ).

## Dipendenze

Le dipendenze utilizzate per la realizzazione dell'applicativo web sono:

- [express](https://www.npmjs.com/package/express) - [express-session](https://www.npmjs.com/package/express-session)
- [mongoose](https://www.npmjs.com/package/mongoose)
- [jwt](https://www.npmjs.com/package/jsonwebtoken)
- [bcrypt](https://www.npmjs.com/package/bcrypt)
- [swagger-ui-express](https://www.npmjs.com/package/swagger-ui-express) - [swagger-autogen](https://www.npmjs.com/package/swagger-autogen)
- [dotenv](https://www.npmjs.com/package/dotenv)
