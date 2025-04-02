import type { Zombie } from "../../../app/macro/zombie/zombie";
import { EVENT, LoginResult } from "../const";
import { type Task, TASK_TYPE } from "./work";
import type { ZombieInfo } from "./zombie";

export type LoginSuccessMessage = {
	event: typeof EVENT.LOGIN_SUCCESS;
	data: {
		zombie: number;
		status: LoginResult;
		err?: string;
	};
};

export type LoginFailMessage = {
	event: typeof EVENT.LOGIN_FAIL;
	data: {
		zombie: number;
		status: LoginResult;
		err?: string;
	};
};

export type ChangePasswordMessage = {
	event: typeof EVENT.CHANGE_PASSWORD;
	data: { zombie: number };
};

export type ChangePasswordErrorMessage = {
	event: typeof EVENT.CHANGE_PASSWORD_ERROR;
	data: { zombie: number; err: string };
};

export type SubscribeMessage = {
	event: typeof EVENT.SUBSCRIBE;
	data: { channel: number; zombie: number };
};

export type SubscribeErrorMessage = {
	event: typeof EVENT.SUBSCRIBE_ERROR;
	data: { channel: number; zombie: number; err?: string };
};

export type WatchMessage = {
	event: typeof EVENT.WATCH;
	data: { zombie: number; video: number; time: number };
};

export type ShareLinkMessage = {
	event: typeof EVENT.SHARELINK;
	data: {
		taskType:
			| typeof TASK_TYPE.SHARELINK1
			| typeof TASK_TYPE.SHARELINK2
			| typeof TASK_TYPE.SHARELINK3
			| typeof TASK_TYPE.SHARELINK4
			| typeof TASK_TYPE.SHARELINK5
			| typeof TASK_TYPE.SHARELINK0
			| typeof TASK_TYPE.SHARELINK6;
		zombie: number;
		originLink: string;
		newLink: string | null;
		subscribe: boolean;
		channelId: number;
		citubeId: number;
		time: number | null;
		videos: { ytVideoId: string | null; time: number }[];
	};
};

export type WatchErrorMessage = {
	event: typeof EVENT.WATCH_ERROR;
	data: { zombie: number; video: number; err?: string };
};

export type LikeMessage = {
	event: typeof EVENT.LIKE;
	data: { video: number; zombie: number };
};

export type CommentMessage = {
	event: typeof EVENT.COMMENT;
	data: { video: number; zombie: number };
};

export type ErrorMessage = {
	event: typeof EVENT.ERROR;
	data: { err: string; tasks: Task[]; zombie: ZombieInfo };
};

export type EndWorkMessage = {
	event: typeof EVENT.WORK_END;
	data: { ipRange: string };
};
export type CancelWorkMessage = {
	event: typeof EVENT.WORK_CANCEL;
	data: { ipRange: string };
};

export type Message =
	| LoginSuccessMessage
	| LoginFailMessage
	| ChangePasswordMessage
	| ChangePasswordErrorMessage
	| SubscribeMessage
	| SubscribeErrorMessage
	| WatchMessage
	| ShareLinkMessage
	| WatchErrorMessage
	| LikeMessage
	| CommentMessage
	| ErrorMessage
	| EndWorkMessage
	| CancelWorkMessage;
