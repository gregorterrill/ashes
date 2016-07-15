/**
 * HELPER UTILS
 * For minor actions that may be called from different places
 */

var _ = require('underscore');
var cards = require('../data/cards.json');

// -----------------------------------------------------------[ SHUFFLE A STACK ]
// randomizes the deck using the Fisher-Yates Shuffle (http://bost.ocks.org/mike/shuffle/)
function shuffle(stack) {
	var unshuffledCards = stack.length,
		lastUnshuffledCard,
		randomPick;

	while (unshuffledCards) {
		//choose a random card from the unshuffled part of the deck which, when removed, will decrease number of unshuffled cards by one
		randomPick = Math.floor(Math.random() * unshuffledCards--);
		//set aside the last unshuffled card
		lastUnshuffledCard = stack[unshuffledCards];
		//put the random card at the end of the unshuffled cards (from the next iteration on, this card will never be shuffled again)
		stack[unshuffledCards] = stack[randomPick];
		//put the set aside card where the random card was (a future iteration will eventually shuffle this card again)
		stack[randomPick] = lastUnshuffledCard;
	}

	stack = updateCardPositions(stack);

	return stack;
}

// -----------------------------------------------------------[ UPDATE CARD POSITIONS ]
// when we shuffle a stack or move cards between stacks, each card's position property
// becomes incorrect, so we need to recalculate them based on their new positions
function updateCardPositions(stack) {

	_.each(stack, function(card, index) {
		card.currentLocation.position = index;
	});
	return stack;
}

// -----------------------------------------------------------[ ROLL A DIE ]
function getDieRoll() {
	var faces = ['basic','basic','class','class','class','power'];
	return faces[Math.floor(Math.random() * faces.length)];
}

// -----------------------------------------------------------[ SET FIRST PLAYER ]
function setFirstPlayer(game, newFirstPlayerSocketId) {

	//unset the previous first player if there is one (there won't be at the start of the game)
	firstPlayerSocketId = getFirstPlayer(game);
	if (firstPlayerSocketId) {
		game.players[firstPlayerSocketId].isFirstPlayer = false;
	}

	// set the new first player
	game.players[newFirstPlayerSocketId].isFirstPlayer = true;

	return game;
}

// -----------------------------------------------------------[ GET FIRST PLAYER ]
function getFirstPlayer(game) {
	var firstPlayerSocketId = _.findKey(game.players, { 'isFirstPlayer': true });
	return firstPlayerSocketId;
}

// -----------------------------------------------------------[ GET CARD DATA ]
// Return an object with all of a card's details based on name
function getCardData(cardName) {
	var cardObject = cards[cardName];
	cardObject.name = cardName;
	return cardObject;
}

