const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  nome: {
    type: String,
    required: true,
  },
  cognome: {
    type: String,
    required: true,
  },
  username: {
    type: String,
    required: true,
    unique: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  artistiPreferiti: {
    type: [
      {
        id: {
          type: String,
          required: true,
        },
        nome: {
          type: String,
          required: true,
        },
        immagine: {
          type: String,
          required: true,
        },
      },
    ],
    required: false,
    default: [],
  },
  generiPreferiti: {
    type: [String],
    required: false,
    default: [],
  },
});

const User = mongoose.model('User', userSchema);

module.exports = User;
