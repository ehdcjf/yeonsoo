import type { Page, Browser, Puppeteer } from "@zombie/puppeteer";
import type { ZombieInfo } from "@zombie/interfaces";
type ElementHandle = Awaited<ReturnType<Page["$"]>>;

export class DefaultTask {
	protected browser: Browser;
	protected page: Page;
	constructor(protected puppeteer: Puppeteer, protected zombie: ZombieInfo) {
		this.browser = this.puppeteer.browser;
		this.page = this.puppeteer.page;
	}

	private async click(element: ElementHandle, selector?: string) {
		try {
			try {
				await this.page.realClick(element);
			} catch (e) {
				if (!selector) throw e;
				await this.page.click(selector);
			}
		} catch {
			throw new Error("Unable to click element");
		}
	}

	protected async clickByName(name: string): Promise<void> {
		const target = await this.page.$(`[name="${name}"]`);
		if (!target) throw new Error(`Cannot find element with name "${name}"`);
		await this.click(target, `[name="${name}"]`);
	}

	protected async clickById(id: string): Promise<void> {
		const target = await this.page.$(`#${id}`);
		if (!target) throw new Error(`Cannot find element with "#${id}"`);
		await this.click(target, `#${id}`);
	}

	/**
	 * href에 substring을 포함하는 a 태그를 찾아 클릭
	 * @param substring
	 */
	protected async clickByHrefSubstring(substring: string): Promise<void> {
		try {
			await this.page.waitForFunction(
				(substring) => {
					return Array.from(document.querySelectorAll("a")).some((el) =>
						el.href.includes(substring)
					);
				},
				{ timeout: 5000 },
				substring
			);

			await this.page.evaluate((substring) => {
				const targetElement = Array.from(document.querySelectorAll("a")).find((el) =>
					el.href.includes(substring)
				) as HTMLElement;
				if (targetElement) targetElement.click();
			}, substring);
		} catch (err) {
			throw new Error(`Fail [clickByHrefSubstring]: ${substring}`);
		}
	}

	/**
	 *  targetName 을 name 으로 하는 input을 찾아 텍스트 입력
	 * @param targetName
	 * @param text
	 */
	protected async typeIntoInputByName(targetName: string, text: string): Promise<void> {
		try {
			const selector = `input[name="${targetName}"]`;
			await this.page.waitForSelector(selector, {
				timeout: 5000,
			});
			await this.page.type(selector, text, { delay: 100 });
		} catch (err) {
			throw new Error(`Fail [typeIntoInputByName]: ${targetName + " " + text}`);
		}
	}

	protected async scrollDown(dest: number, delay = 100) {
		await this.page.evaluate(
			async (dest, delay) => {
				let totalHeight = 0;
				await new Promise((resolve) => {
					const distance = 10;
					const timer = setInterval(() => {
						window.scrollBy(0, distance);
						totalHeight += distance;
						if (totalHeight >= dest) {
							clearInterval(timer);
							resolve(null);
						}
					}, delay);
				});
			},
			dest,
			delay
		);
	}
	protected async scrollUp(dest: number, delay = 100) {
		await this.page.evaluate(
			async (dest, delay) => {
				let totalHeight = 0;
				await new Promise((resolve) => {
					const distance = 10;
					const timer = setInterval(() => {
						window.scrollBy(0, distance);
						totalHeight -= distance;
						if (totalHeight <= dest) {
							clearInterval(timer);
							resolve(null);
						}
					}, delay);
				});
			},
			dest,
			delay
		);
	}

	protected async scrollDownUp(dest: number, delay = 100) {
		await this.page.evaluate(
			async (dest, delay) => {
				let totalHeight = 0;
				await new Promise((resolve) => {
					const distance = 100;
					const timer = setInterval(() => {
						window.scrollBy(0, distance);
						totalHeight += distance;
						if (totalHeight >= dest) {
							clearInterval(timer);
							resolve(null);
						}
					}, delay);
				});

				await new Promise((resolve) => {
					const distance = 90;
					const timer = setInterval(() => {
						window.scrollTo(0, totalHeight - distance);
						totalHeight -= distance;
						if (totalHeight <= 0) {
							clearInterval(timer);
							resolve(null);
						}
					}, delay);
				});
			},
			dest,
			delay
		);
	}
}
