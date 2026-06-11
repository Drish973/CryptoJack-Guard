// shared/signatures.js

// Global signatures array for sharing across environments (Content Scripts, Service Worker, Popup)
var KNOWN_MINER_URLS = [
  'coinhive.com/lib/coinhive.min.js',
  'coin-hive.com',
  'cryptoloot.pro',
  'cryptoloot.co',
  'jse.cc/jse.js',
  'load.jsecoin.com',
  'miner.pr0gramm.com',
  'minero.cc',
  'webmine.cz',
  'cnhv.co',
  'coin-have.com',
  'crypto-loot.com',
  'authedmine.com',
  'coinhive.js'
];

var KNOWN_MINER_WASM_STRINGS = [
  'cryptonight',
  'stratum+tcp',
  'mining.submit',
  'getwork',
  'cn-slow',
  'cn-heavy',
  'cn/r',
  'rx/0', // RandomX
  'rx/wow'
];
