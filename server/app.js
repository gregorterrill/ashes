var express = require('express');
var app = express();
var http = require('http').Server(app);
var server = require('socket.io')(http);
var _ = require('underscore');

var lists = require('./data/decks.json');
var cards = require('./data/cards.json');

app.use(express.static('../client/public'));

app.get('/', function(req, res){
	res.sendFile('../client/public/index.html');
});

http.listen(3000, function(){
	console.log('listening on *:3000');
});

// -----------------------------------------------------------[ GAME OBJECT ]
function Game() {
	this.roomName = 'Empty Room';
	this.roomId = '';
  this.status = 'waiting';
  this.gameRound = -1;
  this.isPrivate = false;
	this.allowSpectators = true;
  this.maxPlayers = 2;
  this.players = {}
}

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

	_.each(activeGames, function(game, roomId) {
		gameList[roomId] = _.pick(game, ['roomName', 'roomId', 'status', 'isPrivate', 'allowSpectators', 'maxPlayers']);
	});
	return gameList;
}

// -----------------------------------------------------------[ GET GAME NAME ]
function getGameName(roomId) {
	var players = _.pluck(activeGames[roomId].players, 'username');
	return players.join(' vs. ');
}

// -----------------------------------------------------------[ GET GAME STATE ]
function getGameState(roomId) {
	return activeGames[roomId];
}

// -----------------------------------------------------------[ GET A PLAYER'S USERNAME ]
function getPlayerUsername(roomId, playerSocketId) {
	return activeGames[roomId].players[playerSocketId].username;
}

// -----------------------------------------------------------[ REMOVE PLAYER FROM GAMES ]
// Removes a player from any games they are in
// Deletes the game if their departure makes it empty
function removePlayerFromGames(playerSocketId) {

	//look through each game
	_.each(activeGames, function(game, roomId) {
		//if they were in this game
		if (game.players[playerSocketId]) {
			//tell everyone they left :(
			server.to(roomId).emit('chat', 'SERVER', game.players[playerSocketId].username + ' disconnected.', 'server-msg');
			//remove them
			delete(activeGames[roomId].players[playerSocketId]);
			//if the game is now empty, delete it
			if (_.keys(activeGames[roomId].players).length === 0) {
				delete(activeGames[roomId]);
			}
		}
	});
}

// -----------------------------------------------------------[ VALIDATE DECKLIST ]
// Check the decklist, adding conjurations if needed
// If the deck is invalid, send an error
// If the deck is valid, build the deck and trigger moving
// the game state forward
function validateDecklist(decklist, roomId, playerSocketId) {

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
	buildDeck(decklist, roomId, playerSocketId);

	//if this was the last decklist to be validated, we should start the game!
	checkGameStatus(roomId);

	//add the modified decklist (w/conjurations added)
	validationResults.decklist = JSON.stringify(decklist);
	return validationResults;
}

// -----------------------------------------------------------[ BUILD DECK ]
// Build decklists in shuffleable arrays and set up dice array 
// Push the decks to activeGames
function buildDeck(decklist, roomId, playerSocketId) {

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
	activeGames[roomId].players[playerSocketId].pheonixborn = decklist.pheonixborn;
	activeGames[roomId].players[playerSocketId].deck = deck;
	activeGames[roomId].players[playerSocketId].dice = dice;
	activeGames[roomId].players[playerSocketId].conjurations = conjurations;
	activeGames[roomId].players[playerSocketId].discard = [];
}

// -----------------------------------------------------------[ CHECK GAME STATUS ]
// Compare number of players to max players to see if waiting
// If the status is changing, update the game round
function checkGameStatus(roomId) {

	//don't keep running this check if the game is already in play
	if (activeGames[roomId].status === 'inPlay') {
		return false;
	}

	var numPlayers = _.keys(activeGames[roomId].players).length;
	var numReadyPlayers = 0;

	//if we have fewer than the player cap, we're waiting
	if (activeGames[roomId].maxPlayers > numPlayers) {
		activeGames[roomId].status = 'waiting';
	} else {
		//if we have the player cap, and everyone's validated their decklists, we're ready
		_.each(activeGames[roomId].players, function(player, playerSocketId) {
			if (player.deck && player.deck.length === 30) {
				numReadyPlayers++;
			}
		});

		//console.log('there are ' + numPlayers + ' out of ' + activeGames[roomId].maxPlayers + '. ' + numReadyPlayers + ' of them have valid lists.');

		if (numReadyPlayers === numPlayers) {
			//console.log('all players are ready');
			
			//initialize first five phase
			if (activeGames[roomId].gameRound === -1) {
				activeGames[roomId].gameRound = 0;
				activeGames[roomId].status = 'firstFive';
			} else {
				//start the regular rounds
				activeGames[roomId].gameRound = 1;
				activeGames[roomId].status = 'inPlay';
			}

		} else {
			//players are choosing their decks
			activeGames[roomId].status = 'setup';
		}
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
	socket.on('chat', function(sender, msg){
		server.emit('chat', sender, msg);
	});

	// -----------------------------------------------------------[ CLIENT REQUESTS GAME LIST ]
	socket.on('requestGameList', function(){
		server.emit('gameList', getGameList() );
	});

	// -----------------------------------------------------------[ CLIENT CREATES GAME ]
	socket.on('createGame', function(username){

		var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
		var roomId = '';

		//generate a roomId, don't allow duplicates
		do {
			roomId = _.sample(possible, 12).join('');
		} while (activeGames[roomId]);

		//add the user to the room
		socket.join(roomId);

		//create a new game and configure it
		var newGame = new Game();
		newGame.roomId = roomId;
		newGame.roomName = username;
		newGame.players[socket.id] = {
			username: username,
			position: 1
		};
		activeGames[roomId] = newGame;

		//send the updated game list to everyone
		server.emit('gameList', getGameList() );

		//send the game state to this game
		server.to(roomId).emit('gameStateUpdated', roomId, getGameState(roomId));
	});

	// -----------------------------------------------------------[ CLIENT JOINS GAME ]
	socket.on('joinGame', function(roomId, username){

		//add the user to the room
		socket.join(roomId);

		//add the player to the game
		activeGames[roomId].players[socket.id] = {
			username: username,
			position: _.keys(activeGames[roomId].players).length + 1
		};

		//update the name of the game
		activeGames[roomId].roomName = getGameName(roomId);

		//if we have enough players to begin it's go time
		checkGameStatus(roomId);

		//send the updated game list to everyone
		server.emit('gameList', getGameList() );

		//send the game state to this game
		server.to(roomId).emit('gameStateUpdated', roomId, getGameState(roomId));

		//tell the room that someone has joined
		server.to(roomId).emit('chat', 'SERVER', username + ' connected.', 'server-msg');

	});

	// -----------------------------------------------------------[ CLIENT REQUESTS PREBUILT DECKLISTS ]
	socket.on('requestPrebuiltLists', function(roomId){
		server.to(roomId).emit('prebuiltDecklists', lists);
	});

	// -----------------------------------------------------------[ CLIENT SUBMITS DECKLIST ]
	socket.on('submitDecklistForValidation', function(roomId, decklist){
		var validationResults = validateDecklist(decklist, roomId, socket.id);
		server.to(roomId).emit('decklistValidated', socket.id, validationResults.decklist, validationResults.valid, validationResults.error);
		server.to(roomId).emit('gameStateUpdated', roomId, getGameState(roomId));
	});

	// -----------------------------------------------------------[ CLIENT REQUESTS GAME STATE ]
	socket.on('requestGameState', function(roomId) {
		server.to(roomId).emit('gameStateUpdated', roomId, getGameState(roomId));
	});

	// -----------------------------------------------------------[ CLIENT TAKES AN ACTION WE NEED TO PROPOGATE ]
	socket.on('userAction', function(roomId, playerSocketId, actionVerb, actionTarget, targetOwnerSocketId) {

		var playerUsername = getPlayerUsername(roomId, playerSocketId);
		var targetOwnerUsername = getPlayerUsername(roomId, targetOwnerSocketId);

		if (playerUsername === targetOwnerUsername) {
			targetOwnerUsername = 'their';
		}

		//TODO: the thing hasn't actually happened on the server yet

		//tell everyone what happened
		server.to(roomId).emit('chat', 'SERVER', playerUsername + ' ' + actionVerb + ' ' + targetOwnerUsername + '\'s ' + actionTarget + '.');
		//send the updated gamestate
		server.to(roomId).emit('gameStateUpdated', roomId, getGameState(roomId));
	});

});