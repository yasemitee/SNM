const express = require('express');
const router = express.Router();
const auth = require('./auth');
const User = require('../models/user.js');
const bycrypt = require('bcrypt');
const spotify = require('../utility/spotify-api-calls.js');
const jwt = require('jsonwebtoken');
const Playlist = require('../models/playlist.js');
const Token = require('../models/spotifyToken.js');

router.post('/registrazione', async (req, res) => {
  /*
    #swagger.tags = ["Auth"]
    #swagger.summary = "Registrazione di un nuovo utente"
  */
  const nome = req.body.nome;
  const cognome = req.body.cognome;
  const username = req.body.username;
  const email = req.body.email;
  const plainTextPassword = req.body.password;

  if (!nome || typeof nome !== 'string') {
    return res.status(400).json({ status: 'error', error: 'Nome non valido' });
  }
  if (!cognome || typeof cognome !== 'string') {
    return res
      .status(400)
      .json({ status: 'error', error: 'Cognome non valido' });
  }

  if (plainTextPassword.length < 5) {
    return res.status(400).json({
      status: 'error',
      error: 'La password deve essere lunga almeno 5 caratteri',
    });
  }

  if (!username || typeof username !== 'string') {
    return res
      .status(400)
      .json({ status: 'error', error: 'Username non valido' });
  }

  const user = await User.findOne({ username }).lean();
  if (user) {
    return res
      .status(400)
      .json({ status: 'error', error: 'Username già in uso' });
  }

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ status: 'error', error: 'Email non valida' });
  }

  const em = await User.findOne({ email }).lean();
  if (em) {
    return res.status(400).json({ status: 'error', error: 'Email già in uso' });
  }

  const password = await bycrypt.hash(plainTextPassword, 10);

  try {
    const risultato = await User.create({
      nome,
      cognome,
      username,
      email,
      password,
    });
    console.log('Utente creato con successo: ', risultato);
    return res.status(200).json({ status: 'ok' });
  } catch (err) {
    console.error(err.message);
    if (err.code === 11000) {
      return res.status(400).json({
        status: 'error',
        error: 'Username o email già in uso',
      });
    }
    throw err;
  }
});

router.post('/login', async (req, res) => {
  /*
    #swagger.tags = ["Auth"]
    #swagger.summary = "Login di un utente già registrato (genera un token JWT valido per 12 ore ) "
  */
  const { username, password } = req.body;
  const user = await User.findOne({ username }).lean();

  if (!user) {
    const error = 'Username o password errati';
    return res.status(400).json({ error: error });
  }

  if (await bycrypt.compare(password, user.password)) {
    const token = jwt.sign(
      {
        id: user._id,
        username: user.username,
      },
      process.env.JWT_SECRET,
      { expiresIn: '12h' }
    );

    req.session.token = token;
    const id = user._id.toString();
    req.session.userId = id;
    req.session.username = user.username;
    return res.status(200).json({
      token,
      username: user.username,
      id: user._id,
    });
  }

  const error = 'Username o password errati';
  return res.status(400).json({ error: error });
});

router.delete('/detete-account', auth, async (req, res) => {
  /*
    #swagger.tags = ["User"]
    #swagger.summary = "Elimina l'account dell'utente"
  */
  const token = req.session.token;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    console.log(decoded.id);
    const playlistsSeguite = await Playlist.find({
      followers: { $elemMatch: { userId: decoded.id } },
    }).lean();
    console.log(playlistsSeguite);
    for (let i = 0; i < playlistsSeguite.length; i++) {
      await Playlist.updateOne(
        { _id: playlistsSeguite[i]._id },
        { $pull: { followers: { userId: decoded.id } } }
      );
    }

    const playlists = await Playlist.find({
      creatore: decoded.username,
    }).lean();
    for (let i = 0; i < playlists.length; i++) {
      await Playlist.deleteOne({ _id: playlists[i]._id });
    }

    await User.deleteOne({ _id: decoded.id });
    return res.status(200).json({ status: 'ok' });
  } catch (error) {
    return res.status(500).json({ error: 'Errore interno del server' });
  }
});

router.get('/get-user-info', auth, async (req, res) => {
  /*
    #swagger.tags = ["User"]
    #swagger.summary = "Restituisce le informazioni dell'utente"
  */
  const token = req.session.token;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findOne({ _id: decoded.id }).lean();

    if (!user) {
      return res.status(404).json({ error: 'Utente non trovato' });
    }

    return res.json({ status: 'ok', data: user });
  } catch (error) {
    return res.status(500).json({ error: 'Errore interno del server' });
  }
});

router.post('/add-favourite-artist', auth, async (req, res) => {
  /*
    #swagger.tags = ["User favourite"]
    #swagger.summary = "Aggiunge un artista ai preferiti dell'utente"
  */
  const { artistId } = req.query;
  try {
    let { token: spotifyToken } = await Token.findOne({}).lean();
    const artist = await spotify.getArtist(artistId, spotifyToken);
    if (artist.error) {
      spotifyToken = await spotify.refreshToken();
      artist = await spotify.getArtist(artistId, spotifyToken);
    }
    if (!artist) {
      return res.status(404).json({ error: 'Artista non trovato' });
    }
    if (
      await User.findOne({
        _id: req.session.userId,
        artistiPreferiti: { $elemMatch: { id: artist.id } },
      })
    ) {
      return res.status(400).json({ error: 'Artista già presente' });
    }
    await User.updateOne(
      { _id: req.session.userId },
      {
        $push: {
          artistiPreferiti: {
            id: artist.id,
            nome: artist.name,
            immagine: artist.images[0].url,
          },
        },
      }
    );
    return res.status(200).json({ status: 'ok' });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: 'Errore interno del server' });
  }
});

router.get('/get-favourite-artists', auth, async (req, res) => {
  /*
    #swagger.tags = ["User favourite"]
    #swagger.summary = "Restituisce gli artisti preferiti dell'utente"
  */
  try {
    const artistiPreferiti = await User.findOne(
      { _id: req.session.userId },
      { artistiPreferiti: 1 }
    ).lean();
    return res.status(200).json({ status: 'ok', data: artistiPreferiti });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: 'Errore interno del server' });
  }
});

router.delete('/remove-favourite-artist', auth, async (req, res) => {
  /*
    #swagger.tags = ["User favourite"]
    #swagger.summary = "Rimuove un artista dai preferiti dell'utente"
  */
  const { artistId } = req.query;
  try {
    await User.updateOne(
      { _id: req.session.userId },
      { $pull: { artistiPreferiti: { id: artistId } } }
    );
    return res.status(200).json({ status: 'ok' });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: 'Errore interno del server' });
  }
});

router.post('/add-favourite-genre', auth, async (req, res) => {
  /*
    #swagger.tags = ["User favourite"]
    #swagger.summary = "Aggiunge un genere ai preferiti dell'utente"
  */
  const { genre } = req.query;
  try {
    await User.updateOne(
      { _id: req.session.userId },
      { $push: { generiPreferiti: genre } }
    );
    return res.status(200).json({ status: 'ok' });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: 'Errore interno del server' });
  }
});

router.get('/get-favourite-genres', auth, async (req, res) => {
  /*
    #swagger.tags = ["User favourite"]
    #swagger.summary = "Restituisce i generi preferiti dell'utente"
  */
  try {
    const generiPreferiti = await User.findOne(
      { _id: req.session.userId },
      { generiPreferiti: 1 }
    ).lean();
    return res.status(200).json({ status: 'ok', data: generiPreferiti });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: 'Errore interno del server' });
  }
});

router.delete('/remove-favourite-genre', auth, async (req, res) => {
  /*
    #swagger.tags = ["User favourite"]
    #swagger.summary = "Rimuove un genere dai preferiti dell'utente"
  */
  const { genre } = req.query;
  try {
    await User.updateOne(
      { _id: req.session.userId },
      { $pull: { generiPreferiti: genre } }
    );
    return res.status(200).json({ status: 'ok' });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: 'Errore interno del server' });
  }
});

router.patch('/update-user-info', auth, async (req, res) => {
  /*
    #swagger.tags = ["User"]
    #swagger.summary = "Aggiorna le informazioni dell'utente"
  */
  const token = req.session.token;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const updateFields = {};
    if (req.body.email) {
      updateFields.email = req.body.email;
    }
    if (req.body.username) {
      updateFields.username = req.body.username;
    }

    if (req.body.password) {
      const password = await bycrypt.hash(req.body.password, 10);
      updateFields.password = password;
    }

    if (req.body.nome) {
      updateFields.nome = req.body.nome;
    }

    if (req.body.cognome) {
      updateFields.cognome = req.body.cognome;
    }

    if (Object.keys(updateFields).length > 0) {
      if (
        await User.findOne({
          $or: [
            { email: updateFields.email },
            { username: updateFields.username },
          ],
        })
      ) {
        return res.json({
          status: 'error',
          error: 'Username o email già in uso',
        });
      }

      const playlists = await Playlist.find({
        creatore: decoded.username,
      }).lean();
      for (let i = 0; i < playlists.length; i++) {
        await Playlist.updateOne(
          { _id: playlists[i]._id },
          { $set: { creatore: updateFields.username } }
        );
      }

      if (req.body.username) {
        req.session.username = req.body.username;
      }

      await User.updateOne({ _id: decoded.id }, { $set: updateFields });

      return res.status(200).json({ status: 'ok' });
    } else {
      return res.status(500).json({ error: 'Nessun cambiamento' });
    }
  } catch (error) {
    return res.status(500).json({ error: 'Errore interno del server' });
  }
});

module.exports = router;
