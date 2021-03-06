var ampersandModel = require('ampersand-model'),
    uuid = require('node-uuid'),
    _ = require('lodash');

module.exports = ampersandModel.extend({

    initialize: function(opts) {
        var self = this;

        self.username = opts.username || uuid.v4();
        self.createSocket();
        function log(x){
            return console.log.bind(console, x);
        }
        self.on('connection:open', log('cx:open'));
        self.on('connection:data', log('cx:data'));
        self.on('socket:open', log('sock:open'));

        // x-browser
        navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
    },

    createSocket: function() {
        var self = this,
            socket = self.socket = new Peer(self.username, {  // register w/ peer.js
                key: 'ecu8tcbbg0dg3nmi'
            });

        // send available to connectTo
        socket.on('open', function() {
            console.log('ready');
            self.trigger('socket:open');
        });

        // setup handlers (when someone connects to you)
        socket.on('connection', function(conn) {
            conn.on('open', function() {
                self.trigger('connection:open', conn);

                // incoming data events
                conn.on('data', function(data) {
                    console.log('[' + conn.peer + ']', data);
                    self.onData(data, conn);
                });

            });
        });

        socket.on('call', function(call) {
            _.forOwn(self.socket.connections, function(conns, userID){
                _.forEach(conns, function(conn){
                    if(conn !== call && conn.open && conn.metadata && conn.metadata.type === 'music') {
                        conn.close();
                    }
                });
            });

            self.trigger('call:received', call);
        });
    },

    broadcast: function(event){
        var self = this;

        _.forEach(self.getConnectedPeers(), function(peerID){
            _.forEach(self.socket.connections[peerID], function(conn){
                conn && conn.open && conn.send && conn.send(event);
            });
        });
    },

    broadcastStream: function(stream, metadata, opt){
        var self = this, peers = self.getConnectedPeers();

        opt = opt || {};

        if(opt.self){
            peers = peers.concat(self.username);
        }

        _.forEach(peers, function(peerID){
            self.socket.call(peerID, stream, {metadata: metadata});
        });
    },

    onData: function(data, connection) {
        var self = this;

        // f-yeah switch
        switch(data.type){
            case 'peer-list':
                return self.connectToPeers(_.filter(data.peers, function(peer){
                    return peer !== self.username;
                }));
            case 'request-peers':
                // send a list of connected peers
                return connection.send({
                    type: 'peer-list',
                    peers: self.getPeers()
                });
        }

        self.trigger("connection:data", {
            data: data,
            connection: connection
        });
    },

    connectToPeers: function(peers) {
        var self = this;

        return _.map(peers, function(peer) {
            self.connectToPeer(peer);
        });
    },

    connectToPeer: function(peer) {
        var self = this,
            connection = self.socket.connect(peer);

        connection.on('open', function () {
            console.log('connectToPeer > on open');
            self.trigger('connection:open', connection);

            if(self.getPeers().length === 1){
                connection.send({type:'request-peers'});
            }

            connection.on('data', function (data) {
                console.log('connectToPeer > on open > on data', data);
                self.onData(data, connection);
            });

            connection.on('close', function () {
                self.trigger('connection:close');
            });
        });

        return connection;
    },

    getOrCreateConnectionTo: function(peer){
        if(!_.contains(this.getConnectedPeers(), peer))
            return this.connectToPeer(peer);
        return this.socket.connections[peer].filter(function(conn){
            return conn.open;
        })[0];
    },

    leaveRoom: function() {
        var self = this;

        // goodbye world
        self.trigger('socket:closed', self.socket.peer);
        self.socket.destroy();
    },

    getPeers: function() {
        var self = this;

        return _.keys(self.socket.connections);
    },

    getConnectedPeers: function(){
        var self = this;

        return _.pairs(self.socket.connections).map(function(pair){
            var peerName = pair[0],
                connections = pair[1];

            return (connections.filter(function(conn){
                return conn.open;
            }).length) && peerName;
        }).filter(_.identity);
    },

    removePeer:  $.noop,

    extraProperties: 'allow'
});
