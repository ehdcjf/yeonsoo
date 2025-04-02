import type { ConnectResult } from "puppeteer-real-browser";
export type Browser = ConnectResult["browser"];
export type Page = ConnectResult["page"];
export * from "./types/config";
export * from "./types/work";
export * from "./types/zombie";
export * from "./types/message";
export * from "./const";
