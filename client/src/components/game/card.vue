<style lang="sass">
.card {
	display:inline-block;
	vertical-align:top;
	width:100px;
	height:140px;
	position:relative;
	background-image:url('../img/back-standard.jpg');
	background-size:100px 140px;
	border-radius:6px;
}
</style>

<template>
	<div @click.stop="clickCard" class="card" :style="{ backgroundImage: 'url(' + imageUri + ')' }" @mouseover="previewCard" ></div>
</template>

<script>
import store from '../../store.js';

export default {
	props: ['card-data'],
	data: function() {
		return {
			contextActions: [ {
					text: "Activate",
					actions: this.activateCard
				}, {
				text: "Move to...",
				subActions: [ {
					text: "Hand",
					actions: this.moveToStack('hand')
				}, {
					text: "Deck",
					actions: this.moveToStack('deck')
				}, {
					text: "Discard",
					actions: this.moveToStack('discard')
				}, {
					text: "Spellboard",
					actions: this.moveToSpellboard
				}, {
					text: "Battlefield",
					actions: this.moveToBattlefield
				} ]
			} ]
		}
	},
	computed: {
		imageUri : function() {
			return 'img/cards/' + encodeURIComponent(this.cardData.name) + '.jpg';
		}
	},
	methods: {
		previewCard: function(e) {
			this.$dispatch('previewCard', this.imageUri, e );
			// TODO: nothing is catching this yet
		},

		clickCard: function(e) {

			//if we're asking for targets, toggle the targetting of this card
			if (store.currentInput.targetType === 'card' && store.currentInput.targets.length < store.currentInput.quantity) {

				store.currentInput.targets.push(this);

				//if this is the last one
				if (store.currentInput.targets.length === store.currentInput.quantity) {
					store.socket.emit('playerInput', store.currentInput.targets );
				}

			} else {
				this.openContext(e);
			}

		},

		openContext: function(e) {

			this.$dispatch('openContext', this.contextActions, e );
		},

		moveToStack: function(stack) {
			
			/* TODO
			store.socket.emit('userAction', store.state.gameId, {
				playerSocketId: store.socketId,
				actionVerb: 'move',
				object: this,
				objectOwnerSocketId: this.$parent.playerId,
				target: stack,
				targetOwnerSocketId: this.$parent.playerId
			});*/

		},

		moveToSpellboard: function() {

		},

		moveToBattlefield: function() {

		},

		activateCard: function() {
			
		}
	}
}
</script>