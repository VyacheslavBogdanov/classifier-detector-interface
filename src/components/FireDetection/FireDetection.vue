<template>
	<div class="middle-elements">
		<FileUpload @fileSelected="updateImage" @fileUrl="updateImageSrc" :status="props.status" />
		<FireDetectionBtn
			v-if="imageSrc"
			@sendRequest="sendRequest"
			@clearPreview="clearPreview"
			:status="props.status"
			:fireRects="fireRects"
		/>
	</div>
	<div v-if="imageSrc" class="preview">
		<!-- <img ref="imageElement" class="preview__img" :src="imageSrc" alt="Изображение" /> -->
		<div
			v-for="(rect, index) in fireRects"
			:key="index"
			class="preview__rect"
			:style="{
				top: rect.top + 'px',
				left: rect.left + 'px',
				width: rect.width + 'px',
				height: rect.height + 'px',
			}"
		>
			<div
				v-if="rect.confidence !== null"
				class="preview__confidence"
				:style="{
					top: '-3px',
					left: '0',
				}"
			>
				{{ rect.confidence }}%
			</div>
		</div>
	</div>
	<div v-if="result?.type" :class="['result', resultClass]">
		<div class="result__icon">ⓘ</div>
		<span>{{ message }}</span>
	</div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { v4 as uuidv4 } from 'uuid';
import FileUpload from './FileUpload/FileUpload.vue';
import FireDetectionBtn from './FireDetectionBtn/FireDetectionBtn.vue';
import type { MessageType } from '../utils/types';

const props = defineProps<{
	messageTypes: MessageType[];
	status: string;
}>();

const imageSrc = ref<string[] | null>(null);
const result = ref<{ type: string } | null>(null);
const fireRects = ref<
	{ top: number; left: number; width: number; height: number; confidence: number | null }[]
>([]);
const imageBase64 = ref<string | null>(null);
const imageElement = ref<HTMLImageElement | null>(null);

const message = computed(() => {
	if (result.value?.type === 'fire') {
		const newArr = props.messageTypes.filter((type) => type.class === 'result--fire');
		return newArr.length > 0 ? newArr[0].message : 'Статус огня не определен';
	} else {
		const newArr = props.messageTypes.filter((type) => type.class === 'result--no-fire');
		return newArr.length > 0 ? newArr[0].message : 'Статус огня не определен';
	}
});

const resultClass = computed(() => {
	if (result.value?.type === 'fire') {
		const newArr = props.messageTypes.filter((type) => type.class === 'result--fire');
		return newArr.length > 0 ? newArr[0].class : 'result--info';
	} else {
		const newArr = props.messageTypes.filter((type) => type.class === 'result--no-fire');
		return newArr.length > 0 ? newArr[0].class : 'result--info';
	}
});

const updateImage = (base64: string) => {
	// console.log('base64', base64);

	imageBase64.value = base64;
};

const updateImageSrc = (url: string[]) => {
	console.log('url', url);
	imageSrc.value = url;
};

const clearPreview = () => {
	fireRects.value = [];
	result.value = null;
};

const sendRequest = async () => {
	if (!imageBase64.value) {
		console.error('Изображение не выбрано');
		return;
	}

	const base64Image = imageBase64.value.replace(/^data:image\/[a-z]+;base64,/, '');

	const requestId = uuidv4();
	const Url = import.meta.env.VITE_SERVER_URL;

	try {
		const response = await fetch(`${Url}/predict`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				thresholds: [
					{
						move_confidence: 0.2,
						move_velocity: 0.3,
						static_confidence: 0.7,
						type: 'person',
					},
					{
						move_confidence: 0.2,
						move_velocity: 0.3,
						static_confidence: 0.7,
						type: 'vehicle',
					},
				],
				sabotage_threshold: 22,
				requestId: requestId,
				image: base64Image,
			}),
		});

		if (!response.ok) {
			throw new Error(`Ошибка: ${response.status} ${response.statusText}`);
		}

		const data = await response.json();
		console.log('Ответ от сервера:', data);

		const fireObjects = data.objects.filter((obj: any) => obj.type === 'fire');

		if (fireObjects.length > 0) {
			result.value = { type: 'fire' };
			const img = imageElement.value;

			if (img) {
				const scaleX = img.clientWidth / img.naturalWidth;
				const scaleY = img.clientHeight / img.naturalHeight;

				fireRects.value = fireObjects.map((fireObject: any) => {
					const [x, y, w, h] = fireObject.rect;
					return {
						left: x * scaleX,
						top: y * scaleY,
						width: w * scaleX,
						height: h * scaleY,
						confidence: Math.round(fireObject.confidence * 100),
					};
				});
			}
		} else {
			result.value = { type: 'no_fire' };
			fireRects.value = [];
		}
	} catch (error) {
		console.error('Ошибка при запросе:', error);
		result.value = { type: 'no_fire' };
		fireRects.value = [];
	}
};

watch(imageSrc, () => {
	clearPreview();
});
</script>

<style lang="scss" scoped>
@import '../../styles/main.scss';

.middle-elements {
	height: 50px;
	display: flex;
	flex-direction: row;
	align-items: center;
	margin: 40px 0 40px 0;

	@media (max-width: 1250px) {
		flex-direction: column;
		height: 110px;
	}
}

.preview {
	max-width: 740px;
	height: 400px;
	display: flex;
	justify-content: center;
	align-items: center;
	position: relative;
	overflow: hidden;
	border: 1px solid #ddd;
	border-radius: $border-radius;

	&__img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	&__rect {
		position: absolute;
		border: 2px solid red;
		box-sizing: border-box;
	}

	&__confidence {
		position: absolute;
		text-align: center;
		font-size: 12px;
		background: rgba(255, 255, 255, 0.8);
		color: red;
		padding: 2px 4px;
		border-radius: 4px;
		transform: translateY(-100%);
	}
}

.result {
	position: relative;
	display: flex;
	align-items: center;
	padding: 10px 30px 10px 40px;
	border-radius: $border-radius;
	max-width: fit-content;
	word-wrap: break-word;
	font-size: 23px;
	height: 40px;
	opacity: 0.85;
	margin: 20px 0;

	@media (max-width: 835px) {
		font-size: 17px;
	}

	&__icon {
		display: flex;
		position: absolute;
		transform: rotate(180deg);
		left: 10px;
		height: 30px;
	}

	&--fire {
		background-color: #e0fde7;
		color: $color-success;
	}

	&--no-fire {
		background-color: #f2dee0;
		color: $color-error;
	}

	&--info {
		background-color: #e3e3ff;
		color: $color-primary;
	}
}
</style>
