require('dotenv').config();

const express = require('express');
const app = express();
const session = require('express-session');
const db = require('./config/db.js'); // Il database viene inizializzato automaticamente

//----------- SWAGGER -------------
const swaggerUi = require('swagger-ui-express');
const swaggerDocs = require('./utility/swagger-output.json');

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

//----------- MIDDLEWARE -------------

app.use(
  session({
    secret: '1234',
    resave: true,
    saveUninitialized: true,
  })
);

app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//----------- VIEW ENDPOINTS -------------

const pagesRoute = require('./routes/pages.js');
app.use('/', pagesRoute);

//----------- USER PROFILE ENDPOINTS -------------

const userRoute = require('./routes/user.js');
app.use('/', userRoute);

//----------- PLAYLIST ENDPOINTS -------------

const playlistRoute = require('./routes/playlist.js');
app.use('/', playlistRoute);

//----------- SPOTIFY ENDPOINTS -------------

const spotifyRoute = require('./routes/spotify.js');
app.use('/', spotifyRoute);

//----------- UTILITY ROUTES -------------

const utilityRoute = require('./utility/utility.js');
app.use('/', utilityRoute);

app.listen(3000, () => console.log('Server funzionante'));
