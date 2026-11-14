# Switch on accounts and sharing (free, about 15 minutes)

Without this, Bibliotheca works but each phone or browser keeps its own separate library.
With it, anyone can create an account, gets a private library of their own, and can invite others by email.

## 1. Create the Firebase project
1. Go to https://console.firebase.google.com and sign in with a Google account.
2. Click **Create a project**. Name it `bibliotheca`. Turn **Google Analytics off**. Click **Create project**, then **Continue**.

## 2. Turn on email sign-in
1. In the left menu click **Build**, then **Authentication**, then **Get started**.
2. Under **Sign-in method** choose **Email/Password**, switch on the first toggle only, and click **Save**.
3. Open the **Settings** tab, then **Authorized domains**, click **Add domain** and type `YOURNAME.github.io`
   (for you: `prajwalbrk-web.github.io`). Click **Add**.

## 3. Create the database and the rules
1. Left menu **Build**, then **Firestore Database**, then **Create database**.
2. Choose a location close to you (for India: `asia-south1 (Mumbai)`), click **Next**, choose **Start in production mode**, click **Create**.
3. Open the **Rules** tab. Delete everything in the box and paste the whole content of `firestore.rules`. Click **Publish**.

## 4. Get your settings
1. Click the gear icon next to "Project Overview", then **Project settings**.
2. Scroll to **Your apps** and click the web icon **</>**. Nickname `bibliotheca`. Leave "Firebase Hosting" off. Click **Register app**.
3. You will see a block of code with `const firebaseConfig = { ... }`. Copy only the part between the curly braces.

## 5. Paste them into GitHub
1. In your repository open `docs/config.js`, click the pencil icon.
2. Replace the line `window.RR_FIREBASE = null;` with:

        window.RR_FIREBASE = {
          apiKey: "...",
          authDomain: "...",
          projectId: "...",
          storageBucket: "...",
          messagingSenderId: "...",
          appId: "..."
        };
   (paste your own values copied from step 4.)
3. Click **Commit changes**. Wait a minute, then open your website. After the door you will see the sign-in screen.
4. For the Android app: **Actions -> Build Android APK -> Run workflow** again, so the app includes the settings.

The apiKey is not a secret. The security rules you published in step 3 are what keep each library private.

## How it behaves
* Anyone can create an account (email and password). Each account gets its own library.
* Open the account button (top right) to invite someone by email: **Can read** or **Can edit**. They sign up or sign in with that same email, then accept.
* PDFs you attach stay on the device where you added them (or use a link). Covers and book details sync.
* Free plan limits (Spark): about 50,000 reads and 20,000 writes per day. That is plenty for personal use and small groups.
