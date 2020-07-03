---
layout: post
series: Cocoa Touch 速记
title: 搭配标签栏控制器使用分栏视图控制器
tags: [uikit, ios, uisplitviewcontroller, swift]
lang: zh
---

有一种不太常见的场景，类似 Telegram、微信这类内容比较多的程序，会使用 `UITabBarController` 和 `UISplitViewController` 来管理实现整体的视图结构。这里主分栏有两种实现思路，一种是用导航控制器嵌套标签栏控制器，另一种是用标签栏控制器嵌套多个导航控制器。

前者是比较常见也比较容易实现的，但随着你的程序功能的不断增加，需求的不断变更，你可能会发现，公用一个导航控制器并不是一个好的主意。

本文我们就来用一个例子，讲讲另一种使用分栏视图控制器的思路。

> 从 iOS 14 / iPadOS 14 起，苹果介绍了新的 `UISplitViewController` API，您应该查看新的设计规范来进行设计与实现。
{:.info}

## 概念

![](/assets/img/20062701.svg)
*主分栏为使用标签栏控制器嵌套多个导航栈的分栏结构*

我们这次的例子会以标签栏控制器管理的所有子控制器都为 `UINavigationController` 类对象的前提进行。

在我们的设计中，除了基本的分栏行为以外，我们认为，详情分栏应该总是显示导航控制器，且导航控制器的根视图总是某个占位用的视图控制器。也就是说，我们允许回退到无选中项的状态。这么做的好处是，在这个基础上，我们可以通过设置导航栏返回按钮的显隐，很容易地在允许或不允许这一行为之间进行切换。

此外，在切换主分栏标签页时，详情分栏的视图应该可以跟随切换。

我们下面会逐个来实现。

## 创建 `UISplitViewController` 子类

出于开发 macOS 的习惯，对于这种需要比较多代码进行定制的类，我一般都会使用创建子类进行封装的方法。当然，本文更多的是给大家参考，重写并不是强制的。

我们来创建一个 `SplitViewController` 子类：

```swift
class SplitViewController: UISplitViewController {
    init(primary: UITabBarController, placeholderProvider: @escaping () -> Placeholder) {
        self.makePlaceholder = placeholderProvider
        super.init(nibName: nil, bundle: nil)
        self.delegate = self
        self.viewcontrollers = [primary, makeSecondaryStack()]
    }

    private let makePlaceholder: () -> Placeholder

    private func makeSecondaryStack() -> UINavigationController {
        UINavigationController(rootViewController: makePlaceholder())
    }
}
```

在这里，我们提供了一个 `init(primary:placeholderProvider:)` 构造方法。`primary` 参数传入的是一个用在主分栏的视图控制器，我们将参数的类型固定为 `UITabBarController`，因为我们这个例子只针对主分栏为 `UITabBarController` 的情况。`placeholderProvider` 传入的是一个创建占位视图控制器的闭包，我们使用这个闭包来在必要的时候创建详情页的根占位视图控制器。

而 `Placeholder` 类是一个 `UIViewController` 子类，我们在后面会对它进行一些小定制。

```swift
extension SplitViewController {
    class Placeholder: UIViewController { }
}
```

> 在 `makeSecondaryStack()` 方法中，示例的代码直接将闭包的结果作为根视图来创建导航控制器。在实际的代码中，你应该稍加判断，避免将导航控制器推入导航控制器的情况发生而造成异常抛出。

## 变更默认显示详情视图控制器的行为

我们首先会遇到一个问题：在使用 `showDetailViewController(_:sender:)` 方法显示详情视图的时候，分栏情况下它会直接替换我们的导航栏，而单栏情况下却是直接用 page sheet 的形式显示出来。

![](/assets/img/20062702.gif)

我们先来讲讲 `showDetailViewController(_:sender:)` 方法具体都做了些什么。这个方法会自动选择一种最适合当前界面的方式来显示传入的视图控制器：

