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
	console.log('listening on *:3000');
});

// -----------------------------------------------------------[ GAME OBJECTS ]
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

// -----------------------------------------------------------[ GET GAME STATE ]
function getGameState(gameId) {
	return activeGames[gameId];
}

// -----------------------------------------------------------[ SEND GAME STATE TO CLIENTS ]
function sendGameState(gameId) {
	console.log('sending a game state for game ' + gameId);
	server.to(gameId).emit('gameStateUpdated', getGameState(gameId));
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
	checkGameStatus(gameId);

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

	//rebuild the decks as arrays so we can shuffle them
	_.each(decklist.deck, function(quantity, cardName) {
		for (var i = quantity - 1; i >= 0; i--) {
			deck.push(cardName);
		}
	});

	_.each(decklist.conjurations, function(quantity, cardName) {
		for (var i = quantity - 1; i >= 0; i--) {
			conjurations.push(cardName);
		}
	});

	//create the dice arrays
	_.each(decklist.dice, function(quantity, type) {
		for (var i = quantity - 1; i >= 0; i--) {
			dice.push({
				type: type,
				face: 'basic',
				exhausted: false
			});
		}
	});

	//send this player's decklist to activeGames
	activeGames[gameId].players[playerSocketId].pheonixborn = decklist.pheonixborn;
	activeGames[gameId].players[playerSocketId].deck = deck;
	activeGames[gameId].players[playerSocketId].dice = dice;
	activeGames[gameId].players[playerSocketId].conjurations = conjurations;
}

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

	return stack;
}

// -----------------------------------------------------------[ ROLL A DIE ]
function getDieRoll() {
	var faces = ['basic','basic','class','class','class','power'];
	return faces[Math.floor(Math.random() * faces.length)];
}

// -----------------------------------------------------------[ GET CARD ]
// Return an object with all of a card's details based on name
function getCard(cardName) {
	return cards[cardName];
}

// -----------------------------------------------------------[ CHECK GAME STATUS ]
// Compare number of players to max players to see if waiting
// If the status is changing, update the game round
function checkGameStatus(gameId) {

	//don't keep running this check if the game is already in play
	if (activeGames[gameId].status === 'inPlay') {
		return false;
	}

	var numPlayers = _.keys(activeGames[gameId].players).length;
	var numReadyPlayers = 0;

	//if we have fewer than the player cap, we're waiting
	if (activeGames[gameId].maxPlayers > numPlayers) {
		activeGames[gameId].status = 'waiting';
	} else {
		//if we have the player cap, and everyone's validated their decklists, we're ready
		_.each(activeGames[gameId].players, function(player, playerSocketId) {
			if (player.deck && player.deck.length === 30) {
				numReadyPlayers++;
			}
		});

		if (numReadyPlayers === numPlayers) {
			
			//initialize first five phase
			if (activeGames[gameId].gameRound === -1) {
				activeGames[gameId].gameRound = 0;
				activeGames[gameId].status = 'firstFive';
			} else {
				//start the regular rounds
				activeGames[gameId].gameRound = 1;
				activeGames[gameId].status = 'inPlay';
			}

		} else {
			//players are choosing their decks
			activeGames[gameId].status = 'setup';
		}
	}

	console.log('check game status is ending with a status of: ' + activeGames[gameId].status);
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
		checkGameStatus(gameId);

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

	// -----------------------------------------------------------[ CLIENT TAKES AN ACTION WE NEED TO PROPOGATE ]
	socket.on('userAction', function(gameId, action) {

//action:
// 	playerSocketId: store.socketId,
// 	actionVerb: 'shuffle',
// 	target: this.type,
// 	targetOwnerSocketId: this.$parent.playerId

		var playerUsername = getPlayerUsername(gameId, action.playerSocketId);
		var targetOwnerUsername = getPlayerUsername(gameId, action.targetOwnerSocketId);
		var actionDescription = 'did something.';

		//change the wording based on the target
		if (action.playerSocketId === action.targetOwnerSocketId) {
			targetOwnerUsername = 'their ';
		} else {
			targetOwnerUsername += '\'s ';
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
				actionDescription = playerUsername + ' peeked at ' + targetOwnerUsername + action.target + '.';
				break;

			//target should be a card (WHICH IS WHAT?)
			case 'move': 
				//TODO
				actionDescription = playerUsername + ' moved CARDNAME from OWNERS LOCATION to OWNERS LOCATION';
				break;

			//target should be a die index (0-9)
			case 'roll':
				activeGames[gameId].players[action.targetOwnerSocketId].dice[action.target].face = getDieRoll();
				actionDescription = playerUsername + ' rolled one of ' + targetOwnerUsername + ' dice.';
				break;
		}

		//tell everyone what happened
		chatToGame(gameId, 'server', actionDescription);

		//send the updated gamestate
		sendGameState(gameId);

		//if it was a roll, we have to send this after the game state update, 
		//so the animation won't be ended instantly for everyone
		if (action.actionVerb === 'roll') {
			server.to(gameId).emit('dieRoll', action.targetOwnerSocketId, action.target);
		}

	});

});