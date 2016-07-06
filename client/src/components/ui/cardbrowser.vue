<style lang="sass">
.card-browser {
	position:absolute;
	width: 100vw;
	top:50%;
	margin-top:-226px;
  left: 0;
  overflow-x: scroll;
  z-index: 99;
}

.card-browser__list {
	margin:0;
	padding:0;
	list-style-type:none;
	width:9960px; //332*30
  display: block;
  height: 452px;
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
	z-index:98;
}

.card-browser .card {
	width:332px;
	height:452px;
	background-size:332px 452px;
}

</style>

<template>
	<div class="card-browser__overlay" v-show="viewBrowser" @click="closeBrowser"></div>
	<div class="card-browser" v-show="viewBrowser">
		<ul class="card-browser__list" :style="{ width: listWidth + 'px' }">
			<li v-for="cardName in cards" track-by="$index" class="card-browser__item">
				<card :card-name="cardName"></card>
			</li>
		</ul>
	</div>
</template>

<script>
import card from '../game/card.vue';

export default {
	components: {
		card
	},
	data: function() {
		return {
			viewBrowser: false,
			cards: []
		}
	},
	computed: {
		listWidth: function() {
			return this.cards.length * 332;
		}
	},
	methods: {
		openBrowser: function(cards) {
			this.cards = cards;
			this.viewBrowser = true;
		},
		closeBrowser: function() {
			this.viewBrowser = false;
		}
	}
}
</script>