---
layout: post
title:  "Achieves for macdev.io Forum"
date:   2017-03-26 22:05:00
categories: achieves
---

## 目录

{:TOC}

## NSTableView

### 如何动态更改行顺序

如何实现如 QQ 中当接收到新消息时该好友移动到最顶部？

>  `NSTableView` 有以下方法：
>
>  ```swift
>  func moveRow(at: Int, to: Int)
>  // Moves the specified row to the new row location using animation.
>  ```

> 参阅：[NSTableView](https://developer.apple.com/reference/appkit/nstableview)
>
> 原文：[NSTableView如何实现某个Cell动态滚动到顶部位置](https://ask.macdev.io/?thread-15.htm)



## NSWindow

### 为程序添加登陆窗口

如何实现如 QQ 中登录框在的时候，关闭登录框关闭程序。在主界面的时候关闭不关闭程序，并且点击Dock图标打开主界面？

> 你需要两个窗口，一个是登陆窗口，另一个是主窗口。
>
> 假设这两个窗口都在 Storyboard 里有定义。在你的 AppDelegate 中，你需要两个变量来存储你的窗口：
>
> ```swift
> class AppDelegate: NSObject, NApplicationDelegate {
>     var mainWindow: NSWindow? // 主窗口
>     var loginWindowController: LoginWindowColtroller? // 登陆窗口
>
>     func applicationWillFinishLaunching(_ notification: Notification) {
>         // 尽快地隐藏你的主窗口
>         mainWindow = NSApplication.shared().windows.first
>         if let mainWindow = mainWindow {
>             mainWindow.close()
>         }
>
>         // 显示你的登陆窗口
>         let storyboard = NSStoryboard(name: "Main", bundle: nil)
>         loginWindowColtroller = storyboard.instantiateController(withIdentifier: "loginWindowController") as? LoginWindowController
>         loginWindowColtroller?.showWindow(nil)
>     }
>
>     // 这里用于实现点击 dock 图标打开主窗口
>     func applicationShouldHandleReopen(_ sender: NSApplication, hasVisibleWindows flag: Bool) -> Bool {
>         if flag {
>             return false
>         } else {
>             mainWindow = NSApplication.shared().windows.first
>             mainWindow?.makeKeyAndOrderFront(self)
>             return true
>         }
>     }
> }
> ```
>
> 登陆窗口实现关闭窗口时退出程序：
>
> ```swift
> class func LoginWindowController: NSWindowController {
>   override func windowDidLoad() {
>     // 指定关闭按钮的关闭事件
>     window?.standWindowButton(.closeButton)?.target = self
>     window?.standWindowButton(.closeButton)?.action = #selector(closeAction)
>   }
>   
>   @objc func closeAction() {
>     NSApplication.shared().terminate(self)
>   }
> }
> ```
>
> 在进行验证后，执行以下代码显示主窗口并隐藏登陆窗口：
>
> ```swift
> class LoginViewController: NSViewController {
>   @IBAction func login(_ sender: NSButton) {
>     let appDelegate = NSApplication.shared().delegate as! AppDelegate
>     appDelegate.mainWindow?.makeKeyAndOrderFront(nil) // 显示主窗口
>     self.view.window?.close() // 隐藏登陆窗口
>   }
> }
> ```

> 参阅：[Adding a login window to mac os x app](https://sqllyw.wordpress.com/2013/09/29/adding-a-login-window-to-mac-os-x-app/)
>
> 原文：[怎么实现QQ的多开账号](https://ask.macdev.io/?thread-2.htm)



## NSSplitViewController 

### 如何在splitItemController里获取其他splitItemController

> ```objective-c
> NSSplitViewController * controller = (NSSplitViewController *)self.view.window.contentViewController;
> NSArray * itemArray = controller.splitViewItems;
> NSSplitViewItem * item = itemArray[1];
> NSViewController * VC =  item.viewController;
> ```
>
> 或者：
>
> ```swift
> if let parentSplitViewController = self.parent as? NSSplitViewController ?? nil {
>     let vc = parentSplitViewController.splitViewItems[1].viewController
> }
> ```

> 原文：[在NSSplitViewController的item1对应的控制器中 如何获取NSSplitViewController中item2对应的控制器呢?](https://ask.macdev.io/?thread-10.htm)

## NSTask

### 如何实现应用多开

Q: 如何实现如 QQ 可同时登陆多个账号的功能？

> 参阅：[Mac开发App多开](http://www.jianshu.com/p/0096fc7cbde9)
>
> 原文：[怎么实现QQ的多开账号](https://ask.macdev.io/?thread-2.htm)



## NSAlert

### 在 NSAlert 中获取 NSWindow

> 用 `alert.runModal()`

> 原文：[alert with NSWindowController](https://ask.macdev.io/?thread-13.htm)

## Animation

### CABasicAnimation平移动画结束后不接收点击事件

>`removedOnCompletion = NO` 这句代码阻隔了你的 View 对鼠标事件进行响应。根据[这里](http://stackoverflow.com/a/13655535/6692025)的说法：
>
>> CAAnimation 对象实际上并没有改变应用了动态效果的对象的属性，而是将属性应用在新画出来的用于展示效果的图层上。 当你创建动画并应用 removedOnCompletion = NO 时， 这个用于展示的图层不会消失，但其原本的 View 的属性并没有发生任何变化。换句话说，移动 View 的图层并没有移动 View 本身。所以在新的位置显示的图层当然也不会响应任何事件。
>
>如果你仍然想要使用 CAAnimation，可以：
>
>1. 去掉 removedOnCompletion = NO
>2. 在动画结束时更新 View 的 frame 至新位置

> 参阅：[NSView Does Not Respond To Mouse Events After CABasicAnimation](http://stackoverflow.com/questions/13651591/nsview-does-not-respond-to-mouse-events-after-cabasicanimation)
>
> 原文：[CABasicAnimation平移动画结束后,按钮以及cell不接收点击事件](https://ask.macdev.io/?thread-4.htm)

### NSAnimation 执行一系列动作

> ```swift
> NSAniamtionContext.beginGrouping()
> /* Your animator code here */
> NSAnimationContext.endGrouping()
> ```

> 原文：[splitViewItems在折叠过程中能不能获取折叠过程](https://ask.macdev.io/?thread-7.htm)



## 本地化

### 设置 NSOpenPanel 按钮文本

> 1. 打开你的项目设置
> 2. 在 PROJECT 中选中你的项目
> 3. 在右侧 Info 标签中，找到 Localizations
> 4. 点击加号，添加 Chinese (Simplified)

> 参阅：[Build Apps for the World](https://developer.apple.com/internationalization/)
>
> 原文：[NSOpenPanel怎么设置取消按钮文字](https://ask.macdev.io/?thread-3.htm)

