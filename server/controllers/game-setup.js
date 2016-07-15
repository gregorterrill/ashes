/**
 * GAME SETUP
 * Decklist validation
 * Deck building
 * First Five
 * Starting first round
 */

var _ = require('underscore');
var utils = require('../helpers/utils.js');
var cards = require('../data/cards.json');
var Card = require('../models/card.js');
var gameFlow = require('./game-flow.js');

// -----------------------------------------------------------[ VALIDATE DECKLIST ]
// Check the decklist, adding conjurations if needed
// If the deck is invalid, send an error
// If the deck is valid, build the deck and trigger moving
// the game state forward
function validateDecklist(decklist, game, playerSocketId) {

	var totalCards = 0;
	var validationResults = {
		valid: true,
		error: '',
		decklist: ''
	};
	var cardBeingChecked;

	try {
		decklist = JSON.parse(decklist);
	} catch (error) {
		validationResults.valid = false;
		validationResults.error = 'Decklist is invalid JSON.';
		return validationResults;
	}

	//add empty conjurations
	decklist.conjurations = {};
	
	//make sure we have a pheonixborn and deck
	if (decklist.deck && decklist.pheonixborn) {

		//check that pheonixborn is valid
		cardBeingChecked = cards[decklist.pheonixborn];
		if (!cardBeingChecked || cardBeingChecked.type != 'pheonixborn') {
			validationResults.valid = false;
			validationResults.error = 'Deck has an invalid Pheonixborn.';
			return validationResults;
		}

		//check if we need to add conjurations for the pheonixborn
		if (cardBeingChecked.conjurations) {
			for (key in cardBeingChecked.conjurations) {
				if (cards[key] && cards[key].type === 'conjuration') {
					decklist.conjurations[key] = cardBeingChecked.conjurations[key];
				} 
			}
		}

		//go through all of the cards in the deck
		//make sure it has 30 cards and no more of three each
		_.each(decklist.deck, function(quantity, cardName) {

			//check this card against the master card list to make sure its there
			cardBeingChecked = cards[cardName];
			if (!cardBeingChecked) {
				validationResults.valid = false;
				validationResults.error = 'Deck contains an invalid card: \'' + cardName + '\'.';
				return validationResults;
			}

			//check if the card has any character restriction
			if (cardBeingChecked.exclusive && cardBeingChecked.exclusive !== decklist.pheonixborn) {
				validationResults.valid = false;
				validationResults.error = 'Deck has a card that is exclusive to another Pheonixborn: \'' + cardName + '\'.';
				return validationResults;
			}

			//check if we need to add conjurations for it
			if (cardBeingChecked.conjurations) {
				for (key in cardBeingChecked.conjurations) {
					if (cards[key] && cards[key].type === 'conjuration') {
						decklist.conjurations[key] = cardBeingChecked.conjurations[key];
					} 
				}
			}

			//check quantity of cards in the deck
			quantity = parseInt(quantity);

			if (quantity > 3 ) {
				validationResults.valid = false;
				validationResults.error = 'Deck contains more than 3 copies of a card.';
				return validationResults;
			}
			if (quantity < 1 ) {
				validationResults.valid = false;
				validationResults.error = 'Deck contains fewer than 1 copy of a card.';
				return validationResults;
			}
			totalCards += quantity;

		});

		if (totalCards !== 30) {
			validationResults.valid = false;
			validationResults.error = 'Deck does not contain exactly 30 cards.';
			return validationResults;
		}

	} else {
		validationResults.valid = false;
		validationResults.error = 'Decklist does not contain a deck and/or Pheonixborn.';
		return validationResults;
	}

	//check the dice!
	if (decklist.dice) {

		if (decklist.dice.cha + decklist.dice.ill + decklist.dice.cer + decklist.dice.nat !== 10) {
			validationResults.valid = false;
			validationResults.error = 'Decklist does not contain exactly 10 dice.';
			return validationResults;
		}

	} else {
		validationResults.valid = false;
		validationResults.error = 'Decklist does not contain dice.';
		return validationResults;
	}

	//HOORAY WE'RE VALID

	//build the decks and send them to activeGames
	buildDeck(decklist, game, playerSocketId);

	//if this was the last decklist to be validated, we should start the game!
	//MODULARIZE
	advanceGameStatusWhenReady(game);

	//add the modified decklist (w/conjurations added)
	validationResults.decklist = JSON.stringify(decklist);
	return validationResults;
}

