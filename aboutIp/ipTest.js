const superagent = require('superagent')
require('superagent-proxy')(superagent);

// 写上你先要测试的 ip
let testIp = 'http://218.201.98.196:3128';

(async function() {
  superagent.get('http://ip.chinaz.com/getip.aspx').proxy(testIp).timeout(3000)
  .end((err, res) => {
    if(res === undefined) {
      console.log('挂了'); 
      return 
    }
    if(err) {
      console.log('异常产生')
    }
    console.log('成功： ' + res.text)
  })
}())