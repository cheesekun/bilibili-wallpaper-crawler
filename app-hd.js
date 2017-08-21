const superagent = require('superagent')
require('superagent-proxy')(superagent);
const apiFunc = require('./common/apiFunc')
const fs = require('fs')
const cheerio = require('cheerio')
const async = require('async')

// 获取bilibili API的json数据
let jsonUrl = 'http://h.bilibili.com/wallpaperApi?action=getOptions&page=1'
let proxy = "http://218.201.98.196:3128"

let getPicJson = function () {
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
        }
      })
  })
}

// 获取高清图片api的json数据
let dealHd = async function () {
  let picHd = []
  let picJson = await getPicJson()
  let picLength = picJson.length

  for (let i = 1; i < picLength; i++) {
    let item = {}
    // let width = picJson[i].detail[0].width
    // let height = picJson[i].detail[0].height
    let il_id = picJson[i].detail[0].il_id
    item.title = picJson[i].detail[0].title
    item.url = `http://h.bilibili.com/wallpaperApi?action=getDetail&il_id=${il_id}`
    picHd.push(item)
    // item.url = `http://h.bilibili.com/wallpaper?action=detail&il_id=${il_id}&type=Bilibili&width=${width}&height=${height}`
    // picHtmlJson.push(item)
  }
  return picHd
}

// 获取高清图片的url ===== queue
let dealPicJson = async function () {

  console.log('获取高清图片url，开始执行....')
  var concurrencyCount = 0;
  let result = []
  let hdJson = await dealHd()
  return new Promise((resolve, reject) => {

    let q = async.queue((hDJson, callback) => {
      var delay = parseInt((Math.random() * 30000000) % 1000, 10);  //设置延时并发爬取
      concurrencyCount++;
      console.log('现在的并发数是', concurrencyCount, '，正在获取的是', hDJson.title, '延迟', delay, '毫秒');

      superagent.get(hDJson.url).proxy(proxy).end((err, res) => {
        if (err) {
          console.log(err);
          callback(null);
        } else {
          // let $ = cheerio.load(res.text)
          // let hdUrl = $('#wallpaper').attr('id')
          // console.log('链接是' + hdUrl)
          let pic = {}
          pic.title = hDJson.title
          pic.url = res.body[0].detail[0].il_file
          pic.format = pic.url.match(/.{3}$/)[0]
          // console.log(result)

          result.push(pic)
          concurrencyCount --
          callback(null)
        }
      })
    }, 5)
    q.drain = function () {
      resolve(result)
    }

    q.push(hdJson)
  })
}


// 下载HD图片
let downloadImg = async function () {
  console.log('开始下载图片...');
  // let folder = `Data/img-${Config.currentImgType}-${Config.startPage}-${Config.endPage}`;
  // fs.mkdirSync(folder);
  let downloadCount = 0;
  var concurrencyCount = 0;
  let q = async.queue(function (image, callback) {
    // console.log('正在下载 : ' + image.title);
    var delay = parseInt((Math.random() * 30000000) % 1000, 10);  //设置延时并发爬取
    concurrencyCount++;
    console.log('现在的并发数是', concurrencyCount, '，正在抓取的是', image.title, '延迟', delay, '毫秒');
    superagent.get(image.url).proxy(proxy).end(function (err, res) {
      if (err) {
        console.log(err);
        callback(null);
      } else {
        downloadCount++;
        fs.writeFile(`./picture/${downloadCount}-${image.title}.${image.format}`, res.body, function (err) {
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
