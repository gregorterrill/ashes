'use strict';

var Player = function(username, position) {
	this.username = username;
	this.position = position;
	this.isFirstPlayer = false;
	this.justPassed = false;
	this.actions = {
		message: 'Waiting for players to finalize decklists.',
		buttons: []
	};
	this.pheonixborn = {};
	this.dice = [];
	this.hand = [];
	this.deck = [];
	this.discard = [];
	this.conjurations = [];
	this.battlefield = { 
		limit: 5,
		slots: []
	};
	this.spellboard = {
		limit: 5,
		slots: []
	};
};

module.exports = Player;