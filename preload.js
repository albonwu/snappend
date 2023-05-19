const { ipcRenderer } = require('electron');

window.addEventListener('DOMContentLoaded', () => {
  const authButton = document.getElementById('authorize');
  authButton.addEventListener("click", function () {
    ipcRenderer.send("auth");
  });

  const modal = document.getElementById("instructions");
  ipcRenderer.on("finishedAuth", () => {
    modal.style.display = "none";
  })
  
  const enqueueButton = document.getElementById("enqueue");
  enqueueButton.addEventListener("click", function () {
    ipcRenderer.send("enqueue");
  })
});
