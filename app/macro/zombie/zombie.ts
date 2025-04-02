import {
	EVENT,
	LoginResult,
	TASK_TYPE,
	type Task,
	type ZombieInfo,
	type SharedLinkTaskData,
	type ShareLinkMessage,
} from "@zombie/interfaces";
import { Puppeteer } from "@zombie/puppeteer";
import { LoginTask } from "./login";
import { fisherYatesSuffle, send, wait } from "@zombie/utils";
import type {
	ChangePasswordErrorMessage,
	ChangePasswordMessage,
	ErrorMessage,
	LoginFailMessage,
	LoginSuccessMessage,
	SubscribeErrorMessage,
	SubscribeMessage,
	WatchErrorMessage,
	WatchMessage,
	WatchTaskData,
	Work,
} from "@zombie/interfaces";
import { ChangePasswordTask } from "./chpw";
import { DcinsideSubscribeTask } from "./subscribe/dcinside";
import { WatchTask } from "./watch";
declare var self: Worker;
export class Zombie {
	private puppeteer: Puppeteer;
	constructor(private zombie: ZombieInfo, private tasks: Task[]) {
		this.puppeteer = new Puppeteer(zombie);
	}

	public async run() {
		await this.puppeteer.connect();
		await this.login();
		await this.changePW();
		const tasks = fisherYatesSuffle<Task>(this.tasks);

		for (const task of tasks) {
			if (task.taskType == TASK_TYPE.SUBSCRIBE && task.subLink) {
				if (task.subLink.includes("dcinside")) {
					await this.subscribeOnDc(task.subLink, task.channelId);
				}
			} else if (task.taskType == TASK_TYPE.WATCH && task.videoType == "long") {
				await this.watch(task);
			}
			await wait(3000);
		}
	}

	public async kill() {
		await this.puppeteer.kill();
	}

	async login() {
		if (!this.puppeteer.isConneted) throw new Error("Puppeteer Disconnected");
		try {
			const loginTask = new LoginTask(this.puppeteer, this.zombie);
			const isLogined = await loginTask.isLogined();
			if (isLogined) {
				console.log(`${EVENT.LOGIN_SUCCESS}: ${this.zombie.id}`);
				send<LoginSuccessMessage>({
					event: EVENT.LOGIN_SUCCESS,
					data: {
						zombie: this.zombie.id,
						status: 0,
					},
				});
			} else {
				await loginTask.run();
			}
		} catch (err: any) {
			console.error(`${EVENT.LOGIN_FAIL}: ${this.zombie.id}`);
			send<LoginFailMessage>({
				event: EVENT.LOGIN_FAIL,
				data: {
					zombie: this.zombie.id,
					status: err.status ?? LoginResult.UNCAUGHT,
					err: err?.message ?? null,
				},
			});
			throw new Error("Login Error");
		}
	}

	async changePW() {
		if (!this.puppeteer.isConneted) throw new Error("Puppeteer Disconnected");
		if (this.zombie.password === "ci426600*") return;
		try {
			const changePwTask = new ChangePasswordTask(this.puppeteer, this.zombie);
			await changePwTask.run();
			console.log(`${EVENT.CHANGE_PASSWORD}: ${this.zombie.id}`);
			send<ChangePasswordMessage>({
				event: EVENT.CHANGE_PASSWORD,
				data: {
					zombie: this.zombie.id,
				},
			});
		} catch (err: any) {
			console.error(`${EVENT.CHANGE_PASSWORD_ERROR}: ${this.zombie.id}`);
			send<ChangePasswordErrorMessage>({
				event: EVENT.CHANGE_PASSWORD_ERROR,
				data: {
					zombie: this.zombie.id,
					err: err?.message,
				},
			});
			throw new Error("Change Password Error");
		}
	}

	async subscribeOnDc(link: string, cid: number) {
		if (!this.puppeteer.isConneted) throw new Error("Puppeteer Disconnected");
		try {
			const dcinside = new DcinsideSubscribeTask(this.puppeteer, this.zombie, link, cid);
			const subResult = await dcinside.run();
			if (subResult) {
				console.log(`${EVENT.SUBSCRIBE}: ${this.zombie.id} ${cid}`);
				send<SubscribeMessage>({
					event: EVENT.SUBSCRIBE,
					data: { channel: cid, zombie: this.zombie.id },
				});
			} else {
				console.error(`${EVENT.SUBSCRIBE_ERROR}: ${this.zombie.id} ${cid}`);
				send<SubscribeErrorMessage>({
					event: EVENT.SUBSCRIBE_ERROR,
					data: {
						channel: cid,
						zombie: this.zombie.id,
						err: "Fail To Click Sub Or Already Subscribed",
					},
				});
			}
		} catch (err: any) {
			console.error(`${EVENT.SUBSCRIBE_ERROR}: ${this.zombie.id} ${cid}`);
			send<SubscribeErrorMessage>({
				event: EVENT.SUBSCRIBE_ERROR,
				data: { channel: cid, zombie: this.zombie.id, err: err?.message },
			});
			throw new Error("Subscribe Error");
		}
	}

	async watch(video: WatchTaskData) {
		if (!this.puppeteer.isConneted) throw new Error("Puppeteer Disconnected");
		try {
			if (!video.link) return;
			const watchTask = new WatchTask(this.puppeteer, this.zombie, video);
			const watchTime = await watchTask.run()!;
			console.log(`${EVENT.WATCH}: ${this.zombie.id} ${video.citubeId} ${watchTime}`);
			send<WatchMessage>({
				event: EVENT.WATCH,
				data: {
					zombie: this.zombie.id,
					video: video.citubeId,
					time: watchTime,
				},
			});
		} catch (err: any) {
			console.error(`${EVENT.WATCH_ERROR}: ${this.zombie.id} ${JSON.stringify(video, null, 2)}`);
			send<WatchErrorMessage>({
				event: EVENT.WATCH_ERROR,
				data: {
					zombie: this.zombie.id,
					video: video.citubeId,
					err: err?.message ?? "Unknown Error",
				},
			});
			throw new Error("Watch Error");
		}
	}
}

self.onmessage = async (event: MessageEvent<Work>) => {
	const { zombie, tasks } = event.data;
	const crawler = new Zombie(zombie, tasks);

	process.on("uncaughtException", async (err) => {
		console.error(`UncaughtException${err}`);
		console.error(err);
		send<ErrorMessage>({
			event: EVENT.ERROR,
			data: {
				zombie: zombie,
				tasks: tasks,
				err: err?.message ?? "Unknown Error",
			},
		});
		if (zombie) await crawler.kill();
		process.exit(1);
	});

	process.on("exit", async (code) => {
		if (zombie) await crawler.kill();
	});

	try {
		await crawler.run();
	} catch (err: any) {
		console.error(err);
	} finally {
		if (zombie) await crawler.kill();
		process.exit(0);
	}
};