// -----------------------------------------------------------[ BUILD DECK ]
// Build decklists in shuffleable arrays and set up dice array 
// Push the decks to activeGames
function buildDeck(decklist, game, playerSocketId) {

	var deck = [];
	var conjurations = [];
	var dice = [];

	//we're just getting the data instead of making the card so we can use the spellboard/battlefield values soon
	var pheonixbornData = utils.getCardData(decklist.pheonixborn);

	//rebuild the decks as arrays so we can shuffle them and we have card objects instead of strings
	_.each(decklist.deck, function(quantity, cardName) {
		for (var i = quantity - 1; i >= 0; i--) {

			var startingLocation = {
				type: 'stack',
				name: 'deck',
				position: deck.length
			};

			deck.push(new Card(utils.getCardData(cardName), playerSocketId, startingLocation));
		}
	});

	_.each(decklist.conjurations, function(quantity, cardName) {
		for (var i = quantity - 1; i >= 0; i--) {

			var startingLocation = {
				type: 'stack',
				name: 'conjurations',
				position: conjurations.length
			};

			conjurations.push(new Card(utils.getCardData(cardName), playerSocketId, startingLocation));
		}
	});

	//create the dice arrays
	_.each(decklist.dice, function(quantity, type) {
		for (var i = quantity - 1; i >= 0; i--) {
			dice.push({
				type: type,
				face: 'basic',
				exhausted: true
			});
		}
	});

	//send this player's decklist to activeGames
	game.players[playerSocketId].pheonixborn = new Card(pheonixbornData, playerSocketId, 'pheonixborn');
	game.players[playerSocketId].deck = deck;
	game.players[playerSocketId].dice = dice;
	game.players[playerSocketId].conjurations = conjurations;

	//set up this players board zones
	game.players[playerSocketId].battlefield.limit = pheonixbornData.battlefield;
	game.players[playerSocketId].spellboard.limit = pheonixbornData.spellboard;

	return game;
}

// -----------------------------------------------------------[ VALIDATE A PLAYER'S FIRST FIVE ]
function validateFirstFive(game, playerSocketId) {

	var hand = game.players[playerSocketId].hand;
	var valid = true;

	//if we don't have five cards, bail
	if (hand.length !== 5) {
		valid = false;
	}

	if (valid) {
		//make sure all of the five cards have unique names
		var cardNames = _.pluck(hand, 'name');
		if (_.uniq(cardNames).length !== 5) {
			valid = false;
		}
	}

	if (valid) {
		game = gameFlow.updatePlayerActions(game, 'firstFiveValid', playerSocketId);
	} else {
		game = gameFlow.updatePlayerActions(game, 'firstFiveInvalid', playerSocketId);
	}

	return {
		game: game,
		valid: valid
	};
}

// -----------------------------------------------------------[ ADVANCE GAME STATUS ]
// Compare number of players to max players to see if waiting
// If the status is changing, update the game round
function advanceGameStatusWhenReady(game) {

	//determine what to check based on current game status
	switch (game.status) {

		case 'inPlay':
			//if it's in play already, why are we even here?
			return false;
			break;

		case 'waiting':
			//if we have fewer than the player cap, we're still waiting
			var numPlayers = _.keys(game.players).length;
			if (game.maxPlayers > numPlayers) {
				//still waiting
				return false;

			} else {
				//if we have the player cap, check if everyone's validated their decklists
				var numReadyPlayers = 0;
				_.each(game.players, function(player, playerSocketId) {
					if (player.deck && player.deck.length === 30) {
						numReadyPlayers++;
					}
				});

				//all players are ready
				if (numReadyPlayers === numPlayers) {
					//initialize first five phase
					if (game.gameRound === -1) {
						game.gameRound = 0;
						game.status = 'firstFive';
						
						//tell the players we need some action
						game = gameFlow.updatePlayerActions(game, 'requestFirstFive');
					}
				}
			}
			break;

		case 'firstFive':
			//check if everyone's submitted their first five
			var allFirstFivesValidated = true;
			_.each(game.players, function(playerData, playerSocketId) {
				if (game.players[playerSocketId].actions.status !== 'waitingFirstFive') {
					allFirstFivesValidated = false;
				}
			});

			if (allFirstFivesValidated) {
				//move on to first round
				game.status = 'inPlay';

				//tell the players we need some action
				game = gameFlow.updatePlayerActions(game, 'preparePhase');
			}
			break;

		default:
			break;
	}

	return game;
}


// -----------------------------------------------------------[ EXPORTS ]
module.exports.validateFirstFive = validateFirstFive;
module.exports.validateDecklist = validateDecklist;
module.exports.advanceGameStatusWhenReady = advanceGameStatusWhenReady;