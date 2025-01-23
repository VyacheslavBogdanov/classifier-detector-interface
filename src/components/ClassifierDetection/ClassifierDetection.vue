<template>
	<div class="middle-elements">
		<FileUpload @filesSelected="updateImages" :status="props.status" />
		<DetectionBtn
			v-if="currentImageSrc"
			@sendRequest="sendRequest"
			@clearPreview="clearPreview"
			:status="props.status"
			:detection="detection"
		/>
	</div>

	<div v-if="currentImageSrc" class="preview">
		<img ref="imageElement" class="preview__img" :src="currentImageSrc" alt="Изображение" />

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
				v-if="rect.confidence !== null && rect.type"
				class="preview__confidence"
				:style="{ top: '-3px', left: '0' }"
			>
				{{ rect.type }} ({{ rect.confidence }}%)
			</div>
		</div>
	</div>

	<div v-if="images.length > 0" class="thumbnails">
		<div ref="thumbnailsContainer" class="thumbnails__container">
			<div
				v-for="(image, index) in images"
				:key="index"
				class="thumbnails__item"
				@click="setPreviewImage(index)"
				:class="{ 'thumbnails__item--active': index === currentIndex }"
			>
				<img class="thumbnails__image" :src="image.url" alt="Миниатюра" />
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
import DetectionBtn from './DetectionBtn/DetectionBtn.vue';
import type { MessageType } from '../utils/types';

const props = defineProps<{
	messageTypes: MessageType[];
	status: string;
}>();

const images = ref<{ url: string; base64: string }[]>([]);
const currentIndex = ref<number>(0);
const detection = ref<boolean>(false);
const thumbnailsContainer = ref<HTMLElement | null>(null);
const result = ref<{ type: string } | null>(null);

const fireRects = ref<
	{
		top: number;
		left: number;
		width: number;
		height: number;
		confidence: number | null;
		type: string | null;
	}[]
>([]);
const imageElement = ref<HTMLImageElement | null>(null);

const currentImageSrc = computed(() => images.value[currentIndex.value]?.url || null);

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

const centerThumbnail = (index: number) => {
	const container = thumbnailsContainer.value;
	if (container) {
		const thumbnailWidth = 120;
		const gap = 8;
		const visibleWidth = container.offsetWidth;

		const scrollTo = index * (thumbnailWidth + gap) - (visibleWidth - thumbnailWidth) / 2;

		container.scrollTo({
			left: Math.max(0, Math.min(scrollTo, container.scrollWidth - visibleWidth)),
			behavior: 'smooth',
		});
	}
};

const updateImages = (files: { base64: string; url: string }[]) => {
	images.value = files;
	currentIndex.value = 0;
	clearPreview();
};

const setPreviewImage = (index: number) => {
	if (detection.value === true) {
		setTimeout(() => {
			sendRequest();
		}, 0);
	}
	currentIndex.value = index;
	centerThumbnail(index);
};

const clearPreview = () => {
	detection.value = false;
	fireRects.value = [];
	result.value = null;
};

const sendRequest = async () => {
	detection.value = true;
	const currentImage = images.value[currentIndex.value]?.base64;
	if (!currentImage) {
		console.error('Изображение не выбрано');
		return;
	}

	const base64Image = currentImage.replace(/^data:image\/[a-z]+;base64,/, '');

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

		const objectTypes = ['person', 'persons group', 'vehicle', 'velo / moto'];

		const filteredObjects = data.objects.filter((obj: any) => objectTypes.includes(obj.type));

		if (filteredObjects.length > 0) {
			result.value = { type: 'fire' };
			const img = imageElement.value;

			if (img) {
				const scaleX = img.clientWidth / img.naturalWidth;
				const scaleY = img.clientHeight / img.naturalHeight;

				fireRects.value = filteredObjects.map((object: any) => {
					const [x, y, w, h] = object.rect;
					return {
						left: x * scaleX,
						top: y * scaleY,
						width: w * scaleX,
						height: h * scaleY,
						confidence: Math.round(object.confidence * 100),
						type: object.type,
					};
				});
			}
		} else {
			result.value = { type: 'no_fire' };
			fireRects.value = [];
		}
	} catch (error) {
		console.error('Ошибка при запросе:', error);
		fireRects.value = [];
		result.value = { type: 'no_fire' };
	}
};

watch(currentImageSrc, () => {
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
		background: rgba(255, 255, 255, 0.5);
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

.thumbnails {
	display: flex;
	justify-content: center;
	margin-top: 20px;

	&__container {
		display: flex;
		gap: 8px;
		overflow-x: auto;
		scroll-behavior: smooth;
		padding: 10px;
		width: 100%;
		max-width: 740px;
	}

	&__item {
		flex-shrink: 0;
		width: 120px;
		height: 120px;
		cursor: pointer;
		border: 1.5px solid transparent;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	&__item--active {
		border-color: $border-color;
	}

	&__image {
		width: 100%;
		height: 100%;
		object-fit: cover;
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
