//   _____ ____  _   _ ______ _____ _____
//  / ____/ __ \| \ | |  ____|_   _/ ____|
// | |   | |  | |  \| | |__    | || |  __
// | |   | |  | | . ` |  __|   | || | |_ |
// | |___| |__| | |\  | |     _| || |__| |
//  \_____\____/|_| \_|_|    |_____\_____|

// -----------------------------------------------------------[ ]
var express = require('express');
var app = express();
var http = require('http').Server(app);
var server = require('socket.io')(http);
var _ = require('underscore');
var path = require('path');

var publicDir = path.join(__dirname, '../client/public');
var lists = require('./data/decks.json');
var cards = require('./data/cards.json');

app.use(express.static('../client/public'));

app.get('/', function(req, res){
	res.sendFile(path.join(publicDir, 'index.html'));
});

app.get('/about', function (req, res) {
  res.sendFile(path.join(publicDir, 'about.html'));
});

http.listen(3000, function(){
	console.log('Ashes Online is running on port 3000. Prepare for magical fun times!');
});

//   _____          __  __ ______    ____  ____       _ ______ _____ _______ _____
//  / ____|   /\   |  \/  |  ____|  / __ \|  _ \     | |  ____/ ____|__   __/ ____|
// | |  __   /  \  | \  / | |__    | |  | | |_) |    | | |__ | |       | | | (___
// | | |_ | / /\ \ | |\/| |  __|   | |  | |  _ < _   | |  __|| |       | |  \___ \
// | |__| |/ ____ \| |  | | |____  | |__| | |_) | |__| | |___| |____   | |  ____) |
//  \_____/_/    \_\_|  |_|______|  \____/|____/ \____/|______\_____|  |_| |_____/

// -----------------------------------------------------------[ ]
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

// this will hold ALL basic info and states for ALL games currently active
var activeGames = {};


//   _____          __  __ ______   _      ____   _____ _____ _____
//  / ____|   /\   |  \/  |  ____| | |    / __ \ / ____|_   _/ ____|
// | |  __   /  \  | \  / | |__    | |   | |  | | |  __  | || |
// | | |_ | / /\ \ | |\/| |  __|   | |   | |  | | | |_ | | || |
// | |__| |/ ____ \| |  | | |____  | |___| |__| | |__| |_| || |____
//  \_____/_/    \_\_|  |_|______| |______\____/ \_____|_____\_____|

// -----------------------------------------------------------[ GET LIST OF GAMES ]
// Get only the basic info from activeGames
// We don't need all the state information for each game
function getGameList() {
	var gameList = {};

	_.each(activeGames, function(game, gameId) {
		gameList[gameId] = _.pick(game, ['gameName', 'gameId', 'status', 'isPrivate', 'allowSpectators', 'maxPlayers']);
	});
	return gameList;
}

// -----------------------------------------------------------[ GET GAME NAME ]
function getGameName(gameId) {
	var players = _.pluck(activeGames[gameId].players, 'username');
	return players.join(' vs. ');
}

// -----------------------------------------------------------[ GET FULL GAME STATE ]
function getGameState(gameId) {
	return activeGames[gameId];
}

// -----------------------------------------------------------[ SEND GAME STATE TO CLIENTS ]
function sendGameState(gameId) {
	console.log('Game ' + gameId + ' state updated.');
	server.to(gameId).emit('gameStateUpdated', getGameState(gameId));
}

