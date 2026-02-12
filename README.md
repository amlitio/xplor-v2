# File Xplor — Interactive Knowledge Graphs from PDFs

Upload PDFs → AI extracts entities & relationships → Interactive knowledge graph with user accounts.

## Quick Setup (5 min)

### 1. Firebase Project

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. **Add Project** → name it `file-xplor` → Create
3. **Authentication** → Get Started → Enable **Email/Password** and **Google**
4. **Firestore Database** → Create Database → Start in **production mode** → Choose region
5. **Firestore Rules** tab → paste contents of `firestore.rules` → Publish
6. **Project Settings** (gear icon) → **General** → scroll to **Your apps** → click **Web** (</>) → Register app → copy the config

### 2. Environment Variables

Copy `.env.local.example` to `.env.local` and fill in:

```bash
cp .env.local.example .env.local
```

```
ANTHROPIC_API_KEY=sk-ant-your-key-here

NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=file-xplor-xxxxx.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=file-xplor-xxxxx
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=file-xplor-xxxxx.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef
```

### 3. Install & Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 4. Deploy to Vercel (optional)

```bash
npx vercel
```

Add the same env vars in Vercel dashboard → Settings → Environment Variables.

## Architecture

```
app/
  layout.js          — Root layout with AuthProvider
  page.js            — Main page (auth gate → projects → upload → explorer)
  globals.css        — Dark theme styles
  api/extract/
    route.js         — Server-side Anthropic API calls (keeps key safe)
components/
  AuthScreen.js      — Login / Signup with Google + Email
  ProjectsDashboard.js — List saved projects, create new
  UploadScreen.js    — PDF upload + AI processing
  Explorer.js        — Network graph, dashboard, directory, detail panel
lib/
  firebase.js        — Firebase init, auth functions, Firestore CRUD
  AuthContext.js      — React auth context provider
```

## Firestore Structure

```
users/{userId}
  email, displayName, createdAt, projectCount
  projects/{projectId}
    name, entities[], connections[], documents[]
    entityCount, connectionCount, documentCount
    documentNames[], createdAt, updatedAt

shared_projects/{shareId}
  (copy of project data + sharedBy, sharedAt)
```
