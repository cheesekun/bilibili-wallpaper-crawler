const fs = require('fs')
const superagent = require('superagent')
require('superagent-proxy')(superagent);

const readFile = function (fileName) {
  return new Promise(function (resolve, reject) {
    fs.readFile(fileName, 'utf8', function (error, data) {
      if (error) return reject('出错啦' + error);
      resolve(data);
    });
  });
};

const writeFile = async function (fileName, content) {
  let result = new Promise((resolve, reject) => {
    fs.writeFile(fileName, content, 'utf8', (err) => {
      if(err) {
        reject(`产生异常， ${fileName} 写入失败`)
      }
        resolve(`${fileName} 写入成功`)
    })
  })
  let info = await result
  console.log(info)
}

// 过滤掉无用的 ip
let filterIp = function(ip) {
  return new Promise((resolve, reject) => {
    superagent.get('http://ip.chinaz.com/getip.aspx').proxy(ip).timeout(3000)
    .end((err, res) => {
      if (err) resolve()
      if (res === undefined) return
      if (res.statusCode == 200) {
        resolve(ip);
      }
    })
  })
}

module.exports = {
  readFile,
  writeFile,
  filterIp
}

