'use strict';

var Card = function(cardData, owner, startingLocation) {
	this.name = cardData.name;
	this.type = cardData.type;
	this.location = cardData.location;
	this.cost = cardData.cost;
	this.attack = cardData.attack;
	this.life = cardData.life;
	this.recover = cardData.recover;
	this.restrictions = cardData.restrictions;
	this.abilities = cardData.abilities;
	this.controller = owner;
	this.owner = owner;
	this.currentLocation = startingLocation;
	this.tokens = {
		wound: 0,
		status: 0,
		exhaustion: 0,
		charm: 0
	};
};

module.exports = Card;