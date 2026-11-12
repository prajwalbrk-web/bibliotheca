# Bibliotheca - Android app

This folder is a ready-to-build Android app (Capacitor). It works fully offline and
keeps your library on the phone. It has the closed-door knock screen, shelves,
barcode/cover/page scanner, Excel import/export and the page-turning PDF reader.

## Get the APK without installing anything (about 6 minutes)
1. Create a free account at github.com and make a new **private** repository.
2. Upload everything in this folder to it (drag the files onto the repository page,
   or run `git init && git add . && git commit -m app && git push`).
   Make sure the hidden `.github` folder is included.
3. Open the repository's **Actions** tab, choose **Build Android APK**, press **Run workflow**.
4. When it finishes (green tick), open the run and download **Bibliotheca-apk**.
   Unzip it to get `Bibliotheca.apk`.
5. Send the APK to any Android phone (WhatsApp, Drive, email, USB). Open it and allow
   "Install unknown apps" for that app when Android asks.

## Or build it on your own computer
Needs Node 18+, Python 3, JDK 17 and Android Studio (for the Android SDK).

    npm install
    npm run apk

The APK appears in `android/app/build/outputs/apk/debug/app-debug.apk`.

## Install without an APK (any phone)
Put the contents of `www/` (created by `python3 build-www.py`) on any HTTPS web host, for
example GitHub Pages. Open the address in Chrome on Android and choose
**Add to Home screen / Install app**. It runs full screen and offline.

## Notes
* The library lives on the device that installed it (nothing is uploaded).
  Use **Export** to back it up as Excel and **Import** to restore.
* A debug-signed APK installs fine for sharing. To publish on Google Play you would
  build a signed release (`./gradlew bundleRelease`) with your own key.
* Barcode lookups need internet (public book databases). Everything else works offline.
* Edit the site in `src/head.html` and `src/app.js`, then run
  `python3 build-www.py && npx cap sync android` to rebuild.