在紧凑环境下，如果主视图控制器是一个 `UINavigationController` 或其子类，它会将该视图控制器推入这个导航控制器，否则，就调用 `present(_:animated:completion:)` 来显示。而在分栏环境下，它会直接替换详情栏的顶级视图控制器。

很显然，我们的需求完美的绕过了这些情况。因此，我们需要修改它的默认行为。

在调用 `showDetailViewController(_:sender:)` 的时候，它会先调用分栏视图的代理方法 `splitViewController(_:showDetail:sender:)`，允许我们提供质自定义实现：

```swift
func splitViewController(_ splitViewController: UISplitViewController, showDetail vc: UIViewController, sender: Any?) -> Bool {
    if splitViewController.isCollapsed {
        guard
            let tabBarController = viewControllers.first as? UITabBarController,
            let navController = tabBarController.selectedViewController as? UINavigationController
        else { return false }
        
        navController.pushViewController(vc, animated: true)
    } else {
        guard
            let navController = viewControllers.last as? UINavigationController
        else { return false }
        
        let isPlaceholderTop = navController.topViewController is Placeholder
        
        if !isPlaceholderTop {
            navController.popToRootViewController(animated: false)
        }
        
        navController.pushViewController(vc, animated: isPlaceholderTop)
    }
    
    return true
}
```

在紧凑环境下，我们尝试找到主栏中标签栏控制器显示的当前导航栏控制器，并将视图控制器推入改导航栈。

而在分栏环境下，我们判断详情栏的导航栈当前显示的是不是占位用的控制器，如果是，我们直接推入这个栈，否则就将所有非占位的控制器推出，替换为新的控制器。

> 注意我们做了一个当前控制器是否为占位控制器的判断，并且根据结果将已有控制器弹出。更重要的是，我们在弹出时和弹出后的推入时将动画关闭。这在我们稍后发送 `placeholderWillAppear` 通知的时候可以避免不必要的触发，同时在视觉上也更加合理。

最后，返回 `true` 告知分栏视图无需再进行任何操作，否则我们返回 `false`，表示让分栏视图进行它的默认实现。

![](/assets/img/20062703.gif)

## 同步取消选中项

在分栏模式下，我们在详情分栏推出视图控制器的时候，主栏中的选中项没有跟随着取消选中：

![](/assets/img/20062704.gif)

一般来讲，我们会想监听 `UINavigationController` 的推出事件来及时更新选中项，但其实我们有一个更好的方法。仔细看的话，你会发现，我们需要反选选中项的时候，总是在详情栏回退到占位视图控制器的时候。我们其实可以在 `Placeholder` 的 `viewWillAppear(_:)` 方法中发出通知来提供一个事件点：

```swift
 extension SplitViewController.Placeholder {
    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        
        if let splitViewController = splitViewController as? SplitViewController {
            NotificationCenter.default.post(name: SplitViewController.placeholderWillAppearNotification,
                                          object: splitViewController,
                                        userInfo: ["placeholder": self])
        }
    }
}

extension SplitViewController {
    static let placeholderWillAppearNotification = NSNotification.Name("SplitViewControllerPlaceholderWillAppearNotificationName")
}
```

在发布通知的时候，我们传入的对象是 `splitViewController` 而不是 `placeholder`，这是因为当创建监听的时候，拿到 `placeholder` 对象比 `splitViewController` 对象要复杂不少，这样做可以方便我们未来的使用。

> 发送通知只是消息传递的其中一种方法，您可以选用您认为合适的来替换它。您也可以同时附加一些其他的信息，如当前分栏视图的主视图等信息，方便监听者在接收到事件后进行进一步的筛选。

这样，在我们需要取消选中项的控制器中，可以监听我们的 `placeholderWillAppearNotification` 事件来取消选中：