// -----------------------------------------------------------[ SEND ACTIONS ]
// update the actions menu for a player (or all players)
// playerSocketId is optional, if not sent it will go to all players in the game
function sendActions(gameId, action, playerSocketId) {

	switch (action) {

		case 'requestFirstFive':
			_.each(activeGames[gameId].players, function(playerData, playerSocketId) {
				activeGames[gameId].players[playerSocketId].actions = {
					status: 'chooseFirstFive',
					message: 'Choose your First Five by moving 5 cards from your deck into your hand.',
					buttons: [{
						text: 'Submit First Five',
						action: 'submitFirstFive'
					}]
				};
			});
			break;

		case 'firstFiveInvalid':
			activeGames[gameId].players[playerSocketId].actions = {
				status: 'chooseFirstFive',
				message: 'Your First Five were invalid. Please re-submit.',
				buttons: [{
					text: 'Submit First Five',
					action: 'submitFirstFive'
				}]
			};
			break;

		case 'firstFiveValid':

			activeGames[gameId].players[playerSocketId].actions = {
				status: 'waitingFirstFive',
				message: 'Your First Five were submitted. Waiting for your opponent(s).',
				buttons: []
			};
			//check if we need to start play
			advanceGameStatusWhenReady(gameId);		
			break;

		case 'preparePhase':

			//increase the round counter, re-roll and refresh all dice, determine first player if first round
			preparePhaseAutoActions(gameId);

			//send actions
			_.each(activeGames[gameId].players, function(playerData, playerSocketId) {
				activeGames[gameId].players[playerSocketId].actions = {
					status: 'preparePhase',
					message: 'PREPARE PHASE: Discard any cards you wish from your hand and then draw back to five.',
					buttons: [{
						text: 'Draw up to five',
						action: 'drawToFive'
					}, {
						text: 'End prepare phase',
						action: 'endPrepare'
					}]
				};
			});
			break;

		//TODO
		case 'playerTurnsPhase':
			_.each(activeGames[gameId].players, function(playerData, playerSocketId) {
				activeGames[gameId].players[playerSocketId].actions = {
					status: 'playerTurnsPhase',
					message: 'PLAYER TURNS PHASE: Take your actions. The round will end when both players pass in a row.',
					buttons: [{
						text: 'Use dice power',
						action: 'dicePower'
					}, {
						text: 'Pass',
						action: 'pass'
					}]
				};
			});
			break;

		case 'recoveryPhase':

			//recover all units with recovery values, remove one exhaustion token from each card, pass first player marker
			recoveryPhaseAutoActions(gameId);

			_.each(activeGames[gameId].players, function(playerData, playerSocketId) {
				activeGames[gameId].players[playerSocketId].actions = {
					status: 'recoveryPhase',
					message: 'RECOVERY PHASE: Exhaust any dice you wish to re-roll next round.',
					buttons: [{
						text: 'End recovery phase',
						action: 'endRecovery'
					}]
				};
			});
			break;

		default:
			activeGames[gameId].players[playerSocketId].actions = {
				message: 'An error has occured.',
				buttons: []
			};
	}

	sendGameState(gameId);
}

// -----------------------------------------------------------[ GET A PLAYER'S USERNAME ]
function getPlayerUsername(gameId, playerSocketId) {
	return activeGames[gameId].players[playerSocketId].username;
}

// -----------------------------------------------------------[ REMOVE PLAYER FROM GAMES ]
// Removes a player from any games they are in
// Deletes the game if their departure makes it empty
function removePlayerFromGames(playerSocketId) {

	//look through each game
	_.each(activeGames, function(game, gameId) {
		//if they were in this game
		if (game.players[playerSocketId]) {
			//tell everyone they left :(
			chatToGame(gameId, 'server', game.players[playerSocketId].username + ' disconnected.');
			//remove them
			delete(activeGames[gameId].players[playerSocketId]);
			//if the game is now empty, delete it
			if (_.keys(activeGames[gameId].players).length === 0) {
				delete(activeGames[gameId]);
				console.log('Game ' + gameId + ' ended.');
			} else {
				//otherwise send game state
				sendGameState(gameId);
			}
		}
	});
}

// -----------------------------------------------------------[ ADD CHAT TO GAME ]
function chatToGame(gameId, sender, msg) {
	activeGames[gameId].chatLog.push({
		sender: sender,
		message: msg
	});
	//emit an event that alerts the sidebar to scroll to the bottom
	server.to(gameId).emit('chat');
}


//   _____          __  __ ______    _____ ______ _______ _    _ _____
//  / ____|   /\   |  \/  |  ____|  / ____|  ____|__   __| |  | |  __ \
// | |  __   /  \  | \  / | |__    | (___ | |__     | |  | |  | | |__) |
// | | |_ | / /\ \ | |\/| |  __|    \___ \|  __|    | |  | |  | |  ___/
// | |__| |/ ____ \| |  | | |____   ____) | |____   | |  | |__| | |
//  \_____/_/    \_\_|  |_|______| |_____/|______|  |_|   \____/|_|

