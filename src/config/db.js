const mongoose = require('mongoose');

//Connessione al database
mongoose.connect(process.env.DATABASE_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  dbName: 'SNM',
});
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'Errore di connessione al db:'));
db.once('open', () => console.log('Connesso a MongoDB'));
