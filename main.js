const { app, BrowserWindow } = require('electron')
const server = require('./server.js');
const path = require('path')
const crypto = require('crypto');
const LocalStorage = require('node-localstorage').LocalStorage;
const localStorage = new LocalStorage('./localStorage');
const url = require("url");
const ipc = require('electron').ipcMain;

const clientId = "8bf385dc4d9e43ca8b524f07a0fbbf8d";
const redirectUri = "http://localhost:3000/callback";
const scope = "user-modify-playback-state";
let code = undefined;

app.whenReady().then(async () => {
    createWindow();
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    })


    ipc.on("auth", async function (__event, __data) {
        if (!code) {
            code = await authenticate();
        }
    })

    const token = await getToken(clientId, code);

    ipc.on("enqueue", function (__event, __data) {
        queueSong(token);
    })
})

const createWindow = () => {
    const win = new BrowserWindow({
        webPreferences: {
            preload: path.join(__dirname, 'preload.js')
        }
    })

    win.maximize();
    win.loadFile('index.html');
}

// open window for authorization
async function authenticate() {
    const verifier = generateCodeVerifier(128);
    const challenge = generateCodeChallenge(verifier);
    const params = new URLSearchParams();
    const authWindow = new BrowserWindow({
        width: 800,
        height: 600,
        show: false,

        // required for security
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false
        }
    })

    localStorage.setItem("verifier", verifier);

    params.append("client_id", clientId);
    params.append("response_type", "code");
    params.append("redirect_uri", redirectUri);
    params.append("scope", scope);
    params.append("code_challenge_method", "S256");
    params.append("code_challenge", challenge);

    authWindow.loadURL(`https://accounts.spotify.com/authorize?${params.toString()}`);
    authWindow.show();

    return new Promise((resolve) => {
        authWindow.webContents.on("will-navigate", async (__event, newURL) => {
            const parsedURL = url.parse(newURL);
            if (parsedURL.protocol === "http:" && parsedURL.hostname === "localhost" && parsedURL.pathname === "/callback") {
                const queryString = await import("querystring");
                accessCode = queryString.parse(parsedURL.query).code;
                resolve(accessCode);
            }
        });
    });

    // this gives weird output after closing
    // authWindow.on('closed', () => {
    //     authWindow = null;
    // });
}

async function getToken(clientId, code) {
    const verifier = localStorage.getItem("verifier");

    const params = new URLSearchParams();
    params.append("client_id", clientId);
    params.append("grant_type", "authorization_code");
    params.append("code", code);
    params.append("redirect_uri", redirectUri);
    params.append("code_verifier", verifier);

    const result = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params
    });

    const { access_token } = await result.json();
    return access_token;
}

// challenge == verifier + SHA-256
function generateCodeChallenge(codeVerifier) {
    const data = new TextEncoder().encode(codeVerifier);
    const digest = crypto.createHash('sha256').update(data).digest(null);

    return btoa(String.fromCharCode.apply(null, [...new Uint8Array(digest)]))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

    // btoa is deprecated but spotify is very particular about code challenges

    // const str = String.fromCharCode.apply(null, [...new Uint8Array(digest)]);
    // return Buffer.from(str).toString('base64')
    //     .replace(/\+/g, '-')
    //     .replace(/\//g, '_')
    //     .replace(/=+$/, '');
}

// verifier == random string
function generateCodeVerifier(length) {
    let text = '';
    let possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

async function queueSong(token) {
    // 0NdTUS4UiNYCNn5FgVqKQY
    await fetch("https://api.spotify.com/v1/me/player/queue?uri=spotify%3Atrack%3A0NdTUS4UiNYCNn5FgVqKQY", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
    });
}

app.on('window-all-closed', () => {
    if (process.platform != 'darwin') app.quit();
})