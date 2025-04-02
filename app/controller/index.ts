import { EVENT, type SharedLinkTaskData, type Task } from "@zombie/interfaces";
import { RedisController } from "./redis";
import { Repository } from "./repository";
import { CronJob } from "cron";
import { wait } from "@zombie/utils";
class Controller {
	public repository = new Repository();
	public redisList = new RedisController();
	public subMap = new Map<number, Set<number>>();
	public usedIpMap = new Map<number, Set<string>>();
	private _sleep = true;
	constructor() {}

	async init() {
		await this.repository.connect();
		if (process.env["NODE_ENV"] === "local") {
			await this.redisList.connectViaSSH();
		} else {
			await this.redisList.connect();
		}
	}

	get sleep() {
		return this._sleep;
	}

	set sleep(value: boolean) {
		this._sleep = value;
	}

	async getRunningMacro() {
		const result = await this.redisList.getKeysByPattern("MACRO:*");
		const runnings = result.map((v) => Number(v.replace("MACRO:", "")));
		// console.log("MACRO list:",runnings);
		return runnings;
	}

	async run() {
		while (true) {
			await this.listen();
			if (this.sleep) {
				console.log("Controller Sleep..");
				await wait(5000);
				continue;
			}
			const macroIds = await this.getRunningMacro();
			for (const macroId of macroIds) {
				const queueSize = await this.redisList.getQueueSize(macroId);
				if (queueSize && queueSize > 0) continue;
				const works = await this.repository.fetchSubscrbeTaskData(macroId);

				for (const work of works) {
					const ipRange =
						work.zombie.proxy?.host?.split(".")?.splice(0, 3)?.join(".") ??
						`IP.RANGE.DEFAULT`;

					const possibleRun = await this.redisList.isAvailableWork(
						work.zombie.id,
						ipRange
					);
					if (!possibleRun) continue;

					const tasks: Task[] = [];
					const possibleSub = this.isPossilbeSubscription(
						work.zombie.id,
						work.task.channelId,
						ipRange
					);

					// if (possibleSub) tasks.push(work.task);
					const watchDatas = await this.repository.fetchWatchData34(work.zombie.id);
					tasks.push(...watchDatas);
					this.redisList.command(macroId, { zombie: work.zombie, tasks });
					break;
				}
			}
			await wait(5000);
		}
	}

	async listen() {
		let resultSize = await this.redisList.getResultSize();
		while (resultSize && resultSize > 0) {
			const result = await this.redisList.fetchResult();
			if (result) {
				console.log(result.event + ": " + JSON.stringify(result));
				switch (result.event) {
					case "WATCH":
						this.repository.saveWatchResult(result);
						break;
					case "SUBSCRIBE":
						this.repository.saveSubscribeResult(result);
						break;
					case EVENT.CHANGE_PASSWORD:
						this.repository.changePassword(result);
						break;
					case EVENT.LOGIN_FAIL:
						this.repository.checkZombieDead(result);
						this.repository.saveError(result);
						break;
					case EVENT.LOGIN_SUCCESS:
						this.repository.checkZombieAlive(result);
						break;
					case "LIKE":
						this.repository.saveLikeResult(result);
						break;
					case "COMMENT":
						this.repository.saveCommentResult(result);
						break;
					default:
						this.repository.saveError(result);
						break;
				}
				break;
			}
			resultSize = await this.redisList.getResultSize();
		}
	}

	private isPossilbeSubscription(zid: number, cid: number, ipRange: string) {
		let zcnt = 0;
		for (const [channelId, subs] of this.subMap) {
			if (channelId && channelId == cid && subs.size > 30) return false;
			if (subs && subs.has(zid)) {
				zcnt += 1;
				if (zcnt == 2) return false;
			}
		}

		for (const [channelId, subs] of this.usedIpMap) {
			if (channelId && channelId == cid && subs.has(ipRange)) {
				return false;
			}
		}

		const subs = this.subMap.has(cid) ? this.subMap.get(cid)! : new Set<number>();
		subs.add(zid);
		this.subMap.set(cid, subs);

		const useIp = this.usedIpMap.has(cid) ? this.usedIpMap.get(cid)! : new Set<string>();
		useIp.add(ipRange);
		this.usedIpMap.set(cid, useIp);
		return true;
	}

	public clearSubMap() {
		this.subMap.clear();
		this.usedIpMap.clear();
	}
}

(async () => {
	const c = new Controller();
	const stopCron = new CronJob(
		"0 17 * * *",
		() => {
			c.sleep = true;
			console.error("Sleep Controller");
		},
		null,
		false,
		"Asia/Seoul",
		c,
		false
	);
	const startCron = new CronJob(
		"0 3 * * *",
		() => {
			c.sleep = false;
			c.clearSubMap();
			console.error("Wake Up Controller");
		},
		null,
		false,
		"Asia/Seoul",
		c,
		false
	);
	stopCron.start();
	startCron.start();
	await c.init();
	await c.run();
})();
