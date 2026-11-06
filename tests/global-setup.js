// Runs in the parent process before Jest workers start, so they inherit it.
// server.js sets the same TZ at boot, but inside Jest's sandbox that
// assignment doesn't reach V8.
module.exports = async () => {
    process.env.TZ = 'Europe/Zurich';
};
