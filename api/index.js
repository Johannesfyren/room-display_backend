require('dotenv').config()
console.log(process.env.CLIENT_ID) 
const express = require("express");
const bodyParser = require("body-parser");

const { google } = require("googleapis");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const SCOPES = ["https://www.googleapis.com/auth/calendar"];
const TOKEN_PATH = path.join(process.cwd(), "token.json");
const CREDENTIALS_PATH = path.join(process.cwd(), "credentials.json");
// const oAuth2Client = require('./OAuth2.js')
const app = express();
const PORT = 3000;
const corsOptions = {
  origin: ['https://room-display-react.vercel.app','http://localhost:5173'], // Replace with your frontend's URL
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  allowedHeaders: "*",
};

app.use(bodyParser.json());
app.use(cors(corsOptions));
app.use(express.json());
//app.options('*', cors()) 


app.post("/refreshAccessToken", async (req, res) => {
    const refreshToken = req.body.refresh_token;
    try{

        const accessToken = await getNewAccessToken(refreshToken)
        if (!refreshToken) {
            return res.status(400).json({ error: "Missing refresh_token" });
          }
        res.json(accessToken);
    }catch(err){
        console.error("Error in /refreshAccessToken:", err);
        res.status(500).json({ error: "Internal server error" });
    }

  

});


//Used to generate a URL, which returns a code in the frontend, used in "/ouath2callback" to be exchanged for tokens
app.get("/auth-url", (req, res) => { 
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
  });
  res.json({ url: authUrl });
});

app.get("/oauth2callback", async (req, res) => {
  const code = req.query.code;
  console.log(code);

  if (!code) {

    return res.status(400).send("Authorization code is missing.");
  }

  try {
    // Exchange the code for tokens

    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);

    res.json(tokens); // Adjust to your app's needs
  } catch (error) {
    console.error("Error exchanging code for tokens:", error);
    res.status(500).send("Authentication failed.");
  }
});

function getOAuth2Client() {
  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, "utf8"));

  const { client_secret, client_id, redirect_uris } = credentials.web;

  const oAuth2Client = new google.auth.OAuth2(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET,
    redirect_uris[0]
  );

  if (fs.existsSync(TOKEN_PATH)) {
    const token = fs.readFileSync(TOKEN_PATH, "utf8");
    oAuth2Client.setCredentials(JSON.parse(token));
  }

  return oAuth2Client;
}

const oAuth2Client = getOAuth2Client();

//Gets and send a new access token for GAPI, for a refresh token from the frontend
async function getNewAccessToken(refreshToken) {
  const tokenEndpoint = "https://oauth2.googleapis.com/token";
  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, "utf8"));
  // const { client_secret, client_id } = credentials.web;

  const body = new URLSearchParams({
    client_id: process.env.CLIENT_ID,
    client_secret: process.env.CLIENT_SECRET,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });

  try {
    const response = await fetch(tokenEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    if (!response.ok) {
      throw new Error(`Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    return data; // The new access token
  } catch (error) {
    console.error("Failed to get new access token:", error);
  }
}

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

module.exports = app;