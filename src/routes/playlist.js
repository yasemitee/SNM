const express = require('express');
const router = express.Router();
const auth = require('./auth');
const Playlist = require('../models/playlist.js');
const spotify = require('../utility/spotify-api-calls.js');
const Token = require('../models/spotifyToken.js');

router.post('/create', auth, async (req, res) => {
  /*
    #swagger.tags = ["Playlist"]
    #swagger.summary = "Creazione di una nuova playlist"
  */
  if (!req.body.titolo) {
    return res.status(400).json({ error: 'Titolo non valido' });
  }
  if (!req.body.descrizione) {
    return res.status(400).json({ error: 'Descrizione non valido' });
  }

  if (
    await Playlist.findOne({
      titolo: req.body.titolo,
      creatore: req.session.username,
    })
  ) {
    return res.status(400).json({ error: 'Playlist già esistente' });
  }

  const tagsArr = req.body.tags.split(',');
  try {
    Playlist.create({
      titolo: req.body.titolo,
      descrizione: req.body.descrizione,
      creatore: req.session.username,
      tags: tagsArr,
      èPrivata: req.body.èPrivata,
      followers: [
        {
          userId: req.session.userId,
          èProprietario: true,
        },
      ],
      tracce: [],
    });
    return res.status(201).json({ status: 'ok' });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: 'Errore interno del server' });
  }
});

router.patch('/edit/:id', auth, async (req, res) => {
  /*
    #swagger.tags = ["Playlist"]
    #swagger.summary = "Modifica di una playlist"
  */
  const updateFields = {};
  if (req.body.titolo) {
    updateFields.titolo = req.body.titolo;
  }
  if (req.body.descrizione) {
    updateFields.descrizione = req.body.descrizione;
  }
  if (req.body.tags) {
    const tagsArr = req.body.tags.split(',');
    updateFields.tags = tagsArr;
  }
  if (req.body.èPrivata) {
    updateFields.èPrivata = req.body.èPrivata;
  }

  try {
    const playlist = await Playlist.findOne({ _id: req.params.id }).lean();

    if (!playlist) {
      return res.status(404).json({ error: 'Playlist non trovata' });
    }

    if (playlist.creatore !== req.session.username) {
      return res
        .status(401)
        .json({ error: 'Modifica consentita solo al proprietario' });
    }

    if (Object.keys(updateFields).length > 0) {
      await Playlist.updateOne({ _id: req.params.id }, { $set: updateFields });
      return res
        .status(200)
        .json({ status: 'Cambiamenti apportati con successo' });
    } else {
      return res.status(400).json({ error: 'Nessun cambiamento' });
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: 'Errore interno del server' });
  }
});

router.get('/get-playlists-public', auth, async (req, res) => {
  /*
    #swagger.tags = ["Playlist"]
    #swagger.summary = "Restituisce le playlist pubbliche"
  */
  try {
    const playlists = await Playlist.find({ èPrivata: false }).lean();
    return res.status(200).json({ status: 'ok', data: playlists });
  } catch (error) {
    return res.status(500).json({ error: 'Errore interno del server' });
  }
});

router.get('/get-my-playlists', auth, async (req, res) => {
  /*
    #swagger.tags = ["Playlist"]
    #swagger.summary = "Restituisce le playlist dell'utente loggato"
  */
  try {
    const playlists = await Playlist.find({
      followers: { $elemMatch: { userId: req.session.userId } },
    }).lean();
    return res.status(200).json({
      status: 'ok',
      data: playlists,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: 'Errore interno del server' });
  }
});

