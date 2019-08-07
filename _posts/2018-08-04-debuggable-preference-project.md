---
layout: post
series: Cocoa 速记
title: 配置一个可调试的偏好设置面板项目
tags: [cocoa, macos, swift, preferencepanel, appkit, xcode]
lang: zh
---

在 Xcode 中创建一个偏好设置面板项目时，你会发现这个项目时无法运行的。你虽然可以使用 Console.app 来显示你的 NSLog 输出，但这失去了 Xcode 实时调试的优势。

其实，我们是可以为设置面板添加可执行的。

在 Xcode 中:

1. 选择 *Product* → *Scheme* → *Edit Scheme...*
2. 在弹出的面板左上角选中你的偏好设置面板 Target
3. 在左栏选择 *Run*
4. 在右栏 *Info* → *Executable* 下拉框中选择 *Other...*
5. 找到并选择你的系统偏好设置，它一般位于 `~/Applications/System Preferences.app`
6. 关闭面板

现在，当你运行项目时，系统偏好设置将被打开。首次打开将会提示安装你的面板，往后，只要你进入你的面板，便可以开始使用 Xcode 进行调试。

> 你需要关闭系统 SIP 才能使用这一方法。
> 
> 1. 关闭或重启电脑
> 2. 电脑启动时，按住 `⌘R` 不松开，进入 Recovery 模式
> 3. 进入 Recovery 模式后，选择语言，在上方菜单栏中的 **工具** 一项中选择 **终端**
> 4. 在终端中输入 `csrutil disable`
> 5. 重启
>
> 你可以在开发完成后重新开启 SIP。重复上面的操作，在第 4 步时，输入 `csrutil enable`。

> 如果你不嫌烦的话，通过 *Debug* → *Attach To Process* 连上 System Preferences.app 也是可行的。当然，这也要求你关闭 SIP。
