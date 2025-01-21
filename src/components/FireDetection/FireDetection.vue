<template>
	<div class="middle-elements">
		<FileUpload @filesSelected="updateImages" :status="props.status" :maxFiles="6" />
		<FireDetectionBtn
			v-if="currentImageSrc"
			@sendRequest="sendRequest"
			@clearPreview="clearPreview"
			:status="props.status"
			:fireRects="fireRects"
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
		<div class="thumbnails__slider">
			<div
				v-for="(image, index) in images"
				:key="index"
				class="thumbnail"
				@click="setPreviewImage(index)"
				:class="{ 'thumbnail--active': index === currentIndex }"
			>
				<img :src="image.url" alt="Миниатюра" />
			</div>
		</div>
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

const images = ref<{ url: string; base64: string }[]>([]);
const currentIndex = ref(0);

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

const updateImages = (files: { base64: string; url: string }[]) => {
	images.value = files;
	currentIndex.value = 0;
	clearPreview();
};

const setPreviewImage = (index: number) => {
	currentIndex.value = index;
	clearPreview();
};

const clearPreview = () => {
	fireRects.value = [];
};

const sendRequest = async () => {
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
			fireRects.value = [];
		}
	} catch (error) {
		console.error('Ошибка при запросе:', error);
		fireRects.value = [];
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
.thumbnails {
	display: flex;
	overflow-x: auto;
}

.thumbnails__slider {
	display: flex;
	gap: 8px;
}

.thumbnail {
	cursor: pointer;
	border: 2px solid transparent;
	width: 80px;
	height: 80px;
}

.thumbnail img {
	width: 100%;
	height: 100%;
	object-fit: cover;
}

.thumbnail--active {
	border-color: #007bff;
}
</style>
