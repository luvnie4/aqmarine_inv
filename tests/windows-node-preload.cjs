// Some Windows Node builds can fail in os.userInfo() before tsx starts.
// tsx prefers geteuid when present, so provide a stable test-only fallback.
if (process.platform === 'win32' && typeof process.geteuid !== 'function') {
  process.geteuid = () => 0;
}
