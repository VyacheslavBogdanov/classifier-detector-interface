<template>

	<div
		:class="['upload', { 'upload--active': fileUrls.length, 'upload--disabled': isDisabled }]"
		@dragover.prevent
		@drop.prevent
	>

		<input
			class="upload__input"
			type="file"
			multiple
			accept="image/*"
			multiple
			@change="onFilesChange"
			:disabled="isDisabled"
		/>
		<span class="upload__text">

			{{ setUploadText() }}

		</span>
	</div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

const props = defineProps<{
	status: string;
	maxFiles: number;
}>();

const emit = defineEmits<{

	(event: 'filesSelected', files: { base64: string; url: string }[]): void;

}>();


const isDisabled = computed(() => props.status === 'inactive');

const fileName = ref<string | null>(null);
const fileUrls = ref<string[]>([]);



const onFilesChange = (event: Event) => {
	const input = event.target as HTMLInputElement;

	if (input.files) {

		const files = Array.from(input.files).slice(0, props.maxFiles); 
		fileNames.value = files.map((file) => file.name); 

		
		const fileDataPromises = files.map((file) => {
			return new Promise<{ base64: string; url: string }>((resolve) => {
				const reader = new FileReader();
				reader.onload = () => {
					if (reader.result) {
						resolve({
							base64: reader.result.toString(),
							url: URL.createObjectURL(file),
						});
					}
				};
				reader.readAsDataURL(file);
			});
		});

		
		Promise.all(fileDataPromises).then((fileData) => {
			emit('filesSelected', fileData);
		});

	}
};

const setUploadText = () => {
	if (fileUrls.value.length === 1) {
		return fileName;
	} else if (fileUrls.value.length > 1) {
		return `Выбрано ${fileUrls.value.length} файл(а/ов)`;
	} else {
		return 'Загрузить изображения...';
	}
};
</script>

<!-- <template>
	<div
		:class="['upload', { 'upload--active': fileUrls.length, 'upload--disabled': isDisabled }]"
		@dragover.prevent
		@drop.prevent
	>
		<input
			class="upload__input"
			type="file"
			multiple
			accept="image/*"
			@change="onFileChange"
			:disabled="isDisabled"
		/>
		<span class="upload__text">
			{{ setUploadText() }}
		</span>
	</div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

const props = defineProps<{
	status: string;
}>();

const emit = defineEmits<{
	(event: 'filesSelected', base64Array: string[]): void;
	(event: 'filesUrls', urlsArray: string[]): void;
}>();

const isDisabled = computed(() => props.status === 'inactive');
const fileName = ref<string | null>(null);
const fileUrls = ref<string[]>([]);

const onFileChange = (event: Event) => {
	const input = event.target as HTMLInputElement;

	if (input.files) {
		fileName.value = input.files[0].name;
		const urlsArray: string[] = [];
		const base64Array: string[] = [];
		const promises: Promise<void>[] = [];

		for (let i = 0; i < input.files.length; i++) {
			const file = input.files[i];
			const fileUrl = URL.createObjectURL(file);
			urlsArray.push(fileUrl);

			const promise = new Promise<void>((resolve) => {
				const reader = new FileReader();
				reader.onload = (e: any) => {
					if (e.target?.result) {
						base64Array.push(e.target.result.toString());
					}
					resolve();
				};
				reader.readAsDataURL(file);
			});

			promises.push(promise);
		}

		fileUrls.value = urlsArray;

		Promise.all(promises).then(() => {
			emit('filesSelected', base64Array);
			emit('filesUrls', urlsArray);
		});
	}
};

const setUploadText = () => {
	if (fileUrls.value.length === 1) {
		return fileName;
	} else if (fileUrls.value.length > 1) {
		return `Выбрано ${fileUrls.value.length} файл(а/ов)`;
	} else {
		return 'Загрузить изображения...';
	}
};
</script> -->

<style scoped lang="scss">
@import '../../../styles/main.scss';

.upload {
	width: 200px;
	height: 32px;
	display: flex;
	justify-content: center;
	align-items: center;
	padding: 10px;
	border: $border-width dashed #513d3d;
	border-radius: $border-radius;
	background-color: $color-bg;
	text-align: center;
	transition:
		border-color 0.3s ease,
		background-color 0.3s ease;
	position: relative;
	cursor: pointer;
	margin: 20px 10px 20px 0;

	&:hover {
		border-color: $border-color;
	}

	&--active {
		border-color: $border-color;
	}

	&--disabled {
		background-color: #f5f5f5;
		border-color: #ddd;

		&:hover {
			border-color: #ddd;
		}

		.upload__text {
			color: #aaa;
		}
	}

	&__input {
		opacity: 0;
		position: absolute;
		width: 100%;
		height: 100%;
		cursor: pointer;
	}

	&__text {
		font-size: 14px;
		font-weight: 500;
		color: #888;
		pointer-events: none;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 90%;
	}
}
</style>
