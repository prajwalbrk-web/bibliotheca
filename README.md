# Bibliotheca

A library of enchanted volumes for your own books: shelves that glow by candlelight, a page-turning PDF reader,
a book scanner, and (optionally) accounts so everyone has their own library and can share it.

* `docs/` is the website (GitHub Pages serves this folder). `docs/config.js` holds your Firebase settings.
* **Actions -> Build Android APK -> Run workflow** makes the installable Android app.
* `FIREBASE-SETUP.md` explains how to switch on accounts and sharing (free).
* `firestore.rules` are the security rules to paste into Firebase.
* To change the design, edit `src/head.html` and `src/app.js`, run `python3 build-www.py`, then copy the `www/` contents into `docs/`
  (keep your own `docs/config.js`).