// -----------------------------------------------------------[ VALIDATE DECKLIST ]
// Check the decklist, adding conjurations if needed
// If the deck is invalid, send an error
// If the deck is valid, build the deck and trigger moving
// the game state forward
function validateDecklist(decklist, gameId, playerSocketId) {

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
	buildDeck(decklist, gameId, playerSocketId);

	//if this was the last decklist to be validated, we should start the game!
	advanceGameStatusWhenReady(gameId);

	//add the modified decklist (w/conjurations added)
	validationResults.decklist = JSON.stringify(decklist);
	return validationResults;
}

// -----------------------------------------------------------[ BUILD DECK ]
// Build decklists in shuffleable arrays and set up dice array 
// Push the decks to activeGames
function buildDeck(decklist, gameId, playerSocketId) {

	var deck = [];
	var conjurations = [];
	var dice = [];

	//we're just getting the data instead of making the card so we can use the spellboard/battlefield values soon
	var pheonixbornData = getCardData(decklist.pheonixborn);

	//rebuild the decks as arrays so we can shuffle them and we have card objects instead of strings
	_.each(decklist.deck, function(quantity, cardName) {
		for (var i = quantity - 1; i >= 0; i--) {

			var startingLocation = {
				type: 'stack',
				name: 'deck',
				position: deck.length
			};

			deck.push(new Card(getCardData(cardName), playerSocketId, startingLocation));
		}
	});

	_.each(decklist.conjurations, function(quantity, cardName) {
		for (var i = quantity - 1; i >= 0; i--) {

			var startingLocation = {
				type: 'stack',
				name: 'conjurations',
				position: conjurations.length
			};

			conjurations.push(new Card(getCardData(cardName), playerSocketId, startingLocation));
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
	activeGames[gameId].players[playerSocketId].pheonixborn = new Card(pheonixbornData, playerSocketId, 'pheonixborn');
	activeGames[gameId].players[playerSocketId].deck = deck;
	activeGames[gameId].players[playerSocketId].dice = dice;
	activeGames[gameId].players[playerSocketId].conjurations = conjurations;

	//set up this players board zones
	activeGames[gameId].players[playerSocketId].battlefield.limit = pheonixbornData.battlefield;
	activeGames[gameId].players[playerSocketId].spellboard.limit = pheonixbornData.spellboard;
}

// -----------------------------------------------------------[ VALIDATE A PLAYER'S FIRST FIVE ]
function validateFirstFive(gameId, playerSocketId) {

	var hand = activeGames[gameId].players[playerSocketId].hand;
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
		sendActions(gameId, 'firstFiveValid', playerSocketId);
	} else {
		sendActions(gameId, 'firstFiveInvalid', playerSocketId);
	}

	return valid;
}

//   _____          __  __ ______            _____ _______ _____ ____  _   _  _____
//  / ____|   /\   |  \/  |  ____|     /\   / ____|__   __|_   _/ __ \| \ | |/ ____|
// | |  __   /  \  | \  / | |__       /  \ | |       | |    | || |  | |  \| | (___
// | | |_ | / /\ \ | |\/| |  __|     / /\ \| |       | |    | || |  | | . ` |\___ \
// | |__| |/ ____ \| |  | | |____   / ____ \ |____   | |   _| || |__| | |\  |____) |
//  \_____/_/    \_\_|  |_|______| /_/    \_\_____|  |_|  |_____\____/|_| \_|_____/

// -----------------------------------------------------------[ SHUFFLE ANY STACK OF CARDS ]
// randomizes the deck using the Fisher-Yates Shuffle (http://bost.ocks.org/mike/shuffle/)
function shuffleStack(stack) {
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

// -----------------------------------------------------------[ GET CARD DATA ]
// Return an object with all of a card's details based on name
function getCardData(cardName) {
	var cardObject = cards[cardName];
	cardObject.name = cardName;
	return cardObject;
}

// -----------------------------------------------------------[ PREPARE PHASE: AUTO ACTIONS ]
// roll and refresh all dice and determine start player
function preparePhaseAutoActions(gameId) {

	//increase the round counter
	activeGames[gameId].gameRound++;

	var lastPlayersBasics = false;

	//for each player...
	_.each(activeGames[gameId].players, function(playerData, playerSocketId) {

		var numBasics = 0;

		//and each of their dice...
		_.each(activeGames[gameId].players[playerSocketId].dice, function(dieData, index) {

			//if it's exhausted, refresh it and re-roll it
			if (dieData.exhausted) {
				var newFace = getDieRoll();
				activeGames[gameId].players[playerSocketId].dice[index].face = newFace;
				activeGames[gameId].players[playerSocketId].dice[index].exhausted = false;

				if (newFace === 'basic') {
					numBasics++;
				}
			}

		});

		//if this is the first round, we need to determine first player based on number of rolled basics
		if (activeGames[gameId].gameRound === 1) {

			//if there is a tie, both players need to re-roll
			if (numBasics === lastPlayersBasics) {
				//TODO: re-roll without being recursive, probably need to break first player determination into own function
			}

			//if this is the first player we've looked at, or they have more basics than the previous, they're the new start player
			if (!lastPlayersBasics || numBasics > lastPlayersBasics) {
				setFirstPlayer(gameId, playerSocketId);
			}
			lastPlayersBasics = numBasics;
		}

	});
}

// -----------------------------------------------------------[ RECOVERY PHASE: AUTO ACTIONS ]
// roll and refresh all dice and determine start player
function recoveryPhaseAutoActions(gameId) {
	//TODO: go through each unit and check for a recover value, if they have damage, remove that many tokens
	//TODO: remove one exhaustion token from each card
	
	//STEP 4: pass the first player to next in position
	//get the current first player's position
	var firstPlayerPosition = activeGames[gameId].players[getFirstPlayer(gameId)].position;

	//try to get the next position's socketId
	var newFirstPlayerSocketId = _.findKey(activeGames[gameId].players, { 'position': (firstPlayerPosition + 1) });

	//if there wasn't one, that player was the last, so cycle back to the first position
	if (!newFirstPlayerSocketId) {
		newFirstPlayerSocketId = _.findKey(activeGames[gameId].players, { 'position': 1 });
	}

	//set our new first player
	setFirstPlayer(gameId, newFirstPlayerSocketId);

}

// -----------------------------------------------------------[ SET FIRST PLAYER ]
function setFirstPlayer(gameId, newFirstPlayerSocketId) {

	//unset the previous first player if there is one (there won't be at the start of the game)
	firstPlayerSocketId = getFirstPlayer(gameId);
	if (firstPlayerSocketId) {
		activeGames[gameId].players[firstPlayerSocketId].isFirstPlayer = false;
	}

	// set the new first player
	activeGames[gameId].players[newFirstPlayerSocketId].isFirstPlayer = true;
}

// -----------------------------------------------------------[ GET FIRST PLAYER ]
function getFirstPlayer(gameId) {
	var firstPlayerSocketId = _.findKey(activeGames[gameId].players, { 'isFirstPlayer': true });
	return firstPlayerSocketId;
}

// -----------------------------------------------------------[ MOVE A CARD TO A STACK OR ZONE ]
function moveCardTo(gameId, card, destinationType, destination, destinationOwner) {

	var origin = {
		location: card.currentLocation,
		controller: card.controller
	};

	//if the origin is a stack, we need to remove this card from that stack by its index
	if (origin.location.type === 'stack') {
		activeGames[gameId].players[origin.controller][origin.location.name].splice(origin.location.position, 1);
	}
	
	//if the origin is a zone, we need to remove this card and any attachments from that zone slot
	if (origin.location.type === 'zone') {
		activeGames[gameId].players[origin.controller][origin.location.name].slots.splice(origin.location.position, 1);
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
			position: activeGames[gameId].players[destinationOwner][destination].length
		};

		//remove all of the card's tokens since it's being taken out of play
		card.tokens = {
			wound: 0,
			status: 0,
			exhaustion: 0,
			charm: 0
		};

		//add to top of stack (beginning of array)
		activeGames[gameId].players[destinationOwner][destination].unshift(card);

	//if the destination is a zone, we need to add this card to the next available zone slot, unless the zone is full
	} else if (destinationType === 'zone') {

		//add to next available slot in zone
		var limit = activeGames[gameId].players[destinationOwner][destination].limit;
		var usedSlots = activeGames[gameId].players[destinationOwner][destination].slots.length;

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
			activeGames[gameId].players[destinationOwner][destination].slots.push(card);
		} else {
			//TODO: otherwise discard it (generally this should be disallowed before it happens)
			activeGames[gameId].players[origin.controller].discard.unshift(card);
		}
	}

	//after moving cards, we need to update the positions of their origin stack/zone and destination stack
	if (origin.location.type === 'stack') {
		activeGames[gameId].players[origin.controller][origin.location.name] = updateCardPositions(activeGames[gameId].players[origin.controller][origin.location.name]);
	} else {
		activeGames[gameId].players[origin.controller][origin.location.name].slots = updateCardPositions(activeGames[gameId].players[origin.controller][origin.location.name].slots);
	}

	//we don't need to do this one for zones because we aren't prepending to the array
	if (destinationType === 'stack') {
		activeGames[gameId].players[destinationOwner][destination] = updateCardPositions(activeGames[gameId].players[destinationOwner][destination]);
	}
}

// -----------------------------------------------------------[ ADD TOKENS TO CARD ]
function addTokenToCard(gameId, tokenType, tokenQuantity, card, cardOwnerSocketId) {

	//if we're looking at a card in zone, we need to go into slots
	if (card.currentLocation.name === 'spellboard' || card.currentLocation.name === 'battlefield') {
		activeGames[gameId].players[cardOwnerSocketId][card.currentLocation.name].slots[card.currentLocation.position].tokens[tokenType] += tokenQuantity;
	} else if (card.currentLocation.name === 'unit') {
		//TODO: how will these work?
	} else {
		//pheonixborn has no position (and currentLocation is just 'pheonixborn', there is no name property)
		activeGames[gameId].players[cardOwnerSocketId][card.currentLocation].tokens[tokenType] += tokenQuantity;
	}

}

// -----------------------------------------------------------[ REMOVE TOKENS FROM CARD ]
function removeTokenFromCard(gameId, tokenType, tokenQuantity, card, cardOwnerSocketId) {

	//if we're looking at a card in zone, we need to go into slots
	if (card.currentLocation.name === 'spellboard' || card.currentLocation.name === 'battlefield') {
		activeGames[gameId].players[cardOwnerSocketId][card.currentLocation.name].slots[card.currentLocation.position].tokens[tokenType] -= tokenQuantity;
		//don't allow tokens to go negative
		if (activeGames[gameId].players[cardOwnerSocketId][card.currentLocation.name].slots[card.currentLocation.position].tokens[tokenType] < 0) {
			activeGames[gameId].players[cardOwnerSocketId][card.currentLocation.name].slots[card.currentLocation.position].tokens[tokenType] = 0;
		}
	} else if (card.currentLocation.name === 'unit') {
		//TODO: how will these work?
	} else {
		//pheonixborn has no position (and currentLocation is just 'pheonixborn', there is no name property)
		activeGames[gameId].players[cardOwnerSocketId][card.currentLocation].tokens[tokenType] -= tokenQuantity;
		//don't allow tokens to go negative
		if (activeGames[gameId].players[cardOwnerSocketId][card.currentLocation].tokens[tokenType] < 0) {
			activeGames[gameId].players[cardOwnerSocketId][card.currentLocation].tokens[tokenType] = 0;
		}
	}
}



// -----------------------------------------------------------[ ADVANCE GAME STATUS ]
// Compare number of players to max players to see if waiting
// If the status is changing, update the game round
function advanceGameStatusWhenReady(gameId) {

	//determine what to check based on current game status
	switch (activeGames[gameId].status) {

		case 'inPlay':
			//if it's in play already, why are we even here?
			return false;
			break;

		case 'waiting':
			//if we have fewer than the player cap, we're still waiting
			var numPlayers = _.keys(activeGames[gameId].players).length;
			if (activeGames[gameId].maxPlayers > numPlayers) {
				//still waiting
				return false;

			} else {
				//if we have the player cap, check if everyone's validated their decklists
				var numReadyPlayers = 0;
				_.each(activeGames[gameId].players, function(player, playerSocketId) {
					if (player.deck && player.deck.length === 30) {
						numReadyPlayers++;
					}
				});

				//all players are ready
				if (numReadyPlayers === numPlayers) {
					//initialize first five phase
					if (activeGames[gameId].gameRound === -1) {
						activeGames[gameId].gameRound = 0;
						activeGames[gameId].status = 'firstFive';
						
						//tell the players we need some action
						sendActions(gameId, 'requestFirstFive');
					}
				}
			}
			break;

		case 'firstFive':
			//check if everyone's submitted their first five
			var allFirstFivesValidated = true;
			_.each(activeGames[gameId].players, function(playerData, playerSocketId) {
				if (activeGames[gameId].players[playerSocketId].actions.status !== 'waitingFirstFive') {
					allFirstFivesValidated = false;
				}
			});

			if (allFirstFivesValidated) {
				//move on to first round
				activeGames[gameId].status = 'inPlay';

				//tell the players we need some action
				sendActions(gameId, 'preparePhase');
			}
			break;

		default:
			break;
	}

}


//   _____  ____   _____ _  ________ _______ _____
//  / ____|/ __ \ / ____| |/ /  ____|__   __/ ____|
// | (___ | |  | | |    | ' /| |__     | | | (___
//  \___ \| |  | | |    |  < |  __|    | |  \___ \
//  ____) | |__| | |____| . \| |____   | |  ____) |
// |_____/ \____/ \_____|_|\_\______|  |_| |_____/

// -----------------------------------------------------------[ SOCKET CONNECTION ]
server.on('connection', function(socket){

	//send the socket their ID when they connect
	server.to(socket.id).emit('socketId', socket.id);

	// -----------------------------------------------------------[ CLIENT DISCONNECTS ]
	socket.on('disconnect', function () {
		//find out if they were in a game, if so, clean up
		removePlayerFromGames(socket.id);
  });

  // -----------------------------------------------------------[ CLIENT SENDS CHAT ]
	socket.on('chat', function(gameId, sender, msg){
		//add chat to game
		chatToGame(gameId, sender, msg);
		//emit update
		sendGameState(gameId);
	});

	// -----------------------------------------------------------[ CLIENT REQUESTS GAME LIST ]
	socket.on('requestGameList', function(){
		server.emit('gameList', getGameList() );
	});

	// -----------------------------------------------------------[ CLIENT CREATES GAME ]
	socket.on('createGame', function(username){

		var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
		var gameId = '';

		//generate a gameId, don't allow duplicates
		do {
			gameId = _.sample(possible, 12).join('');
		} while (activeGames[gameId]);

		//add the user to the game
		socket.join(gameId);

		//create a new game and configure it
		var newGame = new Game();
		newGame.gameId = gameId;
		newGame.gameName = username;
		newGame.players[socket.id] = new Player(username, 1);
		activeGames[gameId] = newGame;

		//send the updated game list to everyone
		server.emit('gameList', getGameList());
		console.log('Game ' + gameId + ' created.');

		//send the game state to this game
		sendGameState(gameId);
	});

	// -----------------------------------------------------------[ CLIENT JOINS GAME ]
	socket.on('joinGame', function(gameId, username){

		//add the user to the game
		socket.join(gameId);

		//add the player to the game
		var playerPosition = _.keys(activeGames[gameId].players).length + 1;
		activeGames[gameId].players[socket.id] = new Player(username, playerPosition);

		//update the name of the game
		activeGames[gameId].gameName = getGameName(gameId);

		//if we have enough players to begin it's go time
		advanceGameStatusWhenReady(gameId);

		//send the updated game list to everyone
		server.emit('gameList', getGameList());

		//tell the game that someone has joined
		chatToGame(gameId, 'server',  username + ' connected.');

		//send the game state to this game
		sendGameState(gameId);
	});

	// -----------------------------------------------------------[ CLIENT REQUESTS PREBUILT DECKLISTS ]
	socket.on('requestPrebuiltLists', function(gameId){
		server.to(gameId).emit('prebuiltDecklists', lists);
	});

	// -----------------------------------------------------------[ CLIENT SUBMITS DECKLIST ]
	socket.on('submitDecklistForValidation', function(gameId, decklist){
		var validationResults = validateDecklist(decklist, gameId, socket.id);
		server.to(gameId).emit('decklistValidated', socket.id, validationResults.decklist, validationResults.valid, validationResults.error);
		sendGameState(gameId);
	});

	// -----------------------------------------------------------[ CLIENT REQUESTS GAME STATE ]
	socket.on('requestGameState', function(gameId) {
		sendGameState(gameId);
	});

	// -----------------------------------------------------------[ CLIENT TAKES A PROACTIVE ACTION WE NEED TO PROPOGATE ]
	socket.on('userAction', function(gameId, action) {

//action:
// 	playerSocketId: store.socketId,
// 	actionVerb: 'shuffle',
// 	target: this.type,
// 	targetOwnerSocketId: this.$parent.playerId

		var playerUsername = getPlayerUsername(gameId, action.playerSocketId);
		var actionDescription = 'did something.';

		//if there's a target owner, change the wording based on the relationship between acting player and target owner
		if (action.targetOwnerSocketId) {
			var targetOwnerUsername = getPlayerUsername(gameId, action.targetOwnerSocketId)
			if (action.playerSocketId === action.targetOwnerSocketId) {
				targetOwnerUsername = 'their ';
			} else {
				targetOwnerUsername += '\'s ';
			}
		}

		//actually do the thing, if we need to
		switch (action.actionVerb) {

			//target should be a stack name (e.g. "deck")
			case 'shuffle': 
				var stack = activeGames[gameId].players[action.targetOwnerSocketId][action.target];
				activeGames[gameId].players[action.targetOwnerSocketId][action.target] = shuffleStack(stack);
				actionDescription = playerUsername + ' shuffled ' + targetOwnerUsername + action.target + '.';
				break;

			//target should be a stack name (e.g. "deck")
			case 'peek':
				//we don't need to tell other players when a player looks at their own hand
				if (action.playerSocketId === action.targetOwnerSocketId && action.target === 'hand') {
					actionDescription = null;
				} else {
					actionDescription = playerUsername + ' peeked at ' + targetOwnerUsername + action.target + '.';
				}
				break;

			//object should be a card, target should be a stack or zone
			case 'move': 
				var origin = action.object.currentLocation.name;
				moveCardTo(gameId, action.object, action.targetType, action.target, action.targetOwnerSocketId);
				actionDescription = playerUsername + ' moved a card from ' + origin + ' to ' + action.target + '.';
				break;

			//object should be a token type, target should be a card
			case 'addToken': 
				//TODO: replace the 1 with quantity from context menu
				addTokenToCard(gameId, action.object, 1, action.target, action.targetOwnerSocketId);
				actionDescription = playerUsername + ' added a ' + action.object + ' token to ' + action.target.name + '.';
				break;

			//object should be a token type, target should be a card
			case 'removeToken': 
				//TODO: replace the 1 with quantity from context menu
				removeTokenFromCard(gameId, action.object, 1, action.target, action.targetOwnerSocketId);
				actionDescription = playerUsername + ' removed a ' + action.object + ' token from ' + action.target.name + '.';
				break;

			//target should be a die index (0-9)
			case 'roll':
				activeGames[gameId].players[action.targetOwnerSocketId].dice[action.target].face = getDieRoll();
				actionDescription = playerUsername + ' rolled one of ' + targetOwnerUsername + ' dice.';
				break;

			//target should be a die index (0-9)
			case 'refresh':
				activeGames[gameId].players[action.targetOwnerSocketId].dice[action.target].exhausted = false;
				actionDescription = playerUsername + ' refreshed one of ' + targetOwnerUsername + ' dice.';
				break;

			//target should be a die index (0-9)
			case 'exhaust':
				activeGames[gameId].players[action.targetOwnerSocketId].dice[action.target].exhausted = true;
				actionDescription = playerUsername + ' exhausted one of ' + targetOwnerUsername + ' dice.';
				break;

			//there is no target
			case 'submitFirstFive':
				var valid = validateFirstFive(gameId, action.playerSocketId);
				if (valid) {
					actionDescription = playerUsername + ' successfully submitted their First Five.';
				} else {
					actionDescription = playerUsername + ' submitted their First Five but it was invalid.';
				}
				break;

			//TODO
			case 'drawToFive':
				actionDescription = playerUsername + ' tried to draw up to five.';
				break;

			//TODO
			case 'endPrepare':
				actionDescription = playerUsername + ' tried to end the prepare phase.';
				break;

			//TODO
			case 'dicePower':
				actionDescription = playerUsername + ' tried to use a dice power.';
				break;

			//TODO
			case 'pass':
				actionDescription = playerUsername + ' tried to pass.';
				break;

			//TODO
			case 'endRecovery':
				actionDescription = playerUsername + ' tried to end the recovery phase.';
				break;

			default:
				actionDescription = playerUsername + ' tried to perform an unhandled action: ' + action.actionVerb + '.';

		}

		//tell everyone what happened if we need to
		if (actionDescription) {
			chatToGame(gameId, 'server', actionDescription);
		}

		//send the updated gamestate
		sendGameState(gameId);

		//if it was a roll, we have to send this after the game state update, 
		//so the animation won't be ended instantly for everyone
		if (action.actionVerb === 'roll') {
			server.to(gameId).emit('dieRoll', action.targetOwnerSocketId, action.target);
		}

	});

});