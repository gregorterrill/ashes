var _ = require('underscore');
var utils = require('../helpers/utils.js');
var setup = require('./game-setup.js');
var flow = require('./game-flow.js');

// -----------------------------------------------------------[ SEND ACTIONS ]
// update the actions menu for a player (or all players)
// playerSocketId is optional, if not sent it will go to all players in the game
function updatePlayerActions(game, action, playerSocketId) {
	
	switch (action) {

		case 'requestFirstFive':
			_.each(game.players, function(playerData, playerSocketId) {
				game.players[playerSocketId].actions = {
					message: 'Choose your First Five by moving 5 cards from your deck into your hand.',
					buttons: [{
						text: 'Submit First Five',
						action: 'submitFirstFive'
					}]
				};
			});
			break;

		case 'firstFiveInvalid':
			game.players[playerSocketId].actions.message = 'Your First Five were invalid. Please re-submit.';
			break;

		case 'firstFiveValid':
			game.players[playerSocketId].actions = {
				message: 'Your First Five were submitted. Waiting for your opponent(s).',
				buttons: []
			};
			//check if we need to start play
			game = setup.advanceGameStatusWhenReady(game);
			break;

		case 'preparePhase':
			//send actions
			_.each(game.players, function(playerData, playerSocketId) {
				game.players[playerSocketId].actions = {
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
			_.each(game.players, function(playerData, playerSocketId) {
				game.players[playerSocketId].actions = {
					message: 'PLAYER TURNS PHASE: Take your actions. The round will end when both players pass in a row.',
					buttons: [{
						text: 'Use dice power',
						action: 'dicePower'
					}, {
						text: 'Pass',
						action: 'pass'
					}, {
						text: 'End',
						action: 'endPlayerTurns'
					}]
				};
			});
			break;

		case 'recoveryPhase':
			_.each(game.players, function(playerData, playerSocketId) {
				game.players[playerSocketId].actions = {
					message: 'RECOVERY PHASE: Exhaust any dice you wish to re-roll next round.',
					buttons: [{
						text: 'End recovery phase',
						action: 'endRecovery'
					}]
				};
			});
			break;

		case 'useDicePower':
			game.players[playerSocketId].actions = {
				message: 'Choose a die to use.',
				buttons: [{
					text: 'Cancel',
					action: 'cancelDicePower'
				}]
			};
			break;

		default:
			game.players[playerSocketId].actions = {
				message: 'An error has occured.',
				buttons: []
			};
	}

	return game;
}

// -----------------------------------------------------------[ HANDLE USER ACTIONS ]
function handleUserAction(game, action) {
	var playerUsername = game.players[action.playerSocketId].username;
	var actionDescription = 'did something.';

	//if there's a target owner, change the wording based on the relationship between acting player and target owner
	if (action.targetOwnerSocketId) {
		var targetOwnerUsername = game.players[action.targetOwnerSocketId].username;
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
			var stack = game.players[action.targetOwnerSocketId][action.target];
			game.players[action.targetOwnerSocketId][action.target] = utils.shuffle(stack);
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
			game = utils.moveCardTo(game, action.object, action.targetType, action.target, action.targetOwnerSocketId);
			actionDescription = playerUsername + ' moved a card from ' + origin + ' to ' + action.target + '.';
			break;

		//object should be a token type, target should be a card
		case 'addToken': 
			//TODO: replace the 1 with quantity from context menu
			game = utils.addTokenToCard(game, action.object, 1, action.target, action.targetOwnerSocketId);
			actionDescription = playerUsername + ' added a ' + action.object + ' token to ' + action.target.name + '.';
			break;

		//object should be a token type, target should be a card
		case 'removeToken': 
			//TODO: replace the 1 with quantity from context menu
			game = utils.removeTokenFromCard(game, action.object, 1, action.target, action.targetOwnerSocketId);
			actionDescription = playerUsername + ' removed a ' + action.object + ' token from ' + action.target.name + '.';
			break;

		//target should be a die index (0-9)
		case 'roll':
			game.players[action.targetOwnerSocketId].dice[action.target].face = utils.getDieRoll();
			actionDescription = playerUsername + ' rolled one of ' + targetOwnerUsername + ' dice.';
			break;

		//target should be a die index (0-9)
		case 'refresh':
			game.players[action.targetOwnerSocketId].dice[action.target].exhausted = false;
			actionDescription = playerUsername + ' refreshed one of ' + targetOwnerUsername + ' dice.';
			break;

		//target should be a die index (0-9)
		case 'exhaust':
			game.players[action.targetOwnerSocketId].dice[action.target].exhausted = true;
			actionDescription = playerUsername + ' exhausted one of ' + targetOwnerUsername + ' dice.';
			break;

		//there is no target
		case 'submitFirstFive':
			var validationResults = setup.validateFirstFive(game, action.playerSocketId);
			game = validationResults.game;
			if (validationResults.valid) {
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
			actionDescription = playerUsername + ' is finished the Prepare phase.';
			/*
			game.players[action.playerSocketId].status = 'finishedPrepare';
			//check if everyone is done prepare
			var allPlayersReady = true;
			_.each(game.players, function(playerData, playerSocketId) {
				if (game.players[playerSocketId].status !== 'finishedPrepare') {
					allPlayersReady = false;
				}
			});

			//if so, move on to active turns
			if (allPlayersReady) {
				game = flow.advancePhase(game);
			}*/
			game = flow.advancePhase(game);
			break;

		//TODO
		case 'endPlayerTurns':
			actionDescription = playerUsername + ' ended the Player Turns phase.';
			game = flow.advancePhase(game);
			break;

		//TODO
		case 'endRecovery':
			actionDescription = playerUsername + ' ended the Recovery phase.';
			game = flow.advancePhase(game);
			break;

		//TODO
		case 'dicePower':
			actionDescription = playerUsername + ' tried to use a dice power.';
			game = updatePlayerActions(game, 'useDicePower', action.playerSocketId);

			break;

		case 'cancelDicePower':
			game = updatePlayerActions(game, 'playerTurnsPhase', action.playerSocketId);
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

	return {
		game: game,
		actionDescription: actionDescription
	}
}


// -----------------------------------------------------------[ EXPORTS ]
module.exports.updatePlayerActions = updatePlayerActions;
module.exports.handleUserAction = handleUserAction;