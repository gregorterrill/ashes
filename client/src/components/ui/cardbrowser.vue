<style lang="sass">
.card-browser {
	position:fixed;
	width: 100vw;
	top:50%;
	margin-top:-209px; //418/2
  left: 0;
  overflow-x: scroll;
  z-index: 98;
  background-color:white;
}

.card-browser__list {
	margin:0;
	padding:0;
	list-style-type:none;
	width:8970px; //299*30
  display: block;
  height: 418px;
  background-color:white;
}

.card-browser__item {
	display:inline-block;
}

.card-browser__overlay {
	cursor:pointer;
	position:fixed;
	top:0;
	right:0;
	bottom:0;
	left:0;
	background-color:transparentize(black,0.2);
	z-index:97;
}

.card-browser .card {
	width:299px;
	height:418px;
	background-size:299px 418px;
	border-radius:10px;
}

</style>

<template>
	<div class="card-browser__overlay" v-show="viewBrowser" @click="closeBrowser"></div>
	<div class="card-browser" v-show="viewBrowser">
		<ul class="card-browser__list" v-bind:style="{ width: listWidth + 'px' }">
			<li v-for="card in cards" class="card-browser__item">
				<card :card-data="card"></card>
			</li>
		</ul>
	</div>
</template>

<script>
import store from '../../store.js';
import card from '../game/card.vue';

export default {
	components: {
		card
	},
	data: function() {
		return {
			viewBrowser: false,
			playerSocketId: '',
			stackName: ''
		}
	},
	computed: {
		listWidth: function() {
			return this.cards.length * 299;
		},
		cards: function() {
			//if we've got stack info, use cards from the stack, otherwise we're empty
			if (this.playerSocketId && this.stackName) {
				return store.state.players[this.playerSocketId][this.stackName];
			} else {
				return [];
			}	
		}
	},
	methods: {
		openBrowser: function(playerSocketId, stackName) {
			this.playerSocketId = playerSocketId;
			this.stackName = stackName;
			this.viewBrowser = true;
		},
		closeBrowser: function() {
			this.viewBrowser = false;
			this.$parent.cardBrowserActive = false;
		}
	}
}
</script>