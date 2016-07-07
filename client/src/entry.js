var Vue = require('vue');
var App = require('./components/app.vue');

import store from './store.js';

Vue.directive('click-outside', {
    bind: function () {
        document.addEventListener('click', function () {
            this.vm[this.expression]()
        }.bind(this));

        this.el.addEventListener('click', function (e) {
            e.stopPropagation();
        });
    },
});

var vm = new Vue({
	el: 'body',
	components: {	App	}
});

//--------------------------------------------------------------[ SERVER COMMUNICATION ]

// get assigned a socket id on connect
store.socket.on('socketId', function(socketId) {
	store.socketId = socketId;
});

// when a message is recieved, keep scrolled to bottom
store.socket.on('chat', function(sender, msg, className){
	vm.$broadcast('chatRecieved');
});

// recieve game state (this is only sent to the specific game)
store.socket.on('gameStateUpdated', function(gameState) {
	store.state = gameState;
});

// recieve game list
store.socket.on('gameList', function(gameList){
	store.gameList = gameList;
});

// recieve prebuilt decklists
store.socket.on('prebuiltDecklists', function(lists){
	vm.$broadcast('prebuiltDecklists', lists); //the deckloader uses this
});

// get validations results
store.socket.on('decklistValidated', function(playerSocketId, decklist, valid, validationError) {
	vm.$broadcast('decklistValidated', playerSocketId, decklist, valid, validationError);
});