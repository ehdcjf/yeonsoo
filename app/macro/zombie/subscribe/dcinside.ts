import { send, wait } from "@zombie/utils";
import type { ZombieInfo, Page, Browser } from "@zombie/interfaces";
import { EVENT } from "@zombie/interfaces";
import { Jimp, diff } from "Jimp";
import path from "node:path";
import fs from "fs";
import { DefaultTask } from "../task";
import type { SubscribeMessage } from "@zombie/interfaces/types/message";
import type { Puppeteer } from "@zombie/puppeteer";

type JimpImage = Awaited<ReturnType<typeof Jimp.read>>;
type Vector2D = { x: number; y: number };
type VideoRect = { x: number; y: number; width: number; height: number };

export class DcinsideSubscribeTask extends DefaultTask {
	private isSubscribed = false;

	constructor(puppeteer: Puppeteer, zombie: ZombieInfo, private link: string, private channelId: number) {
		super(puppeteer, zombie);
	}

	async run() {
		const initialLink = Math.random() > 0.5 ? "https://www.naver.com" : "https://www.dcinside.com/";
		await this.page.goto(initialLink, { waitUntil: "networkidle2" });
		await wait(1000);
		await this.page.goto(this.link, { waitUntil: "networkidle2" });
		await wait(1000);

		const orignRect = await this.page.evaluate(() => {
			const embedElement = document.querySelector("embed");
			if (!embedElement) return null;

			const rect = embedElement.getBoundingClientRect();
			return {
				x: rect.x, // 요소의 x 좌표 (뷰포트 기준)
				y: rect.y, // 요소의 y 좌표 (뷰포트 기준)
				width: rect.width, // 요소의 가로 크기
				height: rect.height, // 요소의 세로 크기
			};
		});

		if (!orignRect) throw new Error("Not Found Embed Element");

		// 영상이 있는 곳까지 스크롤
		const scrollValue = orignRect.y - 100;
		await this.scrollDown(scrollValue, 10);

		const newRect = { ...orignRect, y: 100 };
		// 영상 실행
		await wait(1000);
		await this.playVideo(newRect);

		// 영상 품질 설정
		await wait(3000);
		await this.setHighQuality(newRect);

		// 구독전 3분이상 시청
		const watchRand = Math.floor((Math.random() / 10 + 0.9) * 200) * 1000;
		await wait(watchRand);

		//구독
		const subResult = await this.subscribe(newRect, orignRect);
		const waitRand = Math.floor(Math.random() * 10) * 1000;
		await wait(waitRand);
		return subResult;
	}

	private async playVideo(rect: VideoRect) {
		const playButtonCenter = {
			x: rect.x + Math.floor(rect.width / 2),
			y: rect.y + Math.floor(rect.height / 2),
		};
		const targetPoint = this.getRandomPointInCircle(playButtonCenter, 40);
		await this.page.realCursor.moveTo(targetPoint, { moveDelay: 100 });
		await this.page.realCursor.click();
	}

	private getRandomPointInCircle(c: Vector2D, radius: number) {
		const angle = Math.random() * 2 * Math.PI;
		const distance = Math.sqrt(Math.random()) * radius;
		const x = c.x + distance * Math.cos(angle);
		const y = c.y + distance * Math.sin(angle);
		return { x, y };
	}

	private async setHighQuality(rect: VideoRect) {
		const settingButtonOriginPoint = {
			// 설정버튼 아이콘 원점 // 설정버튼의 반지름은 20
			x: rect.x + 421,
			y: rect.y + rect.height - 20,
		};

		const settingButtonDest = this.getRandomPointInCircle(settingButtonOriginPoint, 12);
		await this.page.realCursor.moveTo(settingButtonDest, {
			moveDelay: 100,
		});
		await this.page.realCursor.click();
		await wait(1000);

		const qualityButtonOriginPoint = {
			x: settingButtonDest.x,
			y: settingButtonOriginPoint.y - 56,
		};

		const qualityButtonDest = this.getRandomPointInCircle(qualityButtonOriginPoint, 12);
		await this.page.realCursor.moveTo(qualityButtonDest, {
			moveDelay: 100,
		});
		await this.page.realCursor.click();
		await wait(1000);

		const highQualityOriginPoint = {
			x: settingButtonDest.x,
			y: qualityButtonOriginPoint.y - 120,
		};

		const highQualityButtonDest = this.getRandomPointInCircle(highQualityOriginPoint, 12);

		await this.page.realCursor.moveTo(highQualityButtonDest, {
			moveDelay: 100,
		});
		await this.page.realCursor.click();
		await wait(800);
	}

	private async subscribe(rect: VideoRect, shot: VideoRect) {
		const embedImagePath = path.join(process.cwd(), "temp", `${this.channelId}_${Date.now()}.png`);

		try {
			this.page.off("request");
			this.page.on("request", (request) => {
				const url = request.url();

				// specify patterns for scripts you want to block
				if (url.includes("analytics") || url.includes("ads") || url.includes("social")) {
					// block the request
					request.abort();
				} else if (url.includes("v1/subscription/subscribe")) {
					console.log("Call Subscribe API");
					this.isSubscribed = true;
					request.continue();
				} else {
					request.continue();
				}
			});
			const channelIconOriginPoint = {
				x: rect.x + 32,
				y: rect.y + 32,
			};
			const radius = 8;
			const channelIconDest = this.getRandomPointInCircle(channelIconOriginPoint, radius);
			await wait(1000);
			await this.page.realCursor.moveTo(channelIconDest, {
				moveDelay: 100,
			});
			await wait(1000);
			await this.page.screenshot({
				path: embedImagePath,
				clip: { ...shot, height: 60 },
			});
			const mainImage = await Jimp.read(embedImagePath);
			const template1 = await Jimp.read(path.join(process.cwd(), "templates", `subscribe.png`));
			const template2 = await Jimp.read(path.join(process.cwd(), "templates", `subscribe2.png`));
			const results = await Promise.all([
				this.findTemplage(mainImage, template1),
				this.findTemplage(mainImage, template2),
			]);
			for (const result of results) {
				if (result == null) continue;
				if (this.isSubscribed) break;
				await this.page.realCursor.moveTo(channelIconDest, { moveDelay: 100 });
				await wait(1000);
				const startPoint = { ...channelIconOriginPoint };
				const subscribeDest = {
					x: rect.x + result.x + result.width / 2,
					y: rect.y + result.y + result.height / 2,
				};

				const step = {
					x: Math.floor((subscribeDest.x - channelIconDest.x) / 15),
					y: Math.floor((subscribeDest.y - channelIconDest.y) / 15),
				};

				for (let i = 0; i < 15; i++) {
					startPoint.x += step.x;
					startPoint.y += step.y;
					await this.page.realCursor.moveTo(startPoint, { moveDelay: 50 });
					await wait(100);
				}
				const subResult = await this.checkSub();
				return subResult;
			}
		} catch (err) {
			console.error("Fail To Subscribe Dcinside Embed");
			console.error(err);
			throw new Error("Fail To Subscribe Dcinside Embed");
		} finally {
			if (fs.existsSync(embedImagePath)) fs.rmSync(embedImagePath);
		}
	}

	private checkSub() {
		return new Promise<boolean>(async (resolve) => {
			await this.page.realCursor.click();
			setTimeout(() => {
				resolve(this.isSubscribed);
			}, 5000);
		});
	}

	private findTemplage(mainImage: JimpImage, template: JimpImage) {
		const templateCrop = template.clone().crop({
			x: 0,
			y: 0,
			w: template.bitmap.width,
			h: template.bitmap.height,
		});
		for (let y = 0; y < mainImage.bitmap.height - template.bitmap.height; y++) {
			for (let x = 0; x < mainImage.bitmap.width - template.bitmap.width; x++) {
				//x, y, template.bitmap.width, template.bitmap.height
				const region = mainImage.clone().crop({
					x,
					y,
					w: template.bitmap.width,
					h: template.bitmap.height,
				});
				const d = diff(region, templateCrop);
				const p = d.percent;
				if (p < 0.15) {
					return {
						x,
						y,
						width: template.bitmap.width,
						height: template.bitmap.height,
					};
				}
			}
		}
		return null;
	}
}
