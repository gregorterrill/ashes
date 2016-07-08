<style lang="sass">
.board {
	position:relative;
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
	flex:1;
}

.board__row {
	margin-bottom:0.25rem;
}

.board__areas {
	flex:1;
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

		<span class="board__title">{{ player.username }} ({{ playerType | capitalize}})</span>
		
		<deck-loader v-if="(gameRound < 0)" :player-type="playerType" :player-id="playerId"></deck-loader>
		
		<div v-if="(gameRound >= 0)" class="board__player">
			<div class="board__row">
				<stack type="discard" :cards="player.discard"></stack>
				<stack type="deck" :cards="player.deck"></stack>
			</div>
			<div class="board__row">
				<stack type="conjurations" :cards="player.conjurations"></stack>
				<card :card-data="player.pheonixborn"></card>
				<stack type="hand" :cards="player.hand"></stack>
			</div>
			<div class="board__row">						
				<div class="dice-pool">
					<die v-for="(index, die) in player.dice" :index="index" :type="die.type" :face="die.face" :exhausted="die.exhausted"></die>
				</div>
			</div>
		</div>
		<div v-if="(gameRound >= 0)" class="board__areas">
			<div class="area area--spellboard">
				<span class="area__title">Spellboard (0/{{ player.spellboard.limit }})</span>
				<div v-for="slot in player.spellboard.slots" class="area__slot"></div>
			</div>
			<div class="area area--battlefield">
				<span class="area__title">Battlefield (0/{{ player.battlefield.limit }})</span>
				<div v-for="slot in player.battlefield.slots" class="area__slot"></div>
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