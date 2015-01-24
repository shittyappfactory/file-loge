var self;

$.getScript('http://cdn.peerjs.com/0.3.9/peer.js')
    .success(function () {
        self = new Peer('jcw', { key: 'lwjd5qra8257b9' });

        // setup own handlers
        self.on('disconnected', function () {
            console.log('Connection lost, reconnecting...');
            self.reconnect();
        });

        self.on('connection', function(conn) {
            conn.on('open', function() {
                console.log('Incoming connection:', conn.peer);

                // incoming data events
                conn.on('data', function(data) {
                    console.log('[' + conn.peer + ']', data);
                });

                // send an ack
                conn.send('Hey, ' + conn.peer);
            })
        });

        // TODO: connect to everyone else in Firebase!
        var connection = self.connect('else');
        connection.on('open', function () {
            console.log('Opened connection:', connection.peer);

            connection.on('data', function (data) {
                console.log('[' + connection.peer + ']', data);
            });

            connection.on('close', function () {
                console.log('Connection closed:', connection.peer);
            });

            // Send messages
            connection.send('Whattup!!');
        });
    });