const express = require('express');
const router = express.Router();
const { promisify } = require('util');

// Middleware per la gestione async del salvataggio della sessione
router.use((req, _res, next) => {
  req.session.saveAsync = promisify(req.session.save.bind(req.session));
  next();
});

router.get('/show-modal', async (req, res) => {
  /*
    #swagger.tags = ["Utility"]
    #swagger.summary = "Mostra il modal per il completamento del profilo se non è stato completato il profilo (con le preferenze musicali)"
  */
  console.log(req.session);
  if (!req.session.modalShown) {
    req.session.modalShown = true;
    console.log(req.session);
    await req.session.saveAsync();
    res.json({ showModal: true });
  } else {
    res.json({ showModal: false });
  }
});

module.exports = router;
