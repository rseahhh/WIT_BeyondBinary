const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("api", {
  sendCommand: async (text) => {
    const res = await fetch("http://127.0.0.1:8000/command", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text })
    });
    return await res.json();
  }
});