router.get('/get-created-playlists', auth, async (req, res) => {
  /*
    #swagger.tags = ["Playlist"]
    #swagger.summary = "Restituisce le playlist create dall'utente loggato"
  */
  try {
    const playlists = await Playlist.find({
      creatore: req.session.username,
    }).lean();

    return res.status(200).json({
      status: 'ok',
      data: playlists,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Errore interno del server' });
  }
});

router.get('/:id', auth, async (req, res) => {
  /*
    #swagger.tags = ["Playlist"]
    #swagger.summary = "Restituisce le informazioni riguardanti una playlist"
  */
  try {
    const playlist = await Playlist.findOne({ _id: req.params.id }).lean();

    if (!playlist) {
      return res.status(404).json({ error: 'Playlist non trovata' });
    }
    return res.status(200).json({
      status: 'ok',
      data: playlist,
      user: req.session.username,
      userId: req.session.userId,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Errore interno del server' });
  }
});

router.delete('/delete/:id', auth, async (req, res) => {
  /*
    #swagger.tags = ["Playlist"]
    #swagger.summary = "Elimina una playlist (solo il proprietario)"
  */
  try {
    const playlist = await Playlist.findOne({ _id: req.params.id }).lean();

    if (!playlist) {
      return res.status(404).json({ error: 'Playlist non trovata' });
    }

    if (playlist.creatore !== req.session.username) {
      return res
        .status(401)
        .json({ error: 'Cancellazione consentita solo al proprietario' });
    }

    await Playlist.deleteOne({ _id: req.params.id });

    return res.status(200).json({ status: 'ok' });
  } catch (error) {
    return res.status(500).json({ error: 'Errore interno del server' });
  }
});

router.post('/add-track', auth, async (req, res) => {
  /*
    #swagger.tags = ["Playlist track"]
    #swagger.summary = "Aggiunge una traccia ad una playlist (solo il proprietario)"
  */
  const { playlistId } = req.query;
  const { trackId } = req.query;

  try {
    const playlist = await Playlist.findOne({ _id: playlistId }).lean();

    if (!playlist) {
      return res.status(404).json({ error: 'Playlist non trovata' });
    }
    if (playlist.creatore !== req.session.username) {
      return res
        .status(401)
        .json({ error: 'Aggiunta consentita solo al proprietario' });
    }

    let { token: spotifyToken } = await Token.findOne({}).lean();
    const track = await spotify.getTrack(trackId, spotifyToken);

    if (track.error) {
      spotifyToken = await spotify.refreshToken();
      track = await spotify.getTrack(trackId, spotifyToken);
    }

    if (!track) {
      return res.status(404).json({ error: 'Traccia non trovata' });
    }

    const trackObj = {
      id: track.id,
      titolo: track.name,
      album: track.album.name,
      cantante: track.artists[0].name,
      immagine: track.album.images[0].url,
      data_rilascio: track.album.release_date,
      durata: track.duration_ms,
      popolarità: track.popularity,
    };

    if (
      await Playlist.findOne({
        _id: playlistId,
        tracce: { $elemMatch: { id: trackObj.id } },
      })
    ) {
      return res.status(400).json({ error: 'Traccia già presente' });
    }

    await Playlist.updateOne(
      { _id: playlistId },
      { $push: { tracce: trackObj } }
    );
    return res.status(200).json({ status: 'ok' });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: 'Errore interno del server' });
  }
});

router.delete('/remove-track', auth, async (req, res) => {
  /*
    #swagger.tags = ["Playlist track"]
    #swagger.summary = "Rimuove una traccia da una playlist (solo il proprietario)"
  */
  const { playlistId, trackId } = req.body;

  try {
    const playlist = await Playlist.findOne({ _id: playlistId }).lean();

    if (!playlist) {
      return res.status(404).json({ error: 'Playlist non trovata' });
    }
    if (playlist.creatore !== req.session.username) {
      return res
        .status(401)
        .json({ error: 'Rimozione consentita solo al proprietario' });
    }

    await Playlist.updateOne(
      { _id: playlistId },
      { $pull: { tracce: { id: trackId } } }
    );

    return res.status(200).json({ status: 'ok' });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: 'Errore interno del server' });
  }
});

router.post('/follow/:id', auth, async (req, res) => {
  /*
    #swagger.tags = ["Social network interaction"]
    #swagger.summary = "Permette di seguire una playlist"
  */
  try {
    const playlist = await Playlist.findOne({ _id: req.params.id }).lean();

    if (!playlist) {
      return res.status(404).json({ error: 'Playlist non trovata' });
    }

    if (
      await Playlist.findOne({
        _id: req.params.id,
        followers: { $elemMatch: { userId: req.session.userId } },
      })
    ) {
      return res.status(400).json({ error: 'Playlist già seguita' });
    }

    await Playlist.updateOne(
      { _id: req.params.id },
      {
        $push: {
          followers: {
            userId: req.session.userId,
            èProprietario: false,
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

router.delete('/unfollow/:id', auth, async (req, res) => {
  /*
    #swagger.tags = ["Social network interaction"]
    #swagger.summary = "Permette di smettere di seguire una playlist"
  */
  try {
    const playlist = await Playlist.findOne({ _id: req.params.id }).lean();
    if (!playlist) {
      return res.status(404).json({ error: 'Playlist non trovata' });
    }

    await Playlist.updateOne(
      { _id: req.params.id },
      {
        $pull: {
          followers: {
            userId: req.session.userId,
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

module.exports = router;
