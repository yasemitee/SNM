require('dotenv').config();
const Token = require('../models/spotifyToken.js');
const fetch = require('node-fetch'); // Per fare in modo che funzioni anche per versioni di node < 18

const URL = 'https://accounts.spotify.com/api/token';

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

const searchTracks = async (query, token) => {
  const res = await fetch(
    `https://api.spotify.com/v1/search?q=${query}&type=track`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const { tracks } = await res.json();

  const tracksWithGenres = await Promise.all(
    tracks.items.map(async (track) => {
      const res = await fetch(
        `https://api.spotify.com/v1/artists/${track.artists[0].id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const { genres } = await res.json();
      return {
        ...track,
        genres,
      };
    })
  );

  return tracksWithGenres;
};

const searchArtists = async (query, token) => {
  const res = await fetch(
    `https://api.spotify.com/v1/search?q=${query}&type=artist`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  const { artists } = await res.json();
  // artists.items = artists.items.filter((artist) =>
  //   artist.name.toLowerCase().includes(query.toLowerCase())
  // );
  // artists.items.sort((a, b) => b.popularity - a.popularity);
  return artists.items;
};

const getArtist = async (id, token) => {
  const res = await fetch(`https://api.spotify.com/v1/artists/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const artist = await res.json();
  return artist;
};

const getArtistTracks = async (id, token) => {
  const res = await fetch(`https://api.spotify.com/v1/artists/${id}/albums`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const { items: albums } = await res.json();

  const tracks = await Promise.all(
    albums.map(async (album) => {
      const res = await fetch(
        `https://api.spotify.com/v1/albums/${album.id}/tracks`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const { items: tracks } = await res.json();
      return tracks.map((track) => {
        return {
          ...track,
          album: {
            name: album.name,
            image: album.images[0].url,
            release_date: album.release_date,
          },
        };
      });
    })
  );

  return tracks.flat();
};

const getTrack = async (id, token) => {
  const res = await fetch(`https://api.spotify.com/v1/tracks/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const track = await res.json();
  return track;
};

const getGenres = async (token) => {
  const res = await fetch(
    `https://api.spotify.com/v1/recommendations/available-genre-seeds`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const genres = await res.json();
  return genres;
};

const getRecommendations = async (token, genres, artists) => {
  const res = await fetch(
    `https://api.spotify.com/v1/recommendations?limit=20&seed_genres=${genres}&seed_artists=${artists}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const recommendations = await res.json();
  return recommendations;
};

const getRecommendationsByGenre = async (token, genres) => {
  const res = await fetch(
    `https://api.spotify.com/v1/recommendations?limit=20&seed_genres=${genres}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const recommendations = await res.json();
  return recommendations;
};

module.exports = {
  refreshToken,
  searchTracks,
  getTrack,
  getGenres,
  searchArtists,
  getArtist,
  getGenres,
  getRecommendations,
  getArtistTracks,
  getRecommendationsByGenre,
};
