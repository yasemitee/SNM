const express = require('express');
const router = express.Router();
const auth = require('../utility/auth');
const Playlist = require('../models/playlist.js');
const User = require('../models/user.js');
const spotify = require('../utility/spotify-api-calls.js');
const Token = require('../models/spotifyToken.js');

router.get('/search-tracks', auth, async (req, res) => {
  /*
    #swagger.tags = ["Spotify"]
    #swagger.summary = "Ricerca di una traccia"
  */
  const query = req.query.query;
  if (!query) {
    return res.status(400).json({ error: 'Query non valida' });
  }
  let { token: spotifyToken } = await Token.findOne({}).lean();
  try {
    const tracks = await spotify.searchTracks(query, spotifyToken);

    if (tracks.error) {
      spotifyToken = await spotify.refreshToken();
      tracks = await spotify.searchTracks(query, spotifyToken);
    }

    return res.status(200).json({ status: 'ok', data: tracks });
  } catch (error) {
    return res.status(500).json({ error: 'Errore interno del server' });
  }
});

router.get('/get-track/:id', auth, async (req, res) => {
  /*
    #swagger.tags = ["Spotify"]
    #swagger.summary = "Restituisce le informazioni su una traccia"
  */
  let { token: spotifyToken } = await Token.findOne({}).lean();
  try {
    const track = await spotify.getTrack(req.params.id, spotifyToken);

    if (track.error) {
      spotifyToken = await spotify.refreshToken();
      track = await spotify.getTrack(req.params.id, spotifyToken);
    }

    if (!track) {
      return res.status(404).json({ error: 'Traccia non trovata' });
    }
    const artist = await spotify.getArtist(track.artists[0].id, spotifyToken);
    track.genres = artist.genres;
    track.album.release_date = track.album.release_date.slice(0, 4);
    return res.status(200).json({ status: 'ok', data: track });
  } catch (error) {
    return res.status(500).json({ error: 'Errore interno del server' });
  }
});

router.get('/search-artist', auth, async (req, res) => {
  /*
    #swagger.tags = ["Spotify"]
    #swagger.summary = "Ricerca di un artista"
  */
  const query = req.query.artist;
  if (!query) {
    return res.status(400).json({ error: 'Query non valida' });
  }
  let { token: spotifyToken } = await Token.findOne({}).lean();
  try {
    const artists = await spotify.searchArtists(query, spotifyToken);

    if (artists.error) {
      spotifyToken = await spotify.refreshToken();
      artists = await spotify.searchArtists(query, spotifyToken);
    }

    return res.status(200).json({ status: 'ok', data: artists });
  } catch (error) {
    return res.status(500).json({ error: 'Errore interno del server' });
  }
});

router.get('/get-artist-tracks', auth, async (req, res) => {
  /*
    #swagger.tags = ["Spotify"]
    #swagger.summary = "Restituisce le tracce di un artista"
  */
  const artistId = req.query.artistId;
  if (!artistId) {
    return res.status(400).json({ error: 'Id artista non valido' });
  }

  let { token: spotifyToken } = await Token.findOne({}).lean();
  try {
    const tracks = await spotify.getArtistTracks(artistId, spotifyToken);

    if (tracks.error) {
      spotifyToken = await spotify.refreshToken();
      tracks = await spotify.getArtistTracks(artistId, spotifyToken);
    }

    return res.status(200).json({ status: 'ok', data: tracks });
  } catch (error) {
    return res.status(500).json({ error: 'Errore interno del server' });
  }
});

router.get('/get-available-genres', auth, async (req, res) => {
  /*
    #swagger.tags = ["Spotify"]
    #swagger.summary = "Restituisce i generi disponibili su Spotify"
  */
  let { token: spotifyToken } = await Token.findOne({}).lean();
  try {
    let genres = await spotify.getGenres(spotifyToken);

    if (genres.error) {
      spotifyToken = await spotify.refreshToken();
      genres = await spotify.getGenres(spotifyToken);
    }

    return res.status(200).json({ status: 'ok', data: genres });
  } catch (error) {
    return res.status(500).json({ error: 'Errore interno del server' });
  }
});

router.get('/recommendations', auth, async (req, res) => {
  /*
    #swagger.tags = ["Spotify"]
    #swagger.summary = "Restituisce le raccomandazioni per l'utente in base ai suoi generi e artisti preferiti"
  */
  const user = await User.findOne({ _id: req.session.userId }).lean();

  if (!user) {
    return res.status(404).json({ error: 'Utente non trovato' });
  }

  const genres = user.generiPreferiti;
  const artists = user.artistiPreferiti;

  if (genres.length === 0 && artists.length === 0) {
    return res.status(400).json({ error: 'Nessun genere o artista preferito' });
  }

  let newGenres = [];
  let newArtists = [];

  if (genres.length + artists.length >= 5) {
    while (newGenres.length + newArtists.length < 5) {
      //il massimo di seed è 5
      const random = Math.floor(Math.random() * 2);
      if (random === 0) {
        const randomGenre = genres[Math.floor(Math.random() * genres.length)];
        if (!newGenres.includes(randomGenre)) {
          newGenres.push(randomGenre);
        }
      } else {
        const randomArtist =
          artists[Math.floor(Math.random() * artists.length)];
        if (!newArtists.includes(randomArtist)) {
          newArtists.push(randomArtist);
        }
      }
    }
  } else {
    newGenres = genres;
    newArtists = artists;
  }

  const artistsSeed = newArtists.map((artist) => artist.id).join(',');
  const genresSeed = newGenres.join(',');

  let tokenEntry = await Token.findOne({}).lean();
  if (!tokenEntry) {
    spotifyToken = await spotify.refreshToken();
  }

  try {
    let raccomandationsR = await spotify.getRecommendations(
      spotifyToken,
      genresSeed,
      artistsSeed
    );

    if (raccomandationsR.error) {
      spotifyToken = await spotify.refreshToken();
      raccomandationsR = await spotify.getRecommendations(
        spotifyToken,
        genresSeed,
        artistsSeed
      );
    }

    if (!raccomandationsR.tracks) {
      return res.status(404).json({ error: 'Raccomandazioni non trovate' });
    }
    return res.status(200).json({ status: 'ok', data: raccomandationsR });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: 'Errore interno del server' });
  }
});

router.get('/recommendations-genre', auth, async (req, res) => {
  /*
    #swagger.tags = ["Spotify"]
    #swagger.summary = "Restituisce le raccomandazioni per l'utente in base al genere fornito"
  */
  const genre = req.query.query;
  if (!genre) {
    return res.status(400).json({ error: 'Genere non valido' });
  }

  let { token: spotifyToken } = await Token.findOne({}).lean();
  try {
    let raccomandationsR = await spotify.getRecommendationsByGenre(
      spotifyToken,
      genre
    );

    if (raccomandationsR.error) {
      spotifyToken = await spotify.refreshToken();
      raccomandationsR = await spotify.getRecommendationsByGenre(
        spotifyToken,
        genre
      );
    }

    if (!raccomandationsR.tracks) {
      return res.status(404).json({ error: 'Raccomandazioni non trovate' });
    }
    return res
      .status(200)
      .json({ status: 'Raccomandazioni generate', data: raccomandationsR });
  } catch (error) {
    return res.status(500).json({ error: 'Errore interno del server' });
  }
});

module.exports = router;
