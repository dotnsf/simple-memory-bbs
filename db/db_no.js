//. db_no.js
var express = require( 'express' ),
    bodyParser = require( 'body-parser' ),
    crypto = require( 'crypto' ),
    api = express();

//. memory db
var __db = {};

//. uuid
function uuid(){
  return crypto.randomUUID();
}

var settings_cors = 'CORS' in process.env ? process.env.CORS : '';
api.all( '/*', function( req, res, next ){
  if( settings_cors ){
    res.setHeader( 'Access-Control-Allow-Origin', settings_cors );
    res.setHeader( 'Vary', 'Origin' );
  }
  next();
});

//. POST メソッドで JSON データを受け取れるようにする
api.use( bodyParser.urlencoded( { extended: true } ) );
api.use( bodyParser.json() );
api.use( express.Router() );


api.createItem = function( item ){
  return new Promise( ( resolve, reject ) => {
    if( !item.id ){
      item.id = uuid();
    }

    if( __db[item.id] ){
      resolve( { status: false, error: 'id in use.' } );
    }else{
      var t = ( new Date() ).getTime();
      item.created = t;
      item.updated = t;

      __db[item.id] = item;

      resolve( { status: true, item: item } );
    }
  });
};

api.readItem = function( item_id ){
  return new Promise( async ( resolve, reject ) => {
    if( !item_id ){
      resolve( { status: false, error: 'id not specified.' } );
    }else{
      if( !__db[item_id] ){
        resolve( { status: false, error: 'no data found.' } );
      }else{
        resolve( { status: true, item: __db[item_id] } );
      }
    }
  });
};

api.readItems = function( limit, start ){
  return new Promise( async ( resolve, reject ) => {
    var items = [];
    Object.keys( __db ).forEach( function( key ){
      items.push( __db[key] );
    });

    if( start ){
      items.splice( 0, start );
    }
    if( limit ){
      items.splice( limit )
    }

    resolve( { status: true, items: items } );
  });
};

api.updateItem = function( item ){
  return new Promise( ( resolve, reject ) => {
    if( !item.id ){
      resolve( { status: false, error: 'no id specified.' } );
    }else{
      if( !__db[item.id] ){
        resolve( { status: false, error: 'no data found.' } );
      }else{
        var t = ( new Date() ).getTime();
        item.updated = t;

        __db[item.id] = item;
        resolve( { status: true, item: item } );
      }
    }
  });
};

api.deleteItem = function( item_id ){
  return new Promise( ( resolve, reject ) => {
    if( !item_id ){
      resolve( { status: false, error: 'no id specified.' } );
    }else{
      if( !__db[item_id] ){
        resolve( { status: false, error: 'no data found.' } );
      }else{
        delete __db[item_id];
        resolve( { status: true } );
      }
    }
  });
};

api.deleteItems = async function(){
  return new Promise( async ( resolve, reject ) => {
    __db = {};
    resolve( { status: true } );
  });
};


api.post( '/item', async function( req, res ){
  res.contentType( 'application/json; charset=utf-8' );

  var item = req.body;

  api.createItem( item ).then( function( result ){
    res.status( result.status ? 200 : 400 );
    res.write( JSON.stringify( result, null, 2 ) );
    res.end();
  });
});

api.get( '/item/:id', async function( req, res ){
  res.contentType( 'application/json; charset=utf-8' );

  var item_id = req.params.id;
  api.readItem( item_id ).then( function( result ){
    res.status( result.status ? 200 : 400 );
    res.write( JSON.stringify( result, null, 2 ) );
    res.end();
  });
});

api.get( '/items', async function( req, res ){
  res.contentType( 'application/json; charset=utf-8' );

  var limit = 0;
  var start = 0;
  if( req.query.limit ){
    try{
      limit = parseInt( req.query.limit );
    }catch( e ){
    }
  }
  if( req.query.start ){
    try{
      start = parseInt( req.query.start );
    }catch( e ){
    }
  }
  api.readItems( limit, start ).then( function( result ){
    res.status( result.status ? 200 : 400 );
    res.write( JSON.stringify( result, null, 2 ) );
    res.end();
  });
});

api.put( '/item/:id', function( req, res ){
  res.contentType( 'application/json; charset=utf-8' );

  var item_id = req.params.id;
  var item = req.body;
  item.id = item_id;
  api.updateItem( item ).then( function( result ){
    res.status( result.status ? 200 : 400 );
    res.write( JSON.stringify( result, null, 2 ) );
    res.end();
  });
});

api.delete( '/item/:id', function( req, res ){
  res.contentType( 'application/json; charset=utf-8' );

  var item_id = req.params.id;
  api.deleteItem( item_id ).then( function( result ){
    res.status( result.status ? 200 : 400 );
    res.write( JSON.stringify( result, null, 2 ) );
    res.end();
  });
});

api.delete( '/items', function( req, res ){
  res.contentType( 'application/json; charset=utf-8' );

  api.deleteItems().then( function( result ){
    res.status( result.status ? 200 : 400 );
    res.write( JSON.stringify( result, null, 2 ) );
    res.end();
  });
});


//. api をエクスポート
module.exports = api;