```swift
NotificationCenter.default.addObserver(self, selector: #selector(placeholderWillAppear(_:)), 
                                                 name: SplitViewController.placeholderWillAppearNotification, 
                                               object: splitViewController)

@objc func placeholderWillAppear(_ notification: Notification) {
    // when placeholder appears, deselect selection
    tableView.selectRow(at: nil, animated: true, scrollPosition: .none)
}
```

![](/assets/img/20062705.gif)

## 在分栏视图布局变化时重新分配控制器

接下来我们要来解决分栏视图最重要的功能。我们现在的分栏视图在宽度环境发生变化的时候，各个栈里的视图控制器并不会移动到它们应该处于的位置：

![](/assets/img/20062706.gif)

这里我们必须先讲讲分栏视图在变换布局的时候做了些什么事情：

**在折叠的时候：**

1. 它调用 `splitViewController(_:collapseSecondary:onto:)` 代理方法
  - 如果该方法返回 `false`，则分栏视图进一步调用 `primaryViewController` 的 `collapseSecondaryViewController(_:for:)` 方法
  - 如果该方法返回 `true`，则跳过不做任何事情
2. 分栏视图将 `secondaryViewController` 从子控制器中移除

**在扩展的时候：**

1. 它调用 `splitViewController(_:separateSecondaryFrom:)` 代理方法
  - 如果该方法返回 `nil`，则分栏视图进一步调用 `primaryViewController` 的 `separateSecondaryViewController(for:)` 方法
  - 如果该方法返回有效的 `UIViewController` 对象，则分栏视图将该对象作为详情栏的根视图控制器显示

在默认情况下，`splitViewController(_:collapseSecondary:onto:)` 返回 `false` ，`splitViewController(_:separateSecondaryFrom:)` 返回 `nil`。也就是说，它总会调用其主视图控制器，也就是我们的 `UITabBarController` 对象的 `collapseSecondaryViewController(_:for:)` 以及 `collapseSecondaryViewController(_:for:)` 方法。

这两个方法是每个视图控制器都有的，他们大多数都是不做任何事情。只有 `UINavigationController` 会将详情页的视图控制器推入它的视图栈中，或者从中推出。

我们可以通过重写 `UITabBarController` 的 `collapseSecondaryViewController(_:for:)` 以及 `separateSecondaryViewController(for:)` 方法，在里边调用嵌套的 `UINavigationController` 对象的对应方法来得到预期的效果。

但是，为了完全的控制（也为了更加符合重写的习惯），我们可以直接实现 `splitViewController(_:collapseSecondary:onto:)` 与 `splitViewController(_:separateSecondaryFrom:)` 代理方法并提供我们自己的实现：

```swift
func splitViewController(_ splitViewController: UISplitViewController, collapseSecondary secondaryViewController: UIViewController, onto primaryViewController: UIViewController) -> Bool {
    // 1. find navigation controller on both primary and secondary
    guard
        let tabBarController = primaryViewController as? UITabBarController,
        let primary = tabBarController.selectedViewController as? UINavigationController,
        let secondary = secondaryViewController as? UINavigationController
    else { return false }
    
    // 2. pop view controller from secondary and push to primary
    secondary.popToRootViewController(animated: false)?.forEach {
        primary.pushViewController($0, animated: false)
    }
    
    return false
}

func splitViewController(_ splitViewController: UISplitViewController, separateSecondaryFrom primaryViewController: UIViewController) -> UIViewController? {
    // 1. find navigation controller on primary
    guard
        let tabBarController = primaryViewController as? UITabBarController,
        let primary = tabBarController.selectedViewController as? UINavigationController
    else { return nil }
    
    // 2. make a new navigation controller with placeholder
    let secondary = makeSecondaryStack()
    
    // 3. pop view controller from primary and push to secondary
    secondary?.viewControllers += primary.popToRootViewController(animated: false) ?? []

    return secondary
}
```

做的事情很简单，简单的说就是三个步骤：

1. 得到各个分栏的导航控制器对象
2. 转移导航栈中的视图控制器
3. 按需返回结果

