import {
	EVENT,
	LoginResult,
	type Task,
	TASK_TYPE,
	type ZombieInfo
} from "@zombie/interfaces";
import { Puppeteer } from "../../../lib/puppeteer";
import { LoginTask } from "./login";
import { fisherYatesSuffle, parseProxyIp, send, wait } from "@zombie/utils";
import type {
	ChangePasswordErrorMessage,
	ChangePasswordMessage,
	LoginFailMessage,
	LoginSuccessMessage,
	SharedLinkTaskData,
} from "@zombie/interfaces";
import { ChangePasswordTask } from "./chpw";
import { DcinsideSubscribeTask } from "./subscribe/dcinside";
import { WatchTask } from "./watch";

export class Zombie {
	private puppeteer: Puppeteer;

	constructor(private zombie: ZombieInfo, private tasks: Task[]) {
		this.puppeteer = new Puppeteer(zombie);
	}

	public async run() {
		await this.puppeteer.connect();
		try {
			await this.login();
		} catch (err) {}

			const watchTask = new WatchTask(this.puppeteer,this.zombie, {taskType:  TASK_TYPE.WATCH,
		citubeId: 0,
		youtubeId: "",
		videoType: "long" ,
		link: 'watchapp',
		category: 'video'});
	const result = await  watchTask.run()
		console.log(result)
		await wait(5000);
	}

	public async kill() {
		await this.puppeteer.kill();
	}

	async login() {
		try {
			const loginTask = new LoginTask(this.puppeteer, this.zombie);
			const isLogined = await loginTask.isLogined();
			if (isLogined) {
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
			console.log(err);
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
}

/**
 * 3tRH0dT@macpc.top	ci426600*	211.34.197.22:3135:blackred:apple1231	3tRH0dT@outlook.com
BjdQsOx@macpc.top	ci426600*	211.199.44.96:3136:blackred:apple1231	BjdQsOx@outlook.com
RDUO2BI@macpc.top	ci426600*	211.199.64.200:3137:blackred:apple1231	RDUO2BI@hotmail.com
S088HdZ@macpc.top	ci426600*	118.45.254.127:3138:blackred:apple1231	S088HdZ@icloud.com
FCqae9D@macpc.top	ci426600*	121.159.41.97:3139:blackred:apple1231	FCqae9D@hotmail.com
85VsfFg@macpc.top	ci426600*	61.80.247.240:3140:blackred:apple1231	85VsfFg@hotmail.com
LLDINjz@macpc.top	ci426600*	112.165.14.82:3134:blackred:apple1231	LLDINjz@mail.com
vpk67ju@macpc.top	ci426600*	118.41.214.154:3135:blackred:apple1231	vpk67ju@icloud.com
yMgyhem@macpc.top	ci426600*	222.103.179.160:3137:blackred:apple1231	yMgyhem@mail.com
 * 
 * 
 */

const rawData = `NYQckfZ@macpc.top	ci426600*	14.45.57.152:3135:blackred:apple1231	NYQckfZ@outlook.com`;

const zomibes = rawData
	.split("\n")
	.map((v) => v.split("\t"))
	.map((v) => ({
		email: v[0],
		password: v[1],
		proxy: v[2],
		recovery: v[3],
	}))
	.map(async (zom, i) => {
		await wait(i * 1000 + 1000);
		const z = new Zombie(
			{
				email: zom.email,
				password: zom.password,
				recovery: zom.recovery,
				proxy: parseProxyIp(zom.proxy),
				id: 0,
			},
			[
				{
					taskType: "SHARELINK6",
					data: {
						link: "https://t.co/WPQVlIVWAy",
						channelId: 34,
						citubeId: 3169,
					},
				},
			]
		);
		await z.run();
	});

await Promise.all(zomibes);
// const z = new Zombie(
// 	{
// 		email: "3tRH0dT@macpc.top",
// 		password: "ci426600*",
// 		id: 11305,
// 		proxy: { host: "211.34.197.22", port: 3135, username: "blackred", password: "apple1231" },
// 		recovery: "3tRH0dT@outlook.com",
// 	},
// 	[
// 		{
// 			taskType: "SHARELINK6",
// 			data: {
// 				link: "https://t.co/gy3HIeBz3x",
// 				channelId: 34,
// 				citubeId: 3169,
// 			},
// 		},
// 	]
// );
// try {
// 	await z.run();
// } catch (err) {
// 	console.error(err);
// } finally {
// 	// await z.kill();
// }