// -----------------------------------------------------------[ MOVE A CARD TO A STACK OR ZONE ]
function moveCardTo(game, card, destinationType, destination, destinationOwner) {

	var origin = {
		location: card.currentLocation,
		controller: card.controller
	};

	//if the origin is a stack, we need to remove this card from that stack by its index
	if (origin.location.type === 'stack') {
		game.players[origin.controller][origin.location.name].splice(origin.location.position, 1);
	}
	
	//if the origin is a zone, we need to remove this card and any attachments from that zone slot
	if (origin.location.type === 'zone') {
		game.players[origin.controller][origin.location.name].slots.splice(origin.location.position, 1);
		//TODO: handle attachments, like alteration spells
		
	}

	// if the destination is a stack or zone controlled by a different player than the origin, 
	// we need to update the controller of the card
	// TODO: this is untested, need to check if it actually works!
	if (destinationOwner !== origin.controller) {
		card.controller = destinationOwner;
	}

	//if the destination is a stack, we need to add this card to the top of that stack
	if (destinationType === 'stack') {

		//update the current location
		card.currentLocation = {
			type: destinationType,
			name: destination,
			position: game.players[destinationOwner][destination].length
		};

		//remove all of the card's tokens since it's being taken out of play
		card.tokens = {
			wound: 0,
			status: 0,
			exhaustion: 0,
			charm: 0
		};

		//add to top of stack (beginning of array)
		game.players[destinationOwner][destination].unshift(card);

	//if the destination is a zone, we need to add this card to the next available zone slot, unless the zone is full
	} else if (destinationType === 'zone') {

		//add to next available slot in zone
		var limit = game.players[destinationOwner][destination].limit;
		var usedSlots = game.players[destinationOwner][destination].slots.length;

		//if it's a ready spell, we need to check if another copy already exists, and if so, we stack onto it instead
		if (card.type === 'readySpell') {
			//TODO
		}

		//update the current location
		card.currentLocation = {
			type: destinationType,
			name: destination,
			position: usedSlots
		};

		//if there are free slots, put it there
		if (usedSlots < limit) {
			game.players[destinationOwner][destination].slots.push(card);
		} else {
			//TODO: otherwise discard it (generally this should be disallowed before it happens)
			game.players[origin.controller].discard.unshift(card);
		}
	}

	//after moving cards, we need to update the positions of their origin stack/zone and destination stack
	if (origin.location.type === 'stack') {
		game.players[origin.controller][origin.location.name] = updateCardPositions(game.players[origin.controller][origin.location.name]);
	} else {
		game.players[origin.controller][origin.location.name].slots = updateCardPositions(game.players[origin.controller][origin.location.name].slots);
	}

	//we don't need to do this one for zones because we aren't prepending to the array
	if (destinationType === 'stack') {
		game.players[destinationOwner][destination] = updateCardPositions(game.players[destinationOwner][destination]);
	}

	return game;
}

// -----------------------------------------------------------[ ADD TOKENS TO CARD ]
function addTokenToCard(game, tokenType, tokenQuantity, card, cardOwnerSocketId) {

	//if we're looking at a card in zone, we need to go into slots
	if (card.currentLocation.name === 'spellboard' || card.currentLocation.name === 'battlefield') {
		game.players[cardOwnerSocketId][card.currentLocation.name].slots[card.currentLocation.position].tokens[tokenType] += tokenQuantity;
	} else if (card.currentLocation.name === 'unit') {
		//TODO: how will these work?
	} else {
		//pheonixborn has no position (and currentLocation is just 'pheonixborn', there is no name property)
		game.players[cardOwnerSocketId][card.currentLocation].tokens[tokenType] += tokenQuantity;
	}
	return game;
}

// -----------------------------------------------------------[ REMOVE TOKENS FROM CARD ]
function removeTokenFromCard(game, tokenType, tokenQuantity, card, cardOwnerSocketId) {

	//if we're looking at a card in zone, we need to go into slots
	if (card.currentLocation.name === 'spellboard' || card.currentLocation.name === 'battlefield') {
		game.players[cardOwnerSocketId][card.currentLocation.name].slots[card.currentLocation.position].tokens[tokenType] -= tokenQuantity;
		//don't allow tokens to go negative
		if (activeGames[gameId].players[cardOwnerSocketId][card.currentLocation.name].slots[card.currentLocation.position].tokens[tokenType] < 0) {
			game.players[cardOwnerSocketId][card.currentLocation.name].slots[card.currentLocation.position].tokens[tokenType] = 0;
		}
	} else if (card.currentLocation.name === 'unit') {
		//TODO: how will these work?
	} else {
		//pheonixborn has no position (and currentLocation is just 'pheonixborn', there is no name property)
		game.players[cardOwnerSocketId][card.currentLocation].tokens[tokenType] -= tokenQuantity;
		//don't allow tokens to go negative
		if (game.players[cardOwnerSocketId][card.currentLocation].tokens[tokenType] < 0) {
			game.players[cardOwnerSocketId][card.currentLocation].tokens[tokenType] = 0;
		}
	}

	return game;
}


// -----------------------------------------------------------[ EXPORTS ]
module.exports.shuffle = shuffle;
module.exports.getDieRoll = getDieRoll;
module.exports.getCardData = getCardData;
module.exports.setFirstPlayer = setFirstPlayer;
module.exports.removeTokenFromCard = removeTokenFromCard;
module.exports.addTokenToCard = addTokenToCard;
module.exports.moveCardTo = moveCardTo;