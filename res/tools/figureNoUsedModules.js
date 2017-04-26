const res = require('../../public/modules.nocommon.json')

let noUsedModules = res.modules
  .filter(m => !m.chunks || m.chunks.length === 0)
  .map(m => m.name)

console.log(noUsedModules)
