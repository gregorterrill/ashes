<style lang="sass">
.card {
	display:inline-block;
	vertical-align:top;
	width:100px;
	height:136px;
	position:relative;
	background-image:url('../img/back-standard.jpg');
	background-size:100px 136px;
}
</style>

<template>
	<div @click.stop="openContext" class="card" :style="{ backgroundImage: 'url(' + imageUri + ')' }" @mouseover="previewCard" ></div>
</template>

<script>
export default {
	props: ['card-name', 'card-type'],
	data: function() {
		return {
			contextActions: [ {
					text: "Activate",
					actions: this.activateCard
				}, {
				text: "Move to...",
				subActions: [ {
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
			return 'img/cards/' + encodeURIComponent(this.cardName) + '.jpg';
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

		moveToStack: function(stack) {
			
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