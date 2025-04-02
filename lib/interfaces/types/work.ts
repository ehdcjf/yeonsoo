import type { ZombieInfo } from "./zombie";

export const TASK_TYPE = {
	SUBSCRIBE: "SUBSCRIBE",
	WATCH: "WATCH",
	SHARELINK0: "SHARELINK0",
	SHARELINK1: "SHARELINK1",
	SHARELINK2: "SHARELINK2",
	SHARELINK3: "SHARELINK3",
	SHARELINK4: "SHARELINK4",
	SHARELINK5: "SHARELINK5",
	SHARELINK6: "SHARELINK6",
} as const;

export type SubscribeTaskData = {
	taskType: typeof TASK_TYPE.SUBSCRIBE;
	channelId: number;
	channelHandle: string;
	subLink: string;
};

export type WatchTaskData = {
	taskType: typeof TASK_TYPE.WATCH;
	citubeId: number;
	youtubeId: string;
	videoType: "long" | "short";
	link: string;
	category?: string;
};

export type SharedLinkTaskData = {
	taskType:
		| typeof TASK_TYPE.SHARELINK0
		| typeof TASK_TYPE.SHARELINK1
		| typeof TASK_TYPE.SHARELINK2
		| typeof TASK_TYPE.SHARELINK3
		| typeof TASK_TYPE.SHARELINK4
		| typeof TASK_TYPE.SHARELINK5
		| typeof TASK_TYPE.SHARELINK6;
	data: {
		link: string;
		channelId: number;
		citubeId: number;
	};
};

export type Task = SubscribeTaskData | WatchTaskData | SharedLinkTaskData;

export type Work = {
	zombie: ZombieInfo;
	tasks: Task[];
};
