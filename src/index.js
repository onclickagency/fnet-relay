import http from "http"
import fs from "fs/promises"
import path from "path"
import { fileURLToPath } from "url"
import { Server } from "socket.io"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DIST_DIR = path.join(__dirname, "../dist")
const INDEX_FILE = path.join(DIST_DIR, "index.html")

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".map": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".wasm": "application/wasm"
}

async function handleRequest(req, res) {
  try {
    const url = new URL(req.url || "/", "http://localhost")
    let pathname = url.pathname
    if (pathname === "/") {
      pathname = "/index.html"
    }
    const filePath = path.join(DIST_DIR, pathname)
    let data
    try {
      data = await fs.readFile(filePath)
    } catch {
      data = await fs.readFile(INDEX_FILE)
      res.statusCode = 200
      res.setHeader("Content-Type", "text/html; charset=utf-8")
      res.end(data)
      return
    }
    const ext = path.extname(filePath).toLowerCase()
    const type = mimeTypes[ext] || "application/octet-stream"
    res.statusCode = 200
    res.setHeader("Content-Type", type)
    res.end(data)
  } catch (err) {
    res.statusCode = 500
    res.setHeader("Content-Type", "text/plain; charset=utf-8")
    res.end("Internal Server Error")
    console.error(err)
  }
}

const server = http.createServer((req, res) => {
  handleRequest(req, res)
})

const io = new Server(server, {
  cors: { origin: "*" }
})

const publicKeyToSocket = new Map()

io.on("connection", (socket) => {
  let myPublicKey = null

  socket.on("hello", (publicKey) => {
    myPublicKey = publicKey
    publicKeyToSocket.set(publicKey, socket.id)
    socket.emit("hello-ok", publicKey)
  })

  socket.on("msg", ({ to, data }) => {
    const target = publicKeyToSocket.get(to)
    if (!target) return
    io.to(target).emit("msg", { from: myPublicKey, data })
  })

  socket.on("disconnect", () => {
    if (myPublicKey) publicKeyToSocket.delete(myPublicKey)
  })
})

const PORT = process.env.PORT || 8787
server.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on port", PORT)
})
