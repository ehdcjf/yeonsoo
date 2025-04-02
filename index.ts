import fs, { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { connect, type ConnectResult, type Options } from "puppeteer-real-browser";
import { Launcher } from "chrome-launcher";
import { wait } from "@zombie/utils";

export type Browser = ConnectResult["browser"];
export type Page = ConnectResult["page"];

export class Puppeteer {
	public page!: Page;
	public browser!: Browser;
	constructor() {

	}

	public async run() {
		return await this.connect();
	}

	public get isConneted() {
		return this.browser && this.browser.connected && this.page && !this.page.isClosed();
	}

	private getChromeArgs() {
		let flags = Launcher.defaultFlags();
		// Add AutomationControlled to "disable-features" flag
		const indexDisableFeatures = flags.findIndex((flag) => flag.startsWith("--disable-features"));
		flags[indexDisableFeatures] = `${flags[indexDisableFeatures]},AutomationControlled`;
		// Remove "disable-component-update" flag
		const indexComponentUpdateFlag = flags.findIndex((flag) =>
			flag.startsWith("--disable-component-update")
		);
		flags.splice(indexComponentUpdateFlag, 1);
		flags = flags.filter((v) => v !== "--mute-audio");
		return [
			...flags,
			"--webrtc-ip-handling-policy=disable_non_proxied_udp",
			"--force-webrtc-ip-handling-policy",
			"--disable-ipv6",
			"--disable-webrtc",
			"--disable-ipc-flooding-protection",
			'--remote-debugging-port=9222',
			'--remote-debugging-address=0.0.0.0',
			'--disable-dev-shm-usage'

		];
	}

	private isExistsEnsure(path: string) {
		let isExist = fs.existsSync(path);
		if (!isExist) fs.mkdirSync(path, { recursive: true });
		return isExist;
	}

	private getChromePath() {
		const platform = os.platform();
		const possiblePaths: string[] = [];
		switch (platform) {
			case "darwin":
				possiblePaths.push("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome");
				break;
			case "linux":
				possiblePaths.push("/usr/bin/google-chrome")!;
				possiblePaths.push("/usr/local/bin/google-chrome")!;
				possiblePaths.push("/snap/bin/chromium")!;
				break;
			case "win32":
				possiblePaths.push(
					path.join(
						process.env["PROGRAMFILES(X86)"]!,
						"Google/Chrome/Application/chrome.exe"
					)
				);
				possiblePaths.push(
					path.join(process.env["PROGRAMFILES"]!, "Google/Chrome/Application/chrome.exe")
				);
				possiblePaths.push(
					path.join(process.env["LOCALAPPDATA"]!, "Google/Chrome/Application/chrome.exe")
				);
				break;
		}

		const chromePath = possiblePaths.find((p) => existsSync(p));
		if (!chromePath) {
			console.error("Chrome executable not found on this system.");
			process.exit(1);
		}
		return chromePath;
	}

	public async connect() {
		try {
			const chromePath = this.getChromePath();
			const options: Options = {
				headless: false,
				ignoreAllFlags: true,
				customConfig: {
					chromePath: chromePath,
					userDataDir: `/home/backend/.config/kling`,
					startingUrl:'https://klingai.com/'
				},
				args: this.getChromeArgs(),
			};

			const context = await connect(options);

			this.browser = context.browser;
			this.page = context.page;

			await this.setup(this.page);


			await wait(2000);
			console.log(`Success To Connect`);
			return { page: this.page, browser: this.browser };
		} catch (err) {
			console.error("Connection Error");
		}
	}

	private async setup(page: Page) {
		await page.setViewport({ width: 1920, height: 945, deviceScaleFactor: 1 });
		await page.setUserAgent(
			"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36"
		);

		await page.evaluateOnNewDocument(() => {
			const generateRandomNoise = (min: number, max: number) =>
				Math.floor(Math.random() * (max - min + 1)) + min;

			const canvasCache = new Map();

			// toDataURL 변조
			HTMLCanvasElement.prototype.toDataURL = (function (original) {
				return function (
					this: HTMLCanvasElement,
					...args: [type?: string | undefined, quality?: any]
				) {
					const key = JSON.stringify(args);
					if (canvasCache.has(key)) return canvasCache.get(key);

					const result = original.apply(this, args);
					const randomIndex = generateRandomNoise(10, result.length - 10);
					const noiseChar = String.fromCharCode(generateRandomNoise(65, 90));
					const modifiedResult =
						result.slice(0, randomIndex) +
						noiseChar +
						result.slice(randomIndex + 1);

					canvasCache.set(key, modifiedResult);
					return modifiedResult;
				};
			})(HTMLCanvasElement.prototype.toDataURL);

			// getImageData 변조
			CanvasRenderingContext2D.prototype.getImageData = (function (original) {
				return function (
					this: CanvasRenderingContext2D,
					...args: [number, number, number, number]
				) {
					const imageData = original.apply(this, args);

					for (let i = 0; i < imageData.data.length; i += 4) {
						imageData.data[i] = Math.min(
							255,
							Math.max(0, imageData.data[i] + generateRandomNoise(-2, 2))
						); // Red
						imageData.data[i + 1] = Math.min(
							255,
							Math.max(0, imageData.data[i + 1] + generateRandomNoise(-2, 2))
						); // Green
						imageData.data[i + 2] = Math.min(
							255,
							Math.max(0, imageData.data[i + 2] + generateRandomNoise(-2, 2))
						); // Blue
					}

					return imageData;
				};
			})(CanvasRenderingContext2D.prototype.getImageData);

			const getParameter = WebGLRenderingContext.prototype.getParameter;

			// 고정된 GPU Renderer와 Vendor 정보
			const fixedRenderer = "AMD Radeon(TM) Graphics";
			const fixedVendor = "Advanced Micro Devices, Inc.";

			WebGLRenderingContext.prototype.getParameter = function (parameter) {
				if (parameter === 37445) {
					// GPU Renderer 반환
					return fixedRenderer;
				}
				if (parameter === 37446) {
					// GPU Vendor 반환
					return fixedVendor;
				}
				// 다른 파라미터는 기본 동작 유지
				return getParameter.call(this, parameter);
			};

			const createRandomIceCandidate = () => ({
				candidate: `candidate:${Math.random()
					.toString(36)
					.substring(2)} 1 udp 2122260223 192.168.${Math.floor(
					Math.random() * 255
				)}.${Math.floor(Math.random() * 255)} 54321 typ host`,
				sdpMid: "audio",
				sdpMLineIndex: 0,
			});

			// 가짜 RTCDataChannel 구현
			class RTCDataChannel {
				label: any;
				readyState: string;
				constructor(label: any) {
					this.label = label || "datachannel";
					this.readyState = "open";
				}

				send(data: any) {}

				close() {
					this.readyState = "closed";
				}
			}

			// 가짜 RTCPeerConnection 구현
			class RTCPeerConnection {
				localDescription: null;
				remoteDescription: null;
				_onicecandidate: null;
				_ontrack: null;
				_dataChannel: null | RTCDataChannel;
				constructor(config: any) {
					this.localDescription = null;
					this.remoteDescription = null;
					this._onicecandidate = null;
					this._ontrack = null;
					this._dataChannel = null;
				}

				createOffer() {
					return Promise.resolve({
						type: "offer",
						sdp: "v=0\r\no=- 12345 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\na=msid-semantic: WMS\r\n",
					});
				}

				createAnswer() {
					return Promise.resolve({
						type: "answer",
						sdp: "v=0\r\no=- 67890 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\na=msid-semantic: WMS\r\n",
					});
				}

				setLocalDescription(description: any) {
					this.localDescription = description;
					return Promise.resolve();
				}

				setRemoteDescription(description: any) {
					this.remoteDescription = description;
					return Promise.resolve();
				}

				addIceCandidate(candidate: any) {
					return Promise.resolve();
				}

				createDataChannel(label: any) {
					this._dataChannel = new RTCDataChannel(label);
					return this._dataChannel;
				}

				close() {
					console.log("RTCPeerConnection closed");
				}

				set onicecandidate(callback: any) {
					this._onicecandidate = callback;
					if (callback) {
						setTimeout(() => {
							callback({ candidate: createRandomIceCandidate() });
						}, 1000); // 1초 후에 ICE Candidate 반환
					}
				}

				set ontrack(callback) {
					this._ontrack = callback;
				}

				get onicecandidate() {
					return this._onicecandidate;
				}

				get ontrack() {
					return this._ontrack;
				}

				get iceConnectionState() {
					return "connected";
				}

				get signalingState() {
					return "stable";
				}

				get iceGatheringState() {
					return "complete";
				}
			}

			// 기존 구현체 대체
			Object.defineProperty(window, "RTCPeerConnection", {
				value: RTCPeerConnection,
				writable: false,
			});

			Object.defineProperty(window, "webkitRTCPeerConnection", {
				value: RTCPeerConnection,
				writable: false,
			});

			Object.defineProperty(navigator, "getUserMedia", {
				value: (constraints: any) =>
					Promise.resolve({
						getTracks: () => [
							{
								kind: "video",
								label: "Integrated Camera",
								id: "video-track-1",
							},
							{
								kind: "audio",
								label: "Internal Microphone",
								id: "audio-track-1",
							},
						],
					}),
				writable: false,
			});

			Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
				value: (constraints: any) =>
					Promise.resolve({
						getTracks: () => [
							{
								kind: "video",
								label: "Integrated Camera",
								id: "video-track-1",
							},
							{
								kind: "audio",
								label: "Internal Microphone",
								id: "audio-track-1",
							},
						],
					}),
				writable: false,
			});

			Object.defineProperty(navigator, "hardwareConcurrency", {
				get: () => 4, // 실제 PC 환경처럼 보이게 설정
			});

			Object.defineProperty(navigator, "plugins", {
				get: () => [
					{
						name: "PDF Viewer",
						description: "Portable Document Format",
						filename: "internal-pdf-viewer",
					},
					{
						name: "Chrome PDF Viewer",
						description: "Portable Document Format",
						filename: "internal-pdf-viewer",
					},
					{
						name: "Chromium PDF Viewer",
						description: "Portable Document Format",
						filename: "internal-pdf-viewer",
					},
					{
						name: "Microsoft Edge PDF Viewer",
						description: "Portable Document Format",
						filename: "internal-pdf-viewer",
					},
					{
						name: "WebKit built-in PDF",
						description: "Portable Document Format",
						filename: "internal-pdf-viewer",
					},
				],
			});

			// navigator.getUserMedia 조작
			(navigator as any).getUserMedia = null;
		});

		await page.setRequestInterception(true);

		// block non-essential third-party scripts
		page.on("request", (request) => {
			const url = request.url();

			// specify patterns for scripts you want to block
			if (url.includes("analytics") || url.includes("ads") || url.includes("social")) {
				// block the request
				request.abort();
			} else {
				// allow the request
				request.continue();
			}
		});
	}

	public async kill() {
		if (this.page && !this.page.isClosed()) await this.page.close();
		if (this.browser && this.browser.connected) await this.browser.close();
	}
}


const p = new Puppeteer();
await p.connect();