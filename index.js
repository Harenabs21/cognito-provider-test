const express = require('express');
const session = require('express-session');
const { Issuer, generators } = require('openid-client');
const app = express();
const dotenv = require('dotenv');
dotenv.config()
      


app.get('/hello', (req, res) => {
    res.send("hello world")
})



let client;


// Initialize OpenID Client
async function initializeClient() {
    const issuer = await Issuer.discover(`https://cognito-idp.${process.env.COGNITO_REGION_AWS}.amazonaws.com/${process.env.COGNITO_REGION_AWS}_IT4dHreQq`);
    client = new issuer.Client({
        client_id: process.env.COGNITO_SECRET_CLIENT_ID,
        client_secret: process.env.COGNITO_SECRET_CLIENT,
        redirect_uris: [`${process.env.REDIRECT_URI}`],
        response_types: ['code']
    });
};
initializeClient().catch(console.error);

app.use(session({
    secret: 'some secret',
    resave: false,
    saveUninitialized: false
}));

const checkAuth = (req, res, next) => {
    if (!req.session.userInfo) {
        req.isAuthenticated = false;
    } else {
        req.isAuthenticated = true;
    }
    next();
};

app.get('/', checkAuth, (req, res) => {
    res.render('home', {
        isAuthenticated: req.isAuthenticated,
        userInfo: req.session.userInfo
    });
});
app.get('/login', (req, res) => {
    const nonce = generators.nonce();
    const state = generators.state();

    req.session.nonce = nonce;
    req.session.state = state;

    const authUrl = client.authorizationUrl({
        scope: 'email openid phone',
        state: state,
        nonce: nonce,
    });

    res.redirect(authUrl);
});

function getPathFromURL(urlString) {
    try {
        const url = new URL(urlString);
        return url.pathname;
    } catch (error) {
        console.error('Invalid URL:', error);
        return null;
    }
}

app.get(getPathFromURL(`${process.env.REDIRECT_URI}`), async (req, res) => {
    try {
        const params = client.callbackParams(req);
        const tokenSet = await client.callback(
            `${process.env.REDIRECT_URI}`,
            params,
            {
                nonce: req.session.nonce,
                state: req.session.state
            }
        );

        const userInfo = await client.userinfo(tokenSet.access_token);
        req.session.userInfo = userInfo;

        res.redirect('/');
    } catch (err) {
        console.error('Callback error:', err);
        res.redirect('/');
    }
});

// Logout route
app.get('/logout', (req, res) => {
    req.session.destroy();
    const logoutUrl = `https://eu-west-3it4dhreqq.auth.eu-west-3.amazoncognito.com/logout?client_id=3eu7lnhdgfnu78ak429dlf898l&logout_uri=/login`;
    res.redirect(logoutUrl);
});



app.set('view engine', 'ejs');

const port = 3000;

app.listen(port, () => console.log(`Server running on port ${port}`))

module.exports = app;