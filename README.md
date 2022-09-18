# 怎么用这些脚本？
首先你需要在浏览器安装 **油猴插件**  
在油猴的 **管理面板** 中新建用户脚本  
复制本仓库的脚本源码，全部粘贴至新建脚本中

### **遇到bug 欢迎 提交issues
***

# 脚本说明（部分）

## [上师大助手.js](上师大助手.js)
**健康之路自动填报**   
进入 https://yqfk.shnu.edu.cn/Default.aspx 后自动填写提交  
如果不想自动提交，可以在28行代码前加上`//`，将这行代码注释   
>如果想每天按时填报的话，可以使用window自带的计划任务功能，建议搜索关键词`定时打开网页`  
定时任务会自动打开填报网页，打开网页后脚本将自动填写提交

**学习通直达**  
http://shnu.fy.chaoxing.com/portal 默认为cas登录  
**统一认证登录**  
https://cas.shnu.edu.cn/cas/login?service=* 根据历史用户密码自动登录  
**教务系统定位至课表**：  
打开 https://course.shnu.edu.cn/eams/home.action 直接转到课表  
如果网页显示操作过快，可以修改65行的数字`300`  

## [学习通网课助手.js](学习通网课助手.js)
**刷网课**  
自动跳转下一节    
76行表示4倍数播放  
到视频最后几秒会自动恢复1倍数  
**模拟阅读**  
适用于需要阅读一定时间的网页，需要网页链接包含`ztnodedetailcontroller`  
82行表示每过1-2min页面滚动一次  
85行表示每次滚动都有10%的概率跳转到新章节中

## [隐藏bilibili广告.js](隐藏bilibili广告.js)
删除广告类型见19-24行，如果不想删除广告可以在相应代码行前加`//`

## [全局功能.js](全局功能.js)
**设计模式**  
网页右下角出现设计模式开关，可以随时打开设计模式  
**删除广告**  
删除广告类型见56-59行  
支持删除百度和bing的搜索结果广告、各种谷歌广告、知乎首页广告  
**选择复制**  
选择内容 - Ctrl+C  
可无视知网线上阅读文献的复制字数限制  