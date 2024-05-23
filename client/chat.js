import { io } from "https://cdn.socket.io/4.3.2/socket.io.esm.min.js";

const getUsername = async () => {
  let username = localStorage.getItem("username");
  if (!username) {
    const res = await fetch(
      "https://random-data-api.com/api/users/random_user"
    );
    const { username: randomUsername } = await res.json();
    username = randomUsername;
    localStorage.setItem("username", username);
  }
  return username;
};

const username = await getUsername();

const socket = io({
  auth: {
    username: username,
    serverOffset: 0,
  },
});

const form = document.getElementById("form");
const input = document.getElementById("input");
const sendButton = document.getElementById("sendButton");
const messages = document.getElementById("messages");

// Cargar el elemento de audio
const messageSound = new Audio("./notificationSound.mp3");

function scrollToBottom() {
  messages.scrollTop = messages.scrollHeight;
}

input.addEventListener("input", () => {
  sendButton.style.color = input.value.trim() === "" ? "#5c5c5c" : "black";
});

socket.on("chat message", (msg, serverOffset, messageUser) => {
  const isCurrentUser = messageUser === username;
  const itemClass = isCurrentUser ? "my-message" : "other-message";

  // Crear un nuevo elemento <li>
  const listItem = document.createElement("li");
  // Asignar la clase correspondiente al nuevo elemento
  listItem.className = itemClass;
  // Crear un nodo de texto para el contenido del mensaje
  const textNode = document.createTextNode(msg);
  // Adjuntar el nodo de texto al elemento <li>
  listItem.appendChild(textNode);
  // Agregar el nuevo elemento <li> al contenedor de mensajes
  messages.appendChild(listItem);

  // Solo reproducir el sonido de notificación si el mensaje no fue enviado por el usuario actual
  if (!isCurrentUser) {
    playMessageSound();
  }

  socket.auth.serverOffset = serverOffset;
  scrollToBottom();
});

form.addEventListener("submit", (e) => {
  e.preventDefault();
  if (input.value) {
    socket.emit("chat message", input.value, username);
    input.value = "";
    scrollToBottom();
  }
});

// Función para reproducir el sonido de notificación
function playMessageSound() {
  messageSound.play();
}
