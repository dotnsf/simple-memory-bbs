//.  app.js
var express = require( 'express' ),
    bodyParser = require( 'body-parser' ),
    fs = require( 'fs' ),
    ejs = require( 'ejs' ),
    app = express();

var db = require( './db/db_no.js' );
//app.use( '/api/db', db );

app.use( bodyParser.urlencoded( { extended: true } ) );
app.use( bodyParser.json() );
app.use( express.static( __dirname + '/public' ) );

app.set( 'views', __dirname + '/views' );
app.set( 'view engine', 'ejs' );


app.get( '/', function( req, res ){
  api.getItems().then( function( r ){
    res.render( 'index', r );
  });
});

app.post( '/message', function( req, res ){
  res.contentType( 'application/json; charset=utf-8' );

  var item = req.body;
  api.createItem( item ).then( function( r ){
    res.redirect( '/' );
  });
});

var port = process.env.port || 8080;
app.listen( port );
console.log( "server starting on " + port + " ..." );
