const mongoose = require('mongoose');

const playlistSchema = new mongoose.Schema(
  {
    titolo: {
      type: String,
      required: true,
    },
    descrizione: {
      type: String,
      required: true,
    },
    tags: {
      type: [
        {
          type: String,
        },
      ],
      required: false,
      default: [],
    },
    èPrivata: {
      type: Boolean,
      required: true,
    },
    tracce: [
      {
        type: {
          id: {
            type: String,
            required: true,
          },
          titolo: {
            type: String,
            required: true,
          },
          album: {
            type: String,
            required: true,
          },
          cantante: {
            type: String,
            required: true,
          },
          immagine: {
            type: String,
            required: true,
          },
          data_rilascio: {
            type: String,
            required: true,
          },
          durata: {
            type: Number,
            required: true,
          },
          popolarità: {
            type: Number,
            required: true,
          },
        },
        required: false,
        default: [],
      },
    ],
    creatore: {
      type: String,
      required: true,
    },
    followers: {
      type: [
        {
          userId: {
            type: String,
            required: true,
            ref: 'User',
          },
          èProprietario: {
            type: Boolean,
            required: false,
            default: false,
          },
        },
      ],
      required: true,
    },
  },
  { collection: 'playlists' }
);

const Playlist = mongoose.model('Playlist', playlistSchema);

module.exports = Playlist;
