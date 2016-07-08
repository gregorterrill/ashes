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
	<div @click.stop="openContext" class="card" :style="{ backgroundImage: 'url(' + imageUri + ')' }" @mouseover="previewCard" ></div>
</template>

<script>
import store from '../../store.js';

export default {
	props: ['card-data'],
	data: function() {
		return {
			contextActions: [ {
					text: "Activate",
					action: this.activateCard
				}, {
				text: "Move to...",
				action: this.doSubAction,
				subActions: [ {
					text: "Hand",
					action: this.moveToHand
				}, {
					text: "Deck",
					action: this.moveToDeck
				}, {
					text: "Discard",
					action: this.moveToDiscard
				}, {
					text: "Spellboard",
					action: this.moveToSpellboard
				}, {
					text: "Battlefield",
					action: this.moveToBattlefield
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

		openContext: function(e) {
			this.$dispatch('openContext', this.contextActions, e );
		},

		doSubAction: function() {
			console.log('should be doing a sub action instead');
		},

		moveToHand: function() {

			store.socket.emit('userAction', store.state.gameId, {
				playerSocketId: store.socketId,
				actionVerb: 'move',
				object: this.cardData,
				target: 'hand',
				targetOwnerSocketId: store.socketId
			});

		},

		moveToDeck: function() {
			store.socket.emit('userAction', store.state.gameId, {
				playerSocketId: store.socketId,
				actionVerb: 'move',
				object: this.cardData,
				target: 'deck',
				targetOwnerSocketId: store.socketId
			});
		},

		moveToDiscard: function() {
			store.socket.emit('userAction', store.state.gameId, {
				playerSocketId: store.socketId,
				actionVerb: 'move',
				object: this.cardData,
				target: 'discard',
				targetOwnerSocketId: store.socketId
			});
		},

		moveToSpellboard: function() {
			console.log('tried to move to spellboard but failed');
		},

		moveToBattlefield: function() {
			console.log('tried to move to battlefield but failed');
		},

		activateCard: function() {
			console.log('tried to activate a card but failed');
		}
	}
}
</script>