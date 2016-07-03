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
			<li v-for="item in contextActions" class="context-menu__item" @click="triggerAndClose(item.action)">{{ item.text }}
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
			largestHeight = window.innerHeight - this.$els.menu.offsetHeight;
			largestWidth = window.innerWidth - this.$els.menu.offsetWidth;

			if (y > largestHeight) y = largestHeight;
			if (x > largestWidth) x = largestWidth;

			this.top = y + 'px';
			this.left = x + 'px';
		},

		openMenu: function(contextActions, e) {
			this.viewMenu = true;
			this.contextActions = contextActions;
			this.positionMenu(e.x, e.y);
		},

		closeMenu: function(e) {
			this.viewMenu = false;
		},

		triggerAndClose: function(action) {
			action();
			this.closeMenu();
		}
	}
}
</script>