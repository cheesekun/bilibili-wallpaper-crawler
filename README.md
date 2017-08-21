## 前言
之前初学`node`的时候，有用爬虫爬过一些磁力链接
详情见[羞羞的node爬虫](https://segmentfault.com/a/1190000009598820)
但是没有并发，没有代理，那时也对异步不是很了解
所以这次又写了个爬虫，爬取[bilibili壁纸站](http://h.bilibili.com/wallpaper?action=list)的所有壁纸
并且爬取[开心代理](http://www.kxdaili.com/dailiip/1/1.html#ip)的100条ip，并将有用的ip存进json文件中

## 用到的模块
1. async  （控制并发）
2. cheerio  （解析DOM）
3. superagent  （http库）
4. superagent-proxy  （使用代理）
5. fs  （读写文件）

其中`cheerio`, `superagent`的具体用法见我之前的 [羞羞的node爬虫](https://segmentfault.com/
a/1190000009598820)
不过之前初学，代码写得很难看就对了

## 爬取代理ip
> 代理ip是干嘛的

我们访问互联网资源时，都是用我们自己的ip（身份证）去访问的
而爬虫得频繁地去获取互联网资源
因此如果你在某个时间点频繁地访问某网站的某资源
造成该网站的服务器压力
就有可能被网站管理者禁ip， 从而访问不了该网站
代理ip就是伪造身份去访问

> 怎么检验ip的可用性

这里面就使用到了 `superagent` 的一个拓展 `superagent-proxy`
然后用其去访问[http://ip.chinaz.com/getip.aspx](http://ip.chinaz.com/getip.aspx)
若 3s 内能返回值，则证明该 ip 可用
```javascript
const superagent = require('superagent')
require('superagent-proxy')(superagent);

// 写上你先要测试的 ip，下面仅为测试ip
let testIp = 'http://61.178.238.122:63000';

(async function() {
  superagent.get('http://ip.chinaz.com/getip.aspx').proxy(testIp).timeout(3000)
  .end((err, res) => {
    if(res === undefined) {
      console.log('挂了'); 
      return 
    }
    if(err) {
      console.log('报错啦')
    }
    console.log('成功： ' + res.text)
  })
}())
```

> 爬取ip并存储

首先我们先看下我们要爬取的[开心代理](http://www.kxdaili.com/dailiip/1/1.html)的DOM
![](http://old5ohki5.bkt.clouddn.com/pc1.png)

我们要爬取得ip地址放在tr 标签的第一个td上
并且点击第二页时，链接变为`http://www.kxdaili.com/dailiip/1/2.html#ip`
链接上的数组表示得是页数，也就是说我们只要改变链接上数字的值
就可以获取到其他页的html

代码如下：
```javascript
const superagent = require('superagent')
const cheerio = require('cheerio')
const fs = require('fs')
const apiFunc = require('../common/apiFunc')  // 封装的一些读写api

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
	// 过滤掉返回值为 undefined 的数据
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
```

## 爬取bilibili壁纸站
我们先进入[bilibili壁纸站](http://h.bilibili.com/wallpaper?action=list)
![](http://old5ohki5.bkt.clouddn.com/pc2.png)

发现有一个点击加载更多的按钮
如果有对前端有了解的话，我们应该知道这是通过 `ajax` 请求来异步获取数据
因此我们打开开发者的`NetWork`
![](http://old5ohki5.bkt.clouddn.com/pc3.png)

果然在 `XHR` 这一栏发现了一个api
里面返回的是存储了当前页面所有壁纸缩略图信息的json文件
仅依靠这个json文件，我们便可以爬取所有壁纸的缩略图
可我们要的可是高清大图啊
![](http://ww1.sinaimg.cn/large/9150e4e5gw1faqlx49hqjj205i05imxb.jpg)

于是我们随意点击一张缩略图
![](http://old5ohki5.bkt.clouddn.com/pc4.png)
发现它的url的参数（il_id, width, height）都来自我们之前获取的json内的数据
也就是说我们可以拼接该链接来获取到该高清图片的链接，再利用`cheerio`来解析DOM获取图片地址就ok了
！！！
！！！
！！！
然而，哈哈哈哈哈哈哈哈哈哈哈哈
当我们获取到该网页的html后，发现该`<img>`标签内的`src`是空的
也就是说该`<img>`也是js赋值，所以下意识又去看了`NetWork`的`XHR`	
果然发现了另一个api
![](http://old5ohki5.bkt.clouddn.com/pc5.png)

而高清图片的url就是该`api`返回的json数据中的`il_file`

因此我们只需要拼接该api链接，再用`superagent`请求就可以获取到高清图片的`url`

> 理下思路

1. 获取缩略图api返回的包含高清图片数据的json
2. 将1的json数据拼接到高清图片api链接上，并将所有api链接存入数组
3. 并发获取2数组中的api， 获取所有的图片url，并将url存入数组
4. 并发下载数组中的图片url， 存进本地文件夹

结果在爬取`bilibili壁纸站`时，是不需要解析DOM的，也就是不需要使用`cheerio`模块啦

代码如下：
```javascript
const superagent = require('superagent')
require('superagent-proxy')(superagent);
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
  
  // 当所有任务都执行完以后，将调用该函数
  q.drain = function () {
    console.log('All img download');
  }
  let imgList = await dealPicJson();
  q.push(imgList);//将所有任务加入队列
}

downloadImg()
```

## async控制并发
控制并发我通常是用`async.maplimit`，因为最早接触
不过看到一篇文章介绍了`async.queue`，我就试了下
区别在于， `mapLimit`会返回所有并发任务结束后的结果数组
而`queue`是没有的，因此要自己定个变量来存放每一个并发任务返回的结果
具体api用法见： [async常用api](http://blog.csdn.net/marujunyy/article/details/8695205)

## 运行结果
![](http://old5ohki5.bkt.clouddn.com/pc7.png)
![](http://old5ohki5.bkt.clouddn.com/pc6.png)

## 后记
github代码： [bilibili壁纸站爬虫]()
里面有一些必要注释
有4个可以跑的js
1. ./aboutIp/getIp.js （用来抓并存有用的代理ip）
2. ./aboutIp/ipTest.js （测试ip可不可用）
3. app-thumbnails.js （用来爬壁纸的缩略图）
4. app-hd.js （用来爬壁纸的高清图）
 

虽然懂得很浅，但能渐渐感受到爬虫的魅力了😁
