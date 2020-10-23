var dotenv = require('dotenv').config();
var express = require('express');
var app = express();
var crypto = require('crypto');
var cookie = require('cookie');
var nonce = require('nonce');
var querystring = require('querystring');
var request = require('request-promise');

var apiKey = process.env.SHOPIFY_API_KEY;
var apiSecret = process.env.SHOPIFY_API_SECRET;
var scope = 'read_products';
var forwardingAddress = "https://25a49b6a9fd4.ngrok.io";

app.get('/install', function(req, res) {
    var shop = req.query.shop;
    if(shop) {
        var state = nonce();//randomstring
        var redirectUri = forwardingAddress + '/connect';
        var installUrl = 'https://' + shop + '/admin/oauth/authorize?client_id=' + apiKey +
        '&scope=' + scope + 
        '&state'  + state +
        '&redirect_uri=' + redirectUri;
        res.cookie('state', state);
        res.redirect(installUrl);
    } else {
        res.status(400).send('Missing Shop parameter');
    }
});

app.get('/connect', function(req, res) {
    var {shop,hmac, code, state} = req.query;
    var stateCookie = cookie.parse(req.headers.cookie).state;
    // if(stateCookie !== state) {
    //     return res.status(404).send('Request not verified');
    // }
    if(shop && hmac && code) {
        var map = Object.assign({}, req.query);
        delete map['hmac'];
        var message = querystring.stringify(map);
        var generatedHash = crypto
                            .createHmac('sha256', apiSecret)
                            .update(message)
                            .digest('hex');
        if(generatedHash !== hmac) {
            return res.status(404).send('Hmac validation failed');
        }
        var accessTokenReqUrl = 'https://' + shop + '/admin/oauth/acces_token';
        var accessTokenPayload =  {
            client_id : apiKey,
            client_secret : apiSecret,
            code : req.query.code
        };
        request.post(accessTokenReqUrl ,{json : accessTokenPayload})
        .then(function(accessToeknResponse) {
            var acessToken = accessToeknResponse.access_token;
            var apiReqUrl = 'https://' + shop + '/adminshop.json';
            var shopifyReqHeader = {
                'X-Shopify-Access-Token' : 'trZNf8VtpXQgboGq1XdY9JqO9R25aPwIqNc8AY4JMD+BkzV0kF+ts5G4CQzDHJuvXvjixnOgtswBVjxJhdLTLg==',
                'content-type': 'application/json'
            };
            request.get(apiReqUrl, {headers : shopifyReqHeader})
            .then(function(result) {
                res.cookie('access_token', 'trZNf8VtpXQgboGq1XdY9JqO9R25aPwIqNc8AY4JMD+BkzV0kF+ts5G4CQzDHJuvXvjixnOgtswBVjxJhdLTLg==');
                res.end(result);
            })
            .catch(function(err) {
                console.log("error");
                res.status(err.statusCode).send(err,err.error_description);
            })
        })
        .catch(function(err) {
            console.log("error");
            res.status(err.statusCode).send(err)
        })

        // var apiReqUrl = 'https://' + shop + '/admin/products.json';
        //     var shopifyReqHeader = {
        //         'X-Shopify-Access-Token' : 'trZNf8VtpXQgboGq1XdY9JqO9R25aPwIqNc8AY4JMD+BkzV0kF+ts5G4CQzDHJuvXvjixnOgtswBVjxJhdLTLg==',
        //         'content-type': 'application/json'
        //     };
        //     request.get(apiReqUrl, {headers : shopifyReqHeader})
        //     .then(function(result) {
        //         res.cookie('access_token', 'trZNf8VtpXQgboGq1XdY9JqO9R25aPwIqNc8AY4JMD+BkzV0kF+ts5G4CQzDHJuvXvjixnOgtswBVjxJhdLTLg==');
        //         res.end(result);
        //     })
        //     .catch(function(err) {
        //         console.log("error");
        //         res.status(err.statusCode).send(err)
        //     })

        // authenticity_token
        // return res.status(200).send('Hmac Validated');
    } else {
        return res.status(400).send('Parameters missing');
    }
});

app.listen(3000, function() {
    console.log("shopify running on 3000");
});