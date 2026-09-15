// The managed Windows sandbox can deny uv_os_get_passwd; tsx only needs a temp-folder suffix.
require('node:os').userInfo = () => ({ username: 'codex', uid: -1, gid: -1, shell: null, homedir: process.cwd() });
