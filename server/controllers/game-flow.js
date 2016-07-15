/**
 * GAME FLOW
 * 1.Prepare Phase
 * - Increment the game round
 * - Roll dice in exhausted pool and refresh them
 * - Discard any cards from hand
 * - Draw back to 5, doing damage if necessary
 * 2.Player Turns Phase
 * - Alternate taking turns until both players pass in a row
 * 3.Recovery Phase
 * - Units remove wounds equal to recover value
 * - Remove 1 exhaustion from each card
 * - Exhaust any active dice desired
 * - Pass first player token to next player
 */

var _ = require('underscore');
var utils = require('../helpers/utils.js');
var setup = require('./game-setup.js');

function advancePhase(game) {

}

function preparePhaseAutoActions(game) {

	//increase the round counter
	game.gameRound++;

	var lastPlayersBasics = false;

	//for each player...
	_.each(game.players, function(playerData, playerSocketId) {

		var numBasics = 0;

		//and each of their dice...
		_.each(game.players[playerSocketId].dice, function(dieData, index) {

			//if it's exhausted, refresh it and re-roll it
			if (dieData.exhausted) {
				var newFace = utils.getDieRoll();
				game.players[playerSocketId].dice[index].face = newFace;
				game.players[playerSocketId].dice[index].exhausted = false;

				if (newFace === 'basic') {
					numBasics++;
				}
			}

		});

		//if this is the first round, we need to determine first player based on number of rolled basics
		if (game.gameRound === 1) {

			//if there is a tie, both players need to re-roll
			if (numBasics === lastPlayersBasics) {
				//TODO: re-roll without being recursive, probably need to break first player determination into own function
			}

			//if this is the first player we've looked at, or they have more basics than the previous, they're the new start player
			if (!lastPlayersBasics || numBasics > lastPlayersBasics) {
				game = utils.setFirstPlayer(game, playerSocketId);
			}
			lastPlayersBasics = numBasics;
		}

	});

	return game;
}

// Roll and refresh all dice and determine start player
function recoveryPhaseAutoActions(game) {
	//TODO: go through each unit and check for a recover value, if they have damage, remove that many tokens
	//TODO: remove one exhaustion token from each card
	
	//STEP 4: pass the first player to next in position
	//get the current first player's position
	var firstPlayerPosition = game.players[getFirstPlayer(game)].position;

	//try to get the next position's socketId
	var newFirstPlayerSocketId = _.findKey(game.players, { 'position': (firstPlayerPosition + 1) });

	//if there wasn't one, that player was the last, so cycle back to the first position
	if (!newFirstPlayerSocketId) {
		newFirstPlayerSocketId = _.findKey(game.players, { 'position': 1 });
	}

	//set our new first player
	game = utils.setFirstPlayer(game, newFirstPlayerSocketId);

	return game;
}

// -----------------------------------------------------------[ SEND ACTIONS ]
// update the actions menu for a player (or all players)
// playerSocketId is optional, if not sent it will go to all players in the game
function updatePlayerActions(game, action, playerSocketId) {
	switch (action) {

		case 'requestFirstFive':
			_.each(game.players, function(playerData, playerSocketId) {
				game.players[playerSocketId].actions = {
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
			game.players[playerSocketId].actions = {
				status: 'chooseFirstFive',
				message: 'Your First Five were invalid. Please re-submit.',
				buttons: [{
					text: 'Submit First Five',
					action: 'submitFirstFive'
				}]
			};
			break;

		case 'firstFiveValid':

			game.players[playerSocketId].actions = {
				status: 'waitingFirstFive',
				message: 'Your First Five were submitted. Waiting for your opponent(s).',
				buttons: []
			};
			//check if we need to start play
			game = setup.advanceGameStatusWhenReady(game);
			break;

		case 'preparePhase':

			//increase the round counter, re-roll and refresh all dice, determine first player if first round
			game = preparePhaseAutoActions(game);

			//send actions
			_.each(game.players, function(playerData, playerSocketId) {
				game.players[playerSocketId].actions = {
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
			_.each(game.players, function(playerData, playerSocketId) {
				game.players[playerSocketId].actions = {
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
			game = recoveryPhaseAutoActions(game);

			_.each(game.players, function(playerData, playerSocketId) {
				game.players[playerSocketId].actions = {
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

	return {
		game: game,
		actionDescription: actionDescription
	}
}


// -----------------------------------------------------------[ EXPORTS ]
module.exports.updatePlayerActions = updatePlayerActions;
module.exports.handleUserAction = handleUserAction;
module.exports.preparePhaseAutoActions = preparePhaseAutoActions;
module.exports.recoveryPhaseAutoActions = recoveryPhaseAutoActions;