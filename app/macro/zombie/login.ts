import { DefaultTask } from "./task";
import type { Browser, Page, Puppeteer } from "@zombie/puppeteer";
import { type ZombieInfo, LoginResult } from "@zombie/interfaces";
import { wait } from "@zombie/utils";
type ElementHandle = Awaited<ReturnType<Page["$"]>>;

export class LoginTask extends DefaultTask {
	constructor(puppeteer: Puppeteer, zombie: ZombieInfo) {
		super(puppeteer, zombie);
	}

	async isLogined() {
		await this.page.goto("https://www.youtube.com", { waitUntil: "networkidle2" });
		await wait(2000);
		const href = "https://accounts.google.com/ServiceLogin";
		try {
			await this.page.waitForFunction(
				(substring) => {
					return Array.from(document.querySelectorAll("a")).some((el) =>
						el.href.includes(substring)
					);
				},
				{ timeout: 5000 },
				href
			);
			await this.clickByHrefSubstring("https://accounts.google.com/ServiceLogin");
			return false;
		} catch {
			return true;
		}
	}

	async run() {
		await wait(2000);
		await this.clickByName("identifier");

		// type email
		await wait(3000);
		await this.typeIntoInputByName("identifier", this.zombie.email);
		await this.clickById("identifierNext");

		await wait(3000);

		// 삭제된 계정
		const deletedEmail = await this.page.$("div.Ekjuhf");
		if (deletedEmail) throw { status: LoginResult.DELETED_EMAIL };

		// 봇 감지
		const botCheck = await this.page.$("iframe[title='reCAPTCHA']");
		if (botCheck) throw { status: LoginResult.BOT_CHECK };

		// click password input
		await this.clickByName("Passwd");
		await this.typeIntoInputByName("Passwd", this.zombie.password);
		await wait(1000);
		await this.clickById("selectionc1");
		await wait(1000);
		await this.clickById("passwordNext");
		await wait(7000);

		// 핀번호 입력
		const pinInput = await this.page.$(`input[name='Pin']`);
		if (pinInput) throw { status: LoginResult.REQUIRED_PIN };

		// 잘못된 패스워드
		const invalidPassword = await this.page.$("div.Ly8vae");
		if (invalidPassword) {
			const text = await this.page.evaluate((div) => {
				const span = div.querySelector("span");
				return span?.textContent;
			}, invalidPassword);
			throw { status: LoginResult.INVALID_PASSWORD, message: text ?? "" };
		}

		// 번호 인증
		const phoneInput = await this.page.$(`input[id='phoneNumberId']`);
		if (phoneInput) throw { status: LoginResult.REQUIRED_PHONE };

		const recoveryEmailInput = await this.page.$(`input[name='knowledgePreregisteredEmailResponse']`);
		if (recoveryEmailInput) {
			await this.typeIntoInputByName("knowledgePreregisteredEmailResponse", this.zombie.recovery);
			const buttons = await this.page.$$(`button[type='button']`);

			for (const btn of buttons) {
				const spans = await btn.$$eval("span", (elements) =>
					elements.map((el) => el.innerHTML)
				);
				if (spans.includes("다음") || spans.includes("Next")) {
					await this.page.realClick(btn);
					break;
				}
			}
		}

		try {
			const chkRcvMailBtn = await this.page.$(`div[data-challengeid='5']`);
			await this.page.realClick(chkRcvMailBtn);
			await wait(2000);
			await this.typeIntoInputByName("knowledgePreregisteredEmailResponse", this.zombie.recovery);

			const buttons = await this.page.$$(`button[type='button']`);

			for (const btn of buttons) {
				const spans = await btn.$$eval("span", (elements) =>
					elements.map((el) => el.innerHTML)
				);
				if (spans.includes("다음") || spans.includes("Next")) {
					await this.page.realClick(btn);
					break;
				}
			}
		} catch (err) {}

		// try {
		// 	await this.clickById("secondary-button");
		// 	await wait(1000);
		// 	await this.clickById("confirm-button");
		// 	await wait(1000);
		// } catch {}

		await wait(3000);

		const save = await this.page.$$(`span.VfPpkd-vQzf8d`);
		if (save) await this.page.realClick(save[save.length - 1]);

		await wait(4000);

		const href = await this.page.evaluate(() => {
			return window.location.href;
		});

		// 로그인 실패하여 home 으로 이동하지 못한 경우
		if (href.includes("signin")) throw { status: LoginResult.SINGIN_YET };
	}
}
