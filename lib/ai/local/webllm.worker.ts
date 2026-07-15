// Web Worker ฝั่งรัน WebLLM engine — โหลดโดย engine.ts ผ่าน
// `new Worker(new URL("./webllm.worker.ts", import.meta.url))` (webpack แยก chunk ให้เอง)
import { WebWorkerMLCEngineHandler } from "@mlc-ai/web-llm"

const handler = new WebWorkerMLCEngineHandler()
self.onmessage = (msg: MessageEvent) => handler.onmessage(msg)
