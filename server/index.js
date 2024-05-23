import express from "express";
import logger from "morgan";
import dotenv from "dotenv";
import { createClient } from "@libsql/client";
import { Server } from "socket.io";
import { createServer } from "node:http";

dotenv.config();
const port = process.env.PORT ?? 3000;

const app = express();
const server = createServer(app);
const io = new Server(server, {
  connectionStateRecovery: {},
});

const db = createClient({
  url: "libsql://modest-joystick-xskulairx.turso.io",
  authToken: process.env.DB_TOKEN,
});

await db.execute(`
  CREATE TABLE IF NOT EXISTS messages(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT,
    user TEXT
  )
`);

io.on("connection", async (socket) => {
  console.log("A user has connected!");

  socket.on("disconnect", () => {
    console.log("A user has disconnected");
  });

  socket.on("chat message", async (msg, username) => {
    let result;
    try {
      result = await db.execute({
        sql: `INSERT INTO messages (content, user) VALUES (:msg, :user)`,
        args: { msg, user: username },
      });
    } catch (e) {
      console.error(e);
      return;
    }

    io.emit("chat message", msg, result.lastInsertRowid.toString(), username);
  });

  if (!socket.recovered) {
    try {
      const results = await db.execute({
        sql: "SELECT id, content, user FROM messages WHERE id > ?",
        args: [socket.handshake.auth.serverOffset ?? 0],
      });

      results.rows.forEach((row) => {
        socket.emit("chat message", row.content, row.id.toString(), row.user);
      });
    } catch (e) {
      console.error(e);
    }
  }
});

app.use(express.static("client"));
app.use(logger("dev"));

app.get("/", (req, res) => {
  res.sendFile(process.cwd() + "/client/index.html");
});

server.listen(port, () => {
  console.log(`Server on port ${port}`);
});
