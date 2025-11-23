import { Server } from "socket.io";

const io = new Server(8787, {
  cors: { origin: "*" },
});

const publicKeyToSocket = new Map();

io.on("connection", (socket) => {
  let myPublicKey = null;

  socket.on("hello", (publicKey) => {
    myPublicKey = publicKey;
    publicKeyToSocket.set(publicKey, socket.id);
    socket.emit("hello-ok", publicKey);
  });

  socket.on("msg", ({ to, data }) => {
    const target = publicKeyToSocket.get(to);
    if (!target) {
      return;
    }

    io.to(target).emit("msg", {
      from: myPublicKey,
      data,
    });
  });

  socket.on("disconnect", () => {
    if (myPublicKey) publicKeyToSocket.delete(myPublicKey);
  });
});
