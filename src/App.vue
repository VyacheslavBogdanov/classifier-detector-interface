<template>
	<div id="app">
		<div class="app">
			<CheckHealth :messageTypes="messageTypes" :status="status" />
			<FireDetection :messageTypes="messageTypes" :status="status" />
		</div>
	</div>
</template>

<script setup lang="ts">
import CheckHealth from '@/components/CheckHealth/CheckHealth.vue';
import FireDetection from '@/components/FireDetection/FireDetection.vue';
import { ref, onMounted } from 'vue';
import { fetchData } from './components/mocks/db';
import { useHealthCheck } from './components/utils/useHealthCheck';
import type { MessageType } from './components/utils/types.ts';

const { status } = useHealthCheck();
const messageTypes = ref<MessageType[]>([]);

const loadMessageTypes = async () => {
	try {
		messageTypes.value = await fetchData('/message-types');
	} catch (error) {
		console.error('Ошибка загрузки:', error);
	}
};

onMounted(loadMessageTypes);
</script>

<style lang="scss" scoped>
@import './styles/main.scss';

#app {
	min-width: 1550px;
	height: 930px;
	display: flex;
	flex-direction: column;
	align-items: center;

	.app {
		width: 50%;
		height: 100%;
		display: flex;
		align-items: center;
		flex-direction: column;
		font-family: sans-serif;
		background-color: $color-bg;
		margin: 1%;
		padding: 20px;
		border: $border-width solid $border-color;
		border-radius: $border-radius;
	}
}
</style>
