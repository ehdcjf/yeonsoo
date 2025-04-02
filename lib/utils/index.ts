import { promisify } from "util";
import fs from "fs";
import path from "path";
import type { MacroConfig } from "@zombie/interfaces";

export const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function getMacroConfig(): MacroConfig {
	const configFile = fs.readFileSync(path.join(process.cwd(), "config.json"), {
		encoding: "utf8",
	});
	const config = JSON.parse(configFile) as MacroConfig;
	config.mode = config.mode ?? "development";
	return config;
}

/**
 * 자식 => 부모
 * @param message
 */
export function send<T>(message: T) {
	postMessage(message);
}

/**
 * 배열 섞기
 * @param list
 * @returns
 */
export function fisherYatesSuffle<T>(list: T[]) {
	if (!list || list.length == 0) return [];
	for (let i = list.length - 1; i > 0; i -= 1) {
		const randomIndex = Math.floor(Math.random() * (i + 1));
		[list[i], list[randomIndex]] = [list[randomIndex], list[i]];
	}
	return list;
}

export function parseProxyIp(proxyInfo: string) {
	return proxyInfo.split(":").reduce(
		(r, v, i) => {
			if (i == 0) r.host = v;
			else if (i == 1) r.port = +v;
			else if (i == 2) r.username = v;
			else if (i == 3) r.password = v;
			return r;
		},
		{ host: "", port: 0, username: "", password: "" }
	);
}
