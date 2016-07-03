<style lang="sass">
.stack {
	display:inline-block;
	vertical-align:top;
	width:100px;
	height:136px;
	position:relative;
	background-image:url('../img/back-standard.jpg');
	background-size:100px 136px;
}

.stack--conjurations {
	background-image:url('../img/back-conjuration.jpg');
}

.stack--empty {
	background-image:none;
}

</style>

<template>
	<div @click.stop="openContext" class="stack stack--{{ this.type }}{{ !this.cards.length ? ' stack--empty' : ''}}">
		<div class="stack__counter">{{ this.cards.length ? this.cards.length : '0' }}</div>
	</div>
</template>

<script>

export default {
	props: ['type'],
	data: function() {
		return {
			cards: [ 
				'Summwwrefd',
				'dfdgfdgfd'
			],
			contextActions: [ {
				text: "Shuffle",
				action: this.shuffle
			}, {
				text: "Peek",
				action: this.peekAtCards
			} ]
		}
	},
	methods: {

		openContext: function(e) {
			this.$dispatch('openContext', this.contextActions, e );
		},
		
		// randomizes the deck using the Fisher-Yates Shuffle (http://bost.ocks.org/mike/shuffle/)
		shuffle: function() {

			this.$dispatch('playSound', 'shuffle');
	
			var unshuffledCards = this.cards.length,
					lastUnshuffledCard,
					randomPick;

			while (unshuffledCards) {
				//choose a random card from the unshuffled part of the deck which, when removed, will decrease number of unshuffled cards by one
				randomPick = Math.floor(Math.random() * unshuffledCards--);
				//set aside the last unshuffled card
				lastUnshuffledCard = this.cards[unshuffledCards];
				//put the random card at the end of the unshuffled cards (from the next iteration on, this card will never be shuffled again)
				this.cards[unshuffledCards] = this.cards[randomPick];
				//put the set aside card where the random card was (a future iteration will eventually shuffle this card again)
				this.cards[randomPick] = lastUnshuffledCard;
			}
		},

		peekAtCards: function() {
			this.$root.socket.emit('chat', 'DEBUG', this.cards);
		}
	}
}
</script>