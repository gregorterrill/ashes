<style lang="sass">
.context-menu {
	position:absolute;
	z-index:99;
	background: transparentize(black,0.15);
	border:1px solid white;
	color:white;
}
.context-menu__list,
.context-menu__sublist {
	margin:0;
	padding:0;
	list-style-type:none;
	min-width:7.5rem;
}
.context-menu__item {
	padding:0.25rem 0.5rem;
	cursor:pointer;
	user-select:none;
	position:relative;

	&:hover {
		background-color:black;

		.context-menu__sublist {
			display:block;
		}
	}
}

.context-menu__sublist {
	display:none;
	position:absolute;
	left: 100%;
	top:0;
	background: transparentize(black,0.15);
	border:1px solid white;
}

</style>

<template>
	<div class="context-menu" v-el:menu v-show="viewMenu" v-bind:style="{ top: top, left: left }" v-on-clickaway="closeMenu">
		<ul class="context-menu__list">
			<li v-for="item in contextActions" class="context-menu__item" @click.self="triggerAndClose(item.action)">{{ item.text }}
				<ul v-if="item.subActions" class="context-menu__sublist">
					<li v-for="subItem in item.subActions" class="context-menu__item" @click="triggerAndClose(subItem.action)">{{ subItem.text }}
				</ul>
			</li>
		</ul>
	</div>
</template>

<script>
import { mixin as clickaway } from 'vue-clickaway';

export default {
	mixins: [ clickaway ],
	data: function() {
		return {
			viewMenu: false,
			top: '0px',
			left: '0px',
			contextActions: []
		}
	},
	methods: {

		positionMenu: function(x,y) {

			//first check if the click is in the bottom half of the screen {
			var bottomHalf = (y > (window.innerHeight / 2));

			//modify the y coordinate, because the parent board is positioned relative
			y = y - this.$parent.$el.getBoundingClientRect().top;

			//set the menu to be at the click
			this.top = y + 'px';
			this.left = x + 'px';

			//if the click was on the bottom half of the screen...
			if (bottomHalf) {
				//after the dom updates (and we know the height of the menu), shift it up by its own height
				this.$nextTick(function () {
					this.top = (parseInt(this.top) - this.$els.menu.offsetHeight) + 'px';
				});
			}
		},

		openMenu: function(contextActions, e) {
			this.viewMenu = true;
			this.contextActions = contextActions;
			this.positionMenu(e.clientX, e.clientY);
		},

		closeMenu: function() {
			this.viewMenu = false;
		},

		triggerAndClose: function(action) {
			if (typeof action === 'function') {
				action();
			} else {
				console.log('tried to trigger an action but it wasnt a function');
			}
			this.closeMenu();
		}
	}
}
</script>