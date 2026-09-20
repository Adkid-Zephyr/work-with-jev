#!/bin/zsh
cd "${0:A:h}"
if ! command -v node >/dev/null; then
  echo '请先安装 Node.js 22.9 或以上。'
  read '?按回车退出'
  exit 1
fi
if [[ ! -d node_modules ]]; then
  npm install || exit 1
fi
npm start
