/**
 * Module requirements.
 */

var Server = require('./server');

/**
 * Exports the constructor.
 */

module.exports = ReliableServer;

function ReliableServer(opts) {
  Server.call(this, opts);
}

ReliableServer.prototype.__proto__ = Server.prototype;

ReliableServer.prototype.tryCount = 0;

ReliableServer.prototype.handshake = function(transport, req) {
  var id = base64id.generateId();

  debug('handshaking client "%s"', id);

  try {
    var transport = new transports[transport](req);
  }
  catch (e) {
    sendErrorMessage(req.res, Server.errors.BAD_REQUEST);
    return;
  }
  var socket = new Socket(id, this, transport);
  var self = this;

  if (false !== this.cookie) {
    transport.on('headers', function(headers){
      headers['Set-Cookie'] = self.cookie + '=' + id;
    });
  }

  transport.onRequest(req);

  this.clients[id] = socket;
  this.clientsCount++;
  this.emit('connection', socket);

  socket.once('close', function(){
    console.log("let's not delete stuff");
    // if client doesn't reconnect within 10 seconds,
    // we need to discard

    var tryIntervalTimer = setInterval(function() {
      if (self.tryCount > 10) {
        clearInterval(tryIntervalTimer);
        delete self.clients[id];
        self.clientsCount--;
      } else {
        if (self.clients[id].readyState == 'closed') {
          self.tryCount++;
        } else {
          self.tryCount = 0;
          clearInterval(tryIntervalTimer);
        }
      }
    }, 1000);
  });
}
