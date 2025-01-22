import type { MessageType, MockAPIResponse } from '../utils/types';

const messageTypes: MessageType[] = [
	{ class: 'health--success', message: 'Модуль "Классификатор целей" работает корректно' },
	{ class: 'health--warning', message: 'Модуль "Классификатор целей" отключен' },
	{ class: 'result--fire', message: 'Объекты обнаружены' },
	{ class: 'result--no-fire', message: 'Объекты не обнаружены' },
];

const mockAPI = (endpoint: string): Promise<MockAPIResponse> => {
	return new Promise((resolve, reject) => {
		setTimeout(() => {
			if (endpoint === '/message-types') {
				resolve({ data: messageTypes });
			} else {
				reject({ error: 'Not Found', status: 404 });
			}
		}, 500);
	});
};

export const fetchData = async (endpoint: string): Promise<MessageType[]> => {
	try {
		const response = await mockAPI(endpoint);
		if (response.data) {
			return response.data;
		} else {
			throw new Error(`Ошибка: ${response.error || 'Неизвестная ошибка'}`);
		}
	} catch (error) {
		console.error(`Error fetching data from ${endpoint}:`, error);
		throw error;
	}
};
