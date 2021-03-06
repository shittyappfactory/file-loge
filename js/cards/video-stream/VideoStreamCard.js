var Card = require('../Card'),
    _ = require('lodash');

module.exports = Card.extend({
    innerTemplate: require('./VideoStreamCard.jade'),
    header: {
        title: 'Video Stream',
        icon: 'comments'
    },
    calls: {},
    initialize: function(options) {
        var view = this;

        this.peer = options.peer;
        this.startVideoStream();
        this.on('show', function() {
            $('#my-vidya').prop('src', URL.createObjectURL(view.stream)).prop('muted', true);
            view.makeCalls();
        });

        this.on('hide', function() {
            // end video stream here
            view.stream && view.stream.close();
        });

        this.peer.on('call:received', function(call) {
              view.answerCall(call);
        })
    },

    startVideoStream: function() {
        var view = this;

        navigator.getUserMedia({ video: true, audio: true }, function(stream) {
            view.stream = stream;
        }, function(err) {
            console.log('Failed to get local stream' ,err);
        });
    },

    bindCallEvents: function(call) {
        var $video = $('<video id="' + call.peer + '" autoplay="autoplay" style="width:250px">');

        call.on('stream', function(remoteStream) {
            // Show stream in some video/canvas element.
            $video.prop('src', URL.createObjectURL(remoteStream)).insertAfter('#my-vidya');
        });

    },

    makeCalls: function() {
        var receivers = this.peer.getPeers(),
            view = this;

        _.forEach(receivers, function(r) {
            view.bindCallEvents(view.peer.socket.call(r, view.stream));
        });
    },

    answerCall: function(call) {
        var view = this;
        navigator.getUserMedia({ video: true, audio: true }, function(stream) {
            call.answer(stream); // Answer the call with an A/V stream.
            view.bindCallEvents(call);
        }, function(err) {
            console.log('Failed to get local stream' ,err);
        });
    }
});
