const express = require('express');
const router = express.Router();

router.get('/show-modal', (req, res) => {
  /*
    #swagger.tags = ["Utility"]
    #swagger.summary = "Mostra il modal di benvenuto se non è stato mostrato in precedenza (si resetta quando si chiude la sessione)"
  */
  console.log(req.session);
  if (!req.session.modalShown) {
    req.session.modalShown = true;
    console.log(req.session);
    res.json({ showModal: true });
  } else {
    res.json({ showModal: false });
  }
});

module.exports = router;
