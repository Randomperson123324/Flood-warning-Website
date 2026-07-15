// คัดลอก wasm runtime ของ wllama (llama.cpp) เข้า public/ ให้เสิร์ฟจาก origin เดียวกัน
// รันอัตโนมัติก่อน dev/build — public/wllama/ จึงไม่ต้อง commit เข้า git
// (ดู lib/ai/local/cpu-engine.ts ที่ชี้ path มาที่ /wllama/wllama.wasm)

import { copyFile, mkdir } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const src = resolve(root, "node_modules/@wllama/wllama/esm/wasm/wllama.wasm")
const dest = resolve(root, "public/wllama/wllama.wasm")

await mkdir(dirname(dest), { recursive: true })
await copyFile(src, dest)
console.log("copied wllama.wasm -> public/wllama/")
