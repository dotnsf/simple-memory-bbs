//.  app.js
var express = require( 'express' ),
    bodyParser = require( 'body-parser' ),
    fs = require( 'fs' ),
    ejs = require( 'ejs' ),
    app = express();

//var db = require( './db/db_no.js' );
var db = require( './db/db_postgres.js' );
//app.use( '/api/db', db );

app.use( bodyParser.urlencoded( { extended: true } ) );
app.use( bodyParser.json() );
app.use( express.static( __dirname + '/public' ) );

app.set( 'views', __dirname + '/views' );
app.set( 'view engine', 'ejs' );


app.get( '/', function( req, res ){
  db.readItems().then( function( r ){
    if( r && r.items ){
      for( var i = 0; i < r.items.length; i ++ ){
        var c = r.items[i].created;
        if( typeof c == 'string' ){ c = parseInt( c ); }
        r.items[i].created = datetime2string( c );
      }
    }
    console.log( JSON.stringify( r, null, 2 ) );
    res.render( 'index', r );
  });
});

app.post( '/message', function( req, res ){
  res.contentType( 'application/json; charset=utf-8' );

  var item = req.body;
  console.log( {item} ); //. { username: 'username', body: 'body', __mycaptcha_formula__: '89+4+8=93', __mycaptcha_time__: '136.162' }
  if( item && item.__mycaptcha_time__ && typeof item.__mycaptcha_time__ == 'string ' ){
    item.__mycaptcha_time__ = parseFloat( item.__mycaptcha_time__ );
  }

  //. DB 用に変換
  item.mode = item.__mycaptcha_mode__;
  item.formula = item.__mycaptcha_formula__;
  item.msec = item.__mycaptcha_time__ * 1000;

  db.createItem( item ).then( function( r ){
    res.redirect( '/' );
  });
});

function datetime2string( c ){
  var t = ( c ? c : ( new Date() ).getTime() );
  var dt = new Date();
  dt.setTime( t );

  var yyyy = dt.getFullYear();
  var mm = dt.getMonth() + 1;
  var dd = dt.getDate();
  var hh = dt.getHours();
  var nn = dt.getMinutes();
  var ss = dt.getSeconds();

  var str = yyyy + '-' + ( mm < 10 ? '0' : '' ) + mm + '-' + ( dd < 10 ? '0' : '' ) + dd
    + ' ' + ( hh < 10 ? '0' : '' ) + hh + ':' + ( nn < 10 ? '0' : '' ) + nn + ':' + ( ss < 10 ? '0' : '' ) + ss;
  return str;
}

var port = process.env.port || 8080;
app.listen( port );
console.log( "server starting on " + port + " ..." );
