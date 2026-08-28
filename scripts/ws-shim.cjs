const g = typeof globalThis !== "undefined" ? globalThis : {};
const ws = g.WebSocket || class {};
module.exports = { WebSocket: ws };