const superagent = require('superagent')
require('superagent-proxy')(superagent);
const apiFunc = require('./common/apiFunc')
const fs = require('fs')
const async = require('async')

// 获取bilibili API的json数据
let jsonUrl = 'http://h.bilibili.com/wallpaperApi?action=getOptions&page=1'
let proxy = "http://218.201.98.196:3128"

let getPicJson = function() {
  return new Promise((resolve, reject) => {
    superagent
    .get(jsonUrl)
    .proxy(proxy)
    .end((err, res) => {
      if (err) console.log('代理出错啦')
      if (res === undefined) return
      if (res.statusCode == 200) {
        let json = JSON.parse(res.text)
        resolve(json)
        console.log(json.length)
      }
    })    
  })
}

let dealPicJson = async function() {
  let picUrlJson = []
  let picJson = await getPicJson()
  let picLength = picJson.length
  for(let i = 1; i < picLength; i++) {
    let item = {}
    item.title = picJson[i].detail[0].title
    item.url = picJson[i].detail[0].il_file
    item.format = item.url.match(/.{3}$/)[0]
    picUrlJson.push(item)
  }
  return picUrlJson
}


let downloadImg = async function () {
  console.log('开始下载图片...');
  let downloadCount = 0;
  var concurrencyCount = 0;
  let q = async.queue(function (image, callback) {
      // console.log('正在下载 : ' + image.title);
      var delay = parseInt((Math.random() * 30000000) % 1000, 10);  //设置延时并发爬取
      concurrencyCount++;
      console.log('现在的并发数是', concurrencyCount, '，正在抓取的是', image.title, '延迟' , delay, '毫秒');
      superagent.get(image.url).proxy(proxy).end(function (err, res) {
          if (err) {
              console.log(err);
              callback(null);
          } else {
              downloadCount++;
              fs.writeFile(`./pic-Thumbnails/${downloadCount}-${image.title}.${image.format}`, res.body, function (err) {
                  if (err) {
                      console.log(err);
                  } else {
                      console.log("图片下载成功");
                  }
                  setTimeout(() => {
                    concurrencyCount--;
                    callback(null);
                  }, delay)              
              });
          }
      });
  }, 5);
  /**
   * 监听：当所有任务都执行完以后，将调用该函数
   */
  q.drain = function () {
      console.log('All img download');
  }
  let imgList = await dealPicJson();
  q.push(imgList);//将所有任务加入队列
}

downloadImg()

// let filterIp = function(ip) {
//     superagent.get('http://h.bilibili.com/wallpaperApi?action=getOptions&page=1').proxy(ip).timeout(3000)
//     .end((err, res) => {
//       if (err) console.log('出错啦')
//       if (res === undefined) return
//       if (res.statusCode == 200) {
//         var aa = JSON.parse(res.text)
//         console.log(aa.length)
//       }
//     })

// }
// ip = "http://218.201.98.196:3128"

// filterIp(ip)