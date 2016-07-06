<style lang="sass">
.board {
	width:100%;
	height:calc(50vh - 1rem);
	padding:1rem;
	display:flex;
}

.board * {
	user-select:none;
}

.board__player {
	margin:auto;
}

.board__areas {
	display: flex;
  flex-direction: column;
  justify-content:space-around;
}

.board--opponent {
	border-bottom:1px dashed #CCC;
}

.board--you {
	.board__areas {
		flex-direction: column-reverse;
	}
}
</style>

<template>
	<div class="board board--{{ playerType }}" id="board-{{ playerId }}">
		
		<deck-loader v-if="(gameRound < 0)" :player-type="playerType" :player-id="playerId"></deck-loader>
		
		<div v-if="(gameRound >= 0)" class="board__player">
			<div class="board__row">
				<stack type="discard" :cards="player.discard"></stack>
				<stack type="deck" :cards="player.deck"></stack>
			</div>
			<div class="board__row">
				<stack type="conjurations" :cards="player.conjurations"></stack>
				<card :card-name="player.pheonixborn" card-type="pheonixborn"></card>
			</div>
			<div class="board__row">						
				<div class="dice-pool">
					<die v-for="die in player.dice" :type="die.type" :face="die.face" :exhausted="die.exhausted"></die>
				</div>
			</div>
		</div>
		<div v-if="(gameRound >= 0)" class="board__areas">
			<div class="area area--spellboard">
				<span class="area__title">Spellboard (0/4)</span>
				<div class="area__slot"></div>
				<div class="area__slot"></div>
				<div class="area__slot"></div>
				<div class="area__slot"></div>
			</div>
			<div class="area area--battlefield">
				<span class="area__title">Battlefield (0/8)</span>
				<div class="area__slot"></div>
				<div class="area__slot"></div>
				<div class="area__slot"></div>
				<div class="area__slot"></div>
				<div class="area__slot"></div>
				<div class="area__slot"></div>
				<div class="area__slot"></div>
				<div class="area__slot"></div>
			</div>
		</div>
		<context-menu v-ref:context></context-menu>
		<card-browser v-ref:browser></card-browser>
	</div>
</template>

<script>
import die from './die.vue';
import card from './card.vue';
import stack from './stack.vue';
import contextMenu from '../ui/contextmenu.vue';
import cardBrowser from '../ui/cardbrowser.vue';
import deckLoader from '../ui/deckloader.vue';
import store from '../../store.js';

export default {
	props: ['player-type', 'player-id'],
	components: {
		die,
		card,
		stack,
		contextMenu,
		cardBrowser,
		deckLoader
	},
	events: {
		openContext: function(contextActions, event) {
			this.$refs.context.openMenu(contextActions, event);
		},
		openBrowser: function(cards) {
			this.$refs.browser.openBrowser(cards);
		}
	},
	computed: {
		gameRound: function() {
			return store.state.gameRound;
		},
		player: function() {
			return store.state.players[this.playerId];
		}
	}
}
</script>