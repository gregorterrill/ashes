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

.board--you {
	border-top:1px dashed #CCC;
	.board__areas {
		flex-direction: column-reverse;
	}
}
</style>

<template>
	<div class="board board--{{ player }}">
		
		<deck-loader v-if="(gameRound < 0)" :player="player"></deck-loader>
		
		<div v-if="(gameRound >= 0)" class="board__player">
			<div class="board__row">
				<stack type="discard"></stack>
				<stack type="deck"></stack>
			</div>
			<div class="board__row">
				<stack type="conjurations"></stack>
				<card card-name="Aradel Summergaard" card-type="pheonixborn"></card>
			</div>
			<div class="board__row">						
				<div class="dice-pool">
					<die v-for="die in dice" :type="die.type" :face="die.face" :exhausted="die.exhausted"></die>
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
	</div>
</template>

<script>
import die from './die.vue';
import card from './card.vue';
import stack from './stack.vue';
import contextMenu from '../ui/contextmenu.vue';
import deckLoader from '../ui/deckloader.vue';
import store from '../../store.js';

export default {
	props: ['player'],
	components: {
		die,
		card,
		stack,
		contextMenu,
		deckLoader
	},
	events: {
		'openContext': function(contextActions, event) {
			this.$refs.context.openMenu(contextActions, event);
		}
	},
	computed: {
		gameRound: function() {
			return store.state.gameRound;
		}
	},
	data: function() {
		return {
			dice: [{
				type: 'nat',
				face: 'basic',
				exhausted: false,
			},
			{
				type: 'nat',
				face: 'class',
				exhausted: false,
			},
			{
				type: 'nat',
				face: 'power',
				exhausted: false,
			},
			{
				type: 'nat',
				face: 'basic',
				exhausted: false,
			},
			{
				type: 'ill',
				face: 'power',
				exhausted: false,
			},
			{
				type: 'ill',
				face: 'basic',
				exhausted: false,
			},
			{
				type: 'ill',
				face: 'class',
				exhausted: false,
			},
			{
				type: 'ill',
				face: 'basic',
				exhausted: true,
			},
			{
				type: 'ill',
				face: 'class',
				exhausted: true,
			},
			{
				type: 'ill',
				face: 'class',
				exhausted: true,
			} ]
		}
	}
}
</script>