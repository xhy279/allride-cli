# allride-cli

简单的脚手架生成的命令行工具，支持可插拔的template。也是个人学习的一个实践，后续功能正在学习开发中。。。
<hr />

##  Install
```bash
npm install -g @allride-cli/core
```

## Usage
```bash
allride-cli init [projectName] [options]  #projectName 和 options都是可选项 
```


available options currently supported:  

```
Options:
  -V, --version                   output the version number
  -d, --debug                     是否开启调试模式 (default: true)
  -tp, --targetPath <targetPath>  是否指定本地调试文件路径 (default: "")
  -h, --help                      display help for command
```

模板目前支持正在使用的umiJS和[vue-element-admin](https://github.com/PanJiaChen/vue-element-admin)(基于vue的一个很全的后台管理界面开发框架)。

模板及相应的api目前维护在单独的项目中[allride-cli-template](https://github.com/xhy279/allride-cli-template)