注意我们在 `splitViewController(_:separateSecondaryForm:)` 方法中将 `primary` 中的视图控制器弹出并推入 `secondary` 的时候，没有使用 `pushViewController(_:animated:)` 方法，而是直接对 `viewControllers` 数组进行操作。这是因为此时，`secondary` 还没有显示在屏幕上，使用前者会提前触发一些视图上的刷新，伴随一些恼人的报错出现。

这样，我们就得到如下图的效果：

![](/assets/img/20062707.gif)

## 解决选中项丢失的问题

在紧凑环境切换到分栏环境时，或者在分栏状态下来回切换标签页时，我们的 `UITableViewController` 或者 `UICollectionViewController` 会丢失选中项：

![](/assets/img/20062708.gif)
*选中项丢失*

这是因为，这两个类默认会在 `viewWillAppear(_:)` 被调用的时候清空选中项。我们平时在导航栏控制器中弹出视图控制器的时候，选中项会自动取消选中就是得益于此。为了在保留原始行为的前提下解决使用分栏时出现的问题，我们可以重写 `UITableViewController` 或者 `UICollectionViewController` 的 `viewWillAppear(_:)` 方法，在调用 super 前，根据当前分栏情况来更新该值：

```swift
override func viewWillAppear(_ animated: Bool) {
    clearsSelectionOnViewWillAppear = splitViewController?.isCollapsed ?? true
    super.viewWillAppear(animated)
}
```

这样，我们就可以在分栏环境下，禁用自动清空选中项了。

![](/assets/img/20062709.gif)
*选中项得以保留*

## 在切换便签页时切换详情栏内容

在分栏环境下切换便签页的时候，你会发现详情栏中的内容并没有跟随变化：

![](/assets/img/20062710.gif)

这里有个分歧，有的人认为不跟随是正确的，也有的人认为跟随才是正确的。我们这里讲一下跟随应该怎么实现，因为不跟随的话，你基本上什么都不需要做。

很明显，我们应该在标签页切换的前将当前详情栏的控制器保存起来，然后用新便签页的视图控制器替换详情栏中显示的控制器。问题就是，我们应该将这些控制器保存在哪？

我们可以在 `SplitViewController` 类中创建一个字典来存储这些对应控制器，但是，其实我们有一个更好的地方来存放它们，而且，这是我们已经有过的对象 -- 主栏的导航控制器。我们提供两个方法，一个是将详情栏的控制器推入到主栏控制器中，另一个是反过来推入到详情栏中：

```swift
func collapse() {
    guard
        let tabBarController = viewControllers.first as? UITabBarController,
        let primary = tabBarController.selectedViewController as? UINavigationController,
        let secondary = viewControllers.last as? UINavigationController
    else { return }
    
    secondary.popToRootViewController(animated: false)?.forEach {
        primary.pushViewController($0, animated: false)
    }
}

func separate(completion: ((UIViewController?, UIViewController?) -> Void)? = nil) {
    guard
        let tabBarController = viewControllers.first as? UITabBarController,
        let primary = tabBarController.selectedViewController as? UINavigationController,
        let secondary = viewControllers.last as? UINavigationController
    else { return }
    
    let viewControllers = primary.popToRootViewController(animated: false) ?? []
    viewControllers.forEach {
        secondary.pushViewController($0, animated: false)
    }
    
    completion?(primary.topViewController, viewControllers.first)
}
```

注意我们在 `separate` 方法中添加了一个回调，传入的是主栏导航控制器的顶视图控制器和弹出栈的第一个视图控制器。我们可以在该闭包被调用的时候更新改顶层视图控制器的选中项。

在标签页切换的时候，我们在下面的代理方法中手动调用这两个方法即可：

- `tabBarController(_:shouldSelect:)`
- `tabBarController(_:didSelect:)`

![](/assets/img/20062711.gif)

得益于此，当我们将分栏视图置于紧凑环境下时，主栏其他标签页的控制器都能够得以保留，而无需进一步的操作。
