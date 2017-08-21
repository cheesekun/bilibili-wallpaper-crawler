const superagent = require('superagent')
const cheerio = require('cheerio')
const fs = require('fs')
const apiFunc = require('../common/apiFunc')
// const ips = require('./ip.json')
// console.log(ips)  // json可以直接读取，js不行

// 爬取开心代理的 ip
const website = 'http://www.kxdaili.com'
let url = website + '/dailiip/1/'

// 总执行函数
let getIp = async function() {
  // promise 存放的数组
  let tasks = []

  // 读取 ip.js 本身存储的ip
  let ips = await apiFunc.readFile('./ip.js')
  ips = JSON.parse(ips)

  for(let page = 1; page <= 10; page++) {
    let res = await superagent.get(url + page +'.html')
    let $ = cheerio.load(res.text)
    let tr = $('tbody>tr')

    for(let i = 0; i < tr.length; i++) {
      let td = $(tr[i]).children('td')
      let proxy = 'http://' + $(td[0]).text() + ':' + $(td[1]).text()
      let pro = apiFunc.filterIp(proxy)

      // 将所有的IP过滤Promise存入一个tasks数组中
      tasks.push(pro)
    }
  }

  // 使用 all 等待所有ip过滤完毕后执行 写入 ip.js过程
  Promise.all(tasks).then((arr) => {
    let usefulIp = arr.filter((item) => {
      return (item !== undefined)
    })
    ips = JSON.stringify(ips.concat(usefulIp))
    console.log(ips)
    apiFunc.writeFile('./ip.js', ips)   
  })
}

getIp()

module.exports = getIp