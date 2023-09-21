const express = require('express');
const router = express.Router();
const auth = require('./auth');

__dirname = __dirname.replace('/src/routes', '');

router.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/hero.html');
});

router.get('/home', auth, (req, res) => {
  res.sendFile(__dirname + '/public/home.html');
});

router.get('/login', (req, res) => {
  res.sendFile(__dirname + '/public/login.html');
});

router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

router.get('/myPlaylist', auth, (req, res) => {
  res.sendFile(__dirname + '/public/myPlaylist.html');
});

router.get('/publicPlaylist', auth, (req, res) => {
  res.sendFile(__dirname + '/public/publicPlaylists.html');
});

router.get('/createPlaylist', auth, (req, res) => {
  res.sendFile(__dirname + '/public/createPlaylist.html');
});

router.get('/profile', auth, (req, res) => {
  res.sendFile(__dirname + '/public/profile.html');
});

router.get('/playlist/:id', auth, (req, res) => {
  res.sendFile(__dirname + '/public/playlistinfo.html');
});

router.get('/tracks', auth, (req, res) => {
  res.sendFile(__dirname + '/public/tracks.html');
});

router.get('/editProfile', auth, (req, res) => {
  res.sendFile(__dirname + '/public/editProfile.html');
});

router.get('/editPlaylist/:id', auth, (req, res) => {
  res.sendFile(__dirname + '/public/editPlaylist.html');
});

module.exports = router;
