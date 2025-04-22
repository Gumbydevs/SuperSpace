# SuperSpace

A multiplayer space shooter game inspired by SubSpace.

## Deployment Instructions

The project consists of two parts:
1. Client (frontend) - HTML/CSS/JS game
2. Server (backend) - Node.js multiplayer server

### Prerequisites

- GitHub account
- Vercel account (for client deployment)
- Render account (for server deployment)

### Deploying the Client to Vercel

1. Push your code to a GitHub repository
2. Log in to Vercel (https://vercel.com)
3. Click "New Project" and import your GitHub repository
4. Keep the default settings (Framework preset: Other)
5. Click "Deploy"
6. Once deployed, copy the domain URL provided by Vercel

### Deploying the Server to Render

1. Log in to Render (https://render.com)
2. Click "New" > "Web Service"
3. Connect your GitHub repository
4. Use the following settings:
   - Name: superspace-server (or any name you prefer)
   - Build Command: `cd server && npm install`
   - Start Command: `cd server && npm start`
   - Environment Variables: None required for basic setup
5. Click "Create Web Service"
6. Wait for the deployment to complete
7. Copy the domain URL provided by Render

### Connecting Client to Server

1. Update the `serverUrl` in `js/game.js` with your Render deployment URL if needed
2. Redeploy the client if you made any changes

## Local Development

### Client
```bash
npm install
npm start
```

### Server
```bash
cd server
npm install
npm run dev
```

## Testing Multiplayer

1. Share your deployed Vercel URL with friends
2. Each player that loads the game should connect to the multiplayer server
3. You should see players joining in the player list