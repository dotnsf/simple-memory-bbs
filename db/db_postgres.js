//. db_postgres.js

var express = require( 'express' ),
    bodyParser = require( 'body-parser' ),
    fs = require( 'fs' ),
    crypto = require( 'crypto' ),
    api = express();

require( 'dotenv' ).config();

//. uuid
function uuid(){
  return crypto.randomUUID();
}

//process.env.PGSSLMODE = 'no-verify';
var PG = require( 'pg' );
PG.defaults.ssl = true;
var database_url = 'DATABASE_URL' in process.env ? process.env.DATABASE_URL : ''; 

var settings_cors = 'CORS' in process.env ? process.env.CORS : '';
api.all( '/*', function( req, res, next ){
  if( settings_cors ){
    res.setHeader( 'Access-Control-Allow-Origin', settings_cors );
    res.setHeader( 'Vary', 'Origin' );
  }
  next();
});

var pg = null;
if( database_url ){
  console.log( 'database_url = ' + database_url );
  pg = new PG.Pool({
    connectionString: database_url,
    idleTimeoutMillis: ( 3 * 86400 * 1000 )
  });
  pg.on( 'error', function( err ){
    console.log( 'error on working', err );
    if( err.code && err.code.startsWith( '5' ) ){
      try_reconnect( 1000 );
    }
  });
}

function try_reconnect( ts ){
  setTimeout( function(){
    console.log( 'reconnecting...' );
    pg = new PG.Pool({
      connectionString: database_url,
      //ssl: { require: true, rejectUnauthorized: false },
      idleTimeoutMillis: ( 3 * 86400 * 1000 )
    });
    pg.on( 'error', function( err ){
      console.log( 'error on retry(' + ts + ')', err );
      if( err.code && err.code.startsWith( '5' ) ){
        ts = ( ts < 10000 ? ( ts + 1000 ) : ts );
        try_reconnect( ts );
      }
    });
  }, ts );
}


api.use( bodyParser.urlencoded( { extended: true } ) );
api.use( bodyParser.json() );
api.use( express.Router() );


api.createItem = async function( item ){
  return new Promise( async ( resolve, reject ) => {
    //. item = { username: 'username', body: 'body', __mycaptcha_mode__: 'matchbo', __mycaptcha_formula__: '89+4+8=93', __mycaptcha_time__: 136.162 }
    //. drop table mycaptchas;
    //. create table if not exists mycaptchas( id varchar(50) not null primary key, username varchar(50) not null, body text, mode varchar(50) not null, formula varchar(50) not null, msec bigint default 0, created bigint default 0, updated bigint default 0 );
    if( !item.id ){
      item.id = uuid();
    }

    var t = ( new Date() ).getTime();
    item.created = t;
    item.updated = t;

    if( pg ){
      conn = await pg.connect();
      if( conn ){
        try{
          var sql = 'insert into mycaptchas( id, username, body, mode, formula, msec, created, updated ) values ( $1, $2, $3, $4, $5, $6, $7, $8 )';
          var query = { text: sql, values: [ item.id, item.username, item.body, item.mode, item.formula, item.msec, item.created, item.updated ] };
          conn.query( query, function( err, result ){
            if( err ){
              console.log( err );
              resolve( { status: false, error: err } );
            }else{
              resolve( { status: true, item: result } );
            }
          });
        }catch( e ){
          console.log( e );
          resolve( { status: false, error: err } );
        }finally{
          if( conn ){
            conn.release();
          }
        }
      }else{
        resolve( { status: false, error: 'no connection.' } );
      }
    }else{
      resolve( { status: false, error: 'db not ready.' } );
    }
  });
};

api.readItem = async function( item_id ){
  return new Promise( async ( resolve, reject ) => {
    if( !item_id ){
      resolve( { status: false, error: 'id not specified.' } );
    }else{
      if( pg ){
        conn = await pg.connect();
        if( conn ){
          try{
            //var sql = 'insert into mycaptchas( id, username, body, mode, formula, msec, created, updated ) values ( $1, $2, $3, $4, $5, $6, $7, $8 )';
            var sql = "select * from mycaptchas where id = $1";
            var query = { text: sql, values: [ item_id ] };
            conn.query( query, function( err, result ){
              if( err ){
                console.log( err );
                resolve( { status: false, error: err } );
              }else{
                if( result && result.rows && result.rows.length > 0 ){
                  resolve( { status: true, item: result.rows[0] } );
                }else{
                  resolve( { status: false, error: 'no data' } );
                }
              }
            });
          }catch( e ){
            console.log( e );
            resolve( { status: false, error: err } );
          }finally{
            if( conn ){
              conn.release();
            }
          }
        }else{
          resolve( { status: false, error: 'no connection.' } );
        }
      }else{
        resolve( { status: false, error: 'db not ready.' } );
      }
    }
  });
};

api.readItems = async function( limit, offset ){
  return new Promise( async ( resolve, reject ) => {
    if( pg ){
      conn = await pg.connect();
      if( conn ){
        try{
          var sql = "select * from mycaptchas order by updated";
          if( limit ){
            sql += " limit " + limit;
          }
          if( offset ){
            sql += " start " + offset;
          }
          var query = { text: sql, values: [] };
          conn.query( query, function( err, result ){
            if( err ){
              console.log( err );
              resolve( { status: false, error: err } );
            }else{
              resolve( { status: true, items: result.rows } );
            }
          });
        }catch( e ){
          console.log( e );
          resolve( { status: false, error: e } );
        }finally{
          if( conn ){
            conn.release();
          }
        }
      }else{
        resolve( { status: false, error: 'no connection.' } );
      }
    }else{
      resolve( { status: false, error: 'db not ready.' } );
    }
  });
};

api.updateItem = async function( item ){
  return new Promise( async ( resolve, reject ) => {
    if( !item.id ){
      resolve( { status: false, error: 'no id specified.' } );
    }else{
      if( pg ){
        conn = await pg.connect();
        if( conn ){
          if( !item.id ){
            resolve( { status: false, error: 'no id.' } );
          }else{
            try{
              var sql = 'update mycaptchas set username = $1, body = $2, mode = $3, formula = $4, msec = $5, updated = $6 where id = $7';
              var t = ( new Date() ).getTime();
              item.updated = t;
              var query = { text: sql, values: [ item.username, item.body, item.mode, item.formula, item.msec, item.updated, item.id ] };
              conn.query( query, function( err, result ){
                if( err ){
                  console.log( err );
                  resolve( { status: false, error: err } );
                }else{
                  resolve( { status: true, item: result } );
                }
              });
            }catch( e ){
              console.log( e );
              resolve( { status: false, error: e } );
            }finally{
              if( conn ){
                conn.release();
              }
            }
          }
        }else{
          resolve( { status: false, error: 'no connection.' } );
        }
      }else{
        resolve( { status: false, error: 'db not ready.' } );
      }
    }
  });
};

api.deleteItem = async function( item_id ){
  return new Promise( async ( resolve, reject ) => {
    if( !item_id ){
      resolve( { status: false, error: 'no id specified.' } );
    }else{
      if( pg ){
        conn = await pg.connect();
        if( conn ){
          try{
            var sql = "delete from mycaptchas where id = $1";
            var query = { text: sql, values: [ item_id ] };
            conn.query( query, function( err, result ){
              if( err ){
                console.log( err );
                resolve( { status: false, error: err } );
              }else{
                resolve( { status: true } );
              }
            });
          }catch( e ){
            console.log( e );
            resolve( { status: false, error: e } );
          }finally{
            if( conn ){
              conn.release();
            }
          }
        }else{
          resolve( { status: false, error: 'no connection.' } );
        }
      }else{
        resolve( { status: false, error: 'db not ready.' } );
      }
    }
  });
};

api.deleteItems = async function(){
  return new Promise( async ( resolve, reject ) => {
    if( pg ){
      conn = await pg.connect();
      if( conn ){
        try{
          var sql = "delete from mycaptchas";
          var query = { text: sql, values: [] };
          conn.query( query, function( err, result ){
            if( err ){
              console.log( err );
              resolve( { status: false, error: err } );
            }else{
              resolve( { status: true } );
            }
          });
        }catch( e ){
          console.log( e );
          resolve( { status: false, error: e } );
        }finally{
          if( conn ){
            conn.release();
          }
        }
      }else{
        resolve( { status: false, error: 'no connection.' } );
      }
    }else{
      resolve( { status: false, error: 'db not ready.' } );
    }
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
