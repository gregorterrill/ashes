<style lang="sass">
.board {
	background:url(img/bg-pattern.png);
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
	width:23.5rem;
}

.board__row {
	margin-bottom:0.25rem;
}

.board__zones {
	flex:1;
	display: flex;
  flex-direction: column;
  justify-content:space-around;
}

.board__first {
	display:inline-block;
	vertical-align:top;
	width: 100px;
	height:140px;

	img {
		max-width:100%;
		margin-top: 25px;
	}
}

.board--opponent {
	border-bottom:1px dashed #CCC;
}

.board--you {
	.board__zones {
		flex-direction: column-reverse;
	}
}

.card-preview {
	position:fixed;
	z-index:90;
	top:4px;
	right:0;
	width:299px;
	height:418px;
	background-size:299px 418px;
	border-radius:10px;
	box-shadow: -2px 2px 6px black;
}
</style>

<template>
	<div class="board board--{{ playerType }}" id="board-{{ playerId }}">

		<span class="board__title">{{ player.username }} ({{ playerType | capitalize}})</span>
		
		<deck-loader v-if="(gameRound < 0)" :player-type="playerType" :player-id="playerId"></deck-loader>
		
		<div v-if="(gameRound >= 0)" class="board__player">
			<div class="board__row">
				<stack type="discard" face="up" :cards="player.discard"></stack>
				<stack type="deck" face="down" :cards="player.deck"></stack>
				<div class="board__first" v-if="player.isFirstPlayer">
					<img src="/img/token-first.png" title="First Player" />
				</div>
			</div>
			<div class="board__row">
				<stack type="conjurations" face="down" :cards="player.conjurations"></stack>
				<card :card-data="player.pheonixborn"></card>
				<stack type="hand" face="down" :cards="player.hand"></stack>
			</div>
			<div class="board__row">						
				<div class="dice-pool">
					<die v-for="(index, die) in player.dice" :index="index" :type="die.type" :face="die.face" :exhausted="die.exhausted"></die>
				</div>
			</div>
		</div>
		<div v-if="(gameRound >= 0)" class="board__zones">
			<div class="zone zone--spellboard">
				<span class="zone__title">Spellboard
					<span class="zone__limit">({{ player.spellboard.slots.length }}/{{ player.spellboard.limit }})</span>
				</span>
				<div v-for="slot in player.spellboard.limit" class="zone__slot">
					<card v-if="player.spellboard.slots[slot]" :card-data="player.spellboard.slots[slot]"></card>
				</div>
			</div>
			<div class="zone zone--battlefield">
				<span class="zone__title">Battlefield
					<span class="zone__limit">({{ player.battlefield.slots.length }}/{{ player.battlefield.limit }})</span>
				</span>
				<div v-for="slot in player.battlefield.limit" class="zone__slot">
					<card v-if="player.battlefield.slots[slot]" :card-data="player.battlefield.slots[slot]"></card>
				</div>
			</div>
		</div>
		<context-menu v-ref:context></context-menu>
		<card-browser v-ref:browser></card-browser>
		<div v-show="cardPreviewActive" class="card-preview" v-bind:style="{ backgroundImage: 'url(' + cardPreviewUri + ')' }"></div>
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
	data: function() {
		return {
			cardBrowserActive: false,
			cardPreviewActive: false,
			cardPreviewUri: ''
		}
	},
	events: {
		openContext: function(contextActions, event) {
			this.$refs.context.openMenu(contextActions, event);
		},
		openBrowser: function(playerSocketId, stackName) {
			this.$refs.browser.openBrowser(playerSocketId, stackName);
			this.cardBrowserActive = true;
			this.cardPreviewActive = false;
		},
		turnPreviewOn: function(imageUri, event) {
			if (!this.cardBrowserActive) {
				this.cardPreviewActive = true;
				this.cardPreviewUri = imageUri;
			}
		},
		turnPreviewOff: function(event) {
			this.cardPreviewActive = false;
		}
	},
	computed: {
		gameRound: function() {
			return store.state.gameRound;
		},
		player: function() {
			return store.state.players[this.playerId];
		},
		cardPreview: function() {

		}
	}
}
</script>