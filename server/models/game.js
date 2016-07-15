'use strict';

var Game = function() {
	this.gameName = 'Empty Game';
	this.gameId = '';
  this.status = 'waiting';
  this.gameRound = -1;
  this.isPrivate = false;
	this.allowSpectators = true;
  this.maxPlayers = 2;
  this.players = {};
  this.chatLog = [];
};

module.exports = Game;