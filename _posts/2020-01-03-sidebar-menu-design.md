---
layout: post
series: Cocoa 速记
title: 侧边栏菜单设计
tags: [cocoa, macos, swift, tabview, sidebar]
lang: zh
---

侧边栏菜单与 iOS / iPadOS 中的 Tab Bar 类似，一般都用来管理一个单选型界面，而选中项决定了当前应该显示的视图。在 macOS 中，我们一般使用 Tab View 或者 Tab View Controller 来搭配 Table View 等视图来实现这一界面。本文将使用 Tab View Controller 与 Table View 的搭配来展示这类界面的实现。

![](/assets/img/9871120e-5b1a-4bae-ae4c-bd73697d843c.png)
*在 App Store 中，左侧的侧边栏菜单控制右侧不同内容页之间的切换*

> 我们一般会将侧边栏菜单与常规侧边栏进行区分。
> 
> 侧边栏菜单往往是固定宽度且内容固定的，而常规侧边栏往往是宽度可变且内容是动态变化的。这些特性决定了常规侧边栏需要使用 Split View Controller 来实现，而侧边栏菜单不需要。
> 
> 当然，这一区分并不是严格的，它们的运作原理都是一样的，你也不需要非得限制自己使用 Split View Controller 与否。

## 实现基本框架

我们将创建一个如下的视图结构：

```
+ Window
  + Content View Controller
    + Sidebar Container View (Hosting Sidebar View Controller)
      + Table View
    + Tab View Container View (Hosting Tab View Controller)
      + Tab View
```

数据交流方面，Sidebar View Controller 与 Tab View Controller 都将是 Content View Controller 的子视图控制器，我们可以使用代理模式在 Content View Controller 中连接代理对象即可。

> 出于个人习惯，文章会使用纯代码进行构建，你同样可以稍作修改来使用可视化实现同样的效果。

我们从 Content View Controller 开始。我们需要在 Content View Controller 中添加两个视图，这两个视图将成为我们侧边栏视图控制器和标签视图控制器的视图容器。因为方法是一样的，为了更好的展示代码，下面只展示侧边栏部分的实现：

```swift
class ContentViewController: NSViewController {
    // The view controller that manages sidebar.
    let sidebarViewController = SidebarViewController()

    // This will be the root view to host sidebar view controller's view.
    let sidebarContainer = NSView()
    
    override func viewDidLoad() {
        // add `sidebarViewController` as a child view controller.
        addChild(sidebarViewController)
        // Host `sidebarViewController`'s view in `sidebarContainer`.
        sidebarViewController.view.translatesAutoresizingMaskIntoConstraints = false
        sidebarContainer.addSubview(sidebarViewController.view)

        // `sidebarContainer` need to be a subview of this view controller's view.
        sidebarContainer.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(sidebarContainer)

        // Some constraints setup codes here...
    }
}
```

给两个视图控制器一点颜色，我们可以看到如下图的界面:

![](/assets/img/4e00fb5d-7dac-45aa-980c-c46c20bb0b9e.png)

> 这里略去了关于窗口样式的定制代码。关于修改窗口标题栏高度的相关内容，你可以查看 *[修改标题栏高度]({% post_url 2019-03-26-changing-titlebars-height %})* 来获取更多详情。

## 侧边栏视图控制器

我们来创建侧边栏视图控制器 `SidebarViewController`。首先是根视图，我们希望侧边栏的背景是半透明毛玻璃效果的，因此，我们在 `loadView` 方法中创建一个 `NSVisualEffectView` 对象，并将其赋给 `view`：

```swift
class SidebarViewController: NSViewController {
    override func loadView() {
        let visualEffectView = NSVisualEffectView()
        visualEffectView.material = .sidebar
        visualEffectView.blendingMode = .behindWindow
        view = visualEffectView
    }
}
```

接下来我们来创建侧边栏中最关键的表格视图：

```swift
let tableView: NSTableView = {
    let view = NSTableView()
    // add a column to table view
    view.addTableColumn(NSTableColumn(identifier: NSUserInterfaceItemIdentifier("kSidebarColumn")))
    // remove table header
    view.headerView = nil
    // clear background
    view.backgroundColor = .clear
    // remove cell spacing
    view.intercellSpacing = .zero
    return view
}()
```

上面的代码中，我们给表格添加了一个列，这是因为纯代码创建的表格视图默认是没有列的。此外，我们还去除了表头，设置了透明背景，并且去掉了表格项直接的默认空隙。

> 这里省略了表格代理和数据源的设置，请记得设置 `delegate` 和 `dataSource` 对象引用，并完成表格项的配制。

有了表格视图，我们还需要创建一个能够装载它的容器：

```swift
lazy var scrollView: NSScrollView = {
    let view = NSScrollView()
    // set up document view
    view.documentView = tableView
    // add content inset to the top of table view, so the table view is not covered by window control buttons.
    view.automaticallyAdjustsContentInsets = false
    view.contentInsets = NSEdgeInsets(top: 52, left: 0, bottom: 0, right: 0)
    // clear background
    view.contentView.drawsBackground = false
    // remove vertical bounce effect
    view.verticalScrollElasticity = .none
    view.translatesAutoresizingMaskIntoConstraints = false
    return view
}()
```

> 表格视图本身并不包含滚动功能，滑动是通过嵌套的滑动视图实现的。你在可视化中添加的表格之所以是能够滑动，也是因为 Xcode 帮你嵌套了一个滑动视图在外边。
> 
> 严格来说，这里的滑动视图并不是必须的，因为这类侧边栏菜单项目较少，往往不需要滑动。此外，我们往往也会将窗口的最小高度设置为一个至少高过表格高度的值来避免需要滑动的情况。

现在，配制完代理和数据源，并给定一个表格项视图后，你的侧边栏应该就是如下图的效果：

![](/assets/img/d4006167-3511-4fec-a441-d9e425e764e8.png)

 需要注意的是，如果你希望使用毛玻璃效果的侧边栏，那么，你应该确保你的表格项视图中的图片是使用模版形式渲染的。在 Assets 中，你可以在右侧属性栏中的 *Render As* 一项中设置为 *Template Image*，在代码中，你通过 `NSImage` 的 `isTemplate` 属性进行设置。而对于文本视图，确保你重写了 `allowsVibrancy` 属性。

## 标签视图控制器

右侧的标签视图的配制要简单许多，因为有现成的标签视图控制器。你在这里设置标签页中需要显示的各个视图控制器，并设置它们的标题和图标。方便起见，下面使用了一个循环来设置这些视图控制器：

```swift
class TabViewController: NSTabViewController {
    override func viewDidLoad() {
        // hide tab inside tab view
        tabStyle = .unspecified

        for index in 0..<4 {
            let item = NSTabViewItem(viewController: NumberedViewController())
            item.label = /* Some label here... */
            item.image = /* Some image here... */
            addTabViewItem(item)
        }
    }
}
```

我们通过将 `tabStyle` 设置为 `.unspecified` 来隐藏默认的标签控件，因为我们想要使用侧边栏中的表格来控制标签的切换。在这里设置视图控制器的标题和图片，可以允许我们在后面将这些数据传递给侧边栏。这只是帮助我们数据传递的其中一个方法，你可以根据你的偏好来修改上面的代码。

![](/assets/img/4f9c83f7-c30d-4177-92e6-e99297e196bf.png)
*（为了更好的进行演示，图中的标签页并未隐藏）*

> 上面配制标签项的方法并不是一个好办法，这会在一开始就把所有的视图都加载到内存中。你可以在这里使用一些懒加载的方法来推迟视图控制器的创建和添加，不过这并不是本文的重点。

## 视图控制器之间的数据交流

现在我们要将侧边栏的表格视图与标签页视图关联起来，来实现点击左侧表格项切换右侧标签页。

我们可以通过编写数据源的方法来从外部，也就是标签页视图控制器中获取标签数据：

```swift
protocol SidebarViewControllerDataSource: class {
    func sidebarViewControllerNumberOfItems(_ controller: SidebarViewController) -> Int
    func sidebarViewController(_ controller: SidebarViewController, titleForItemAt index: Int) -> String
    func sidebarViewController(_ controller: SidebarViewController, imageForItemAt index: Int) -> NSImage?
}
```

类似的，通过编写代理的方法来通知标签页视图进行标签切换：

```swift
protocol SidebarViewControllerDelegate: class {
    func sidebarViewController(_ controller: SidebarViewController, didSelectItemAt index: Int)
}
```

在 `SidebarViewController` 中，我们在对应的方法内调用这些数据源和代理的方法：

```swift
class SidebarViewController {
    weak var dataSource: SidebarViewControllerDataSource?
    weak var delegate: SidebarViewControllerDelegate?

    func numberOfRows(in tableView: NSTableView) -> Int {
        // ask data source for number of items
        dataSource?.sidebarViewControllerNumberOfItems(self) ?? 0
    }

    func tableView(_ tableView: NSTableView, viewFor tableColumn: NSTableColumn?, row: Int) -> NSView? {
        let cell = /* dequeue cell */
        // ask data source for title and image
        cell.image = dataSource?.sidebarViewController(self, imageForItemAt: row)
        cell.label = dataSource?.sidebarViewController(self, titleForItemAt: row)
        return cell
    }

    func tableViewSelectionDidChange(_ notification: Notification) {
        // notify delegate when selection has changed
        delegate?.sidebarViewController(self, didSelectItemAt: tableView.selectedRow)
    }
}
```

而在 `TabViewController` 中，实现 `SidebarViewControllerDataSource` 与 `SidebarViewControllerDelegate` 协议，并在协议方法中填入相应的内容即可。

此外，窗口即将显示出来时，在侧边栏表格加载完成并向数据源请求数据的时候，数据源（也就是标签页）有可能还没完成加载。这会造成一开始两个视图控制器的数据没有正确同步。我们可以用类似的方法为标签页写一个代理，用来在完成加载以后对代理对象进行通知：

```swift
protocol TabViewControllerDelegate: class {
    func tabViewControllerDataSourceDidChange(_ controller: TabViewController)
}
```

每当我们修改标签页视图中的 `tabViewItems` 时，我们调用 `mainTabViewControllerDataSourceDidChange(_:)` 来通知代理对象需要进行数据更新。

现在我们可以在 Content View Controller 中将这些代理和数据源连接起来：

```swift
class ContentViewController: NSViewController {
    override func viewDidLoad() {
        // ...

        // Setup delegate & data source objects.
        sidebarViewController.delegate = tabViewController
        sidebarViewController.dataSource = tabViewController
        tabViewController.delegate = sidebarViewController
    }
}
```

到这里，我们就完成了基本的侧边栏菜单的实现。

## 附加内容

在下面的几个小节中，我们会做一些细微的修改来提高用户体验。

### 效果更佳的高亮效果

默认情况下，我们的表格视图高亮选中某一行时，会用蓝色的高亮背景色来进行区分。这在普通侧边栏下的效果很好，但是在侧边栏菜单中就显得有点突兀了。

眼尖的你应该会发现 App Store 以及 Finder 这样的侧边栏并没有使用这种蓝色高亮，而是使用了更加通透的毛玻璃背景。

![](/assets/img/6e5647c3-8247-4e61-a5c6-e874b2deb34c.png)

我们也是可以通过重写来实现这一效果的。在表格视图中，我们需要重写行视图的一个属性，来禁用默认的蓝色高亮：

```swift
class SidebarRowView: NSTableRowView {
    override var isEmphasized: Bool {
        get { false }
        set { }
    }
}
```

然后，我们在表格视图的代理中的 `tableView(_:rowViewForRow:)` 方法中返回这个行视图即可。

### 效果更佳的侧边栏分割线

仔细看一下 App Store 的侧边栏，你会发现在侧边栏边缘有一条分割线，这条分割线的样式跟分栏视图中的分割线还有点不同。它在明亮模式下，是带有模糊效果的半透明的灰色，而在暗黑模式下是纯黑色:

![](/assets/img/33044346-8051-4015-8190-67061ea92a1c.png)

我们可以在侧边栏中添加一个 `NSVisualEffectView` 类，加上一个 `NSView` 来当颜色覆盖：

```swift
class VisualSeparatorView: NSVisualEffectView {
    var backgroundColor: NSColor?
    
    private lazy var _overlay: NSView = {
        let view = NSView()
        view.wantsLayer = true
        view.layer?.backgroundColor = backgroundColor?.cgColor
        view.translatesAutoresizingMaskIntoConstraints = false
        return view
    }()

    private func commonInit() {
        blendingMode = .withinWindow
        material = .selection

        addSubview(_overlay)

        NSLayoutConstraint.activate([
            _overlay.topAnchor.constraint(equalTo: topAnchor),
            _overlay.leadingAnchor.constraint(equalTo: leadingAnchor),
            _overlay.trailingAnchor.constraint(equalTo: trailingAnchor),
            _overlay.bottomAnchor.constraint(equalTo: bottomAnchor)
        ])
    }

    override func updateLayer() {
        super.updateLayer()
        _overlay.layer?.backgroundColor = backgroundColor?.cgColor
    }
    
    override init(frame frameRect: NSRect) {
        super.init(frame: frameRect)
        commonInit()
    }

    required init?(coder decoder: NSCoder) {
        super.init(coder: decoder)
        commonInit()
    }
}
```

然后设置一下掩盖层的颜色：

| Appearance | RGBA (HEX)  | RGBA                       |
|-----------:|-------------|----------------------------|
| Light Mode | `#EBEBEB80` |  `(0.92, 0.92, 0.92, 0.5)` |
|  Dark Mode | `#000000FF` |  `(0.00, 0.00, 0.00, 1.0)` |

即可实现类似的效果。

### 通过拖动侧边栏来拖动窗口

当你在侧边栏空白区域拖动时，你会发现窗口不会跟随拖动。这对于用户体验来说是一件非常让人沮丧的事情。

![](/assets/img/09add2be-b3cd-45e1-9330-efb6058db4d4.png)

我们可以通过重写表格视图来将拖动事件传递给根视图，并在根视图中实现窗口拖动：

```swift
class TableView: NSTableView {
    override func mouseDown(with event: NSEvent) {
        let location = convert(event.locationInWindow, from: nil)

        if row(at: location) > -1 {
            // mouse down on row, call super
            super.mouseDown(with: event)
        } else {
            // mouse down on empty space
            var keepOn = true
            
            while keepOn {
                let nextEvent = window?.nextEvent(matching: [.leftMouseDragged, .leftMouseUp])

                switch nextEvent?.type {
                    case .some(.leftMouseDragged):
                        // send drag event to super
                        super.mouseDragged(with: nextEvent!)
    
                    case .some(.leftMouseUp):
                        keepOn = false
                        super.mouseUp(with: nextEvent!)
                    
                    default: ()
                }
            }
        }
    }
}
```

上面的代码可能跟你预想中的不太一样。`NSTableView` 并没有使用我们现在所熟知的 3 段式事件处理法 (`mouseDown`, `mouseDragged`, `mouseUp`) 来处理鼠标事件，而是使用了循环检测法来检测鼠标事件。

因此，我们需要在 `mouseDown` 方法中使用循环来追踪接下来我们感兴趣的事件。当事件是鼠标拖动或松开时，我们调用 `mouseDragged` 或 `mouseUp` 来将事件传递给下层视图处理，并且在 `mouseUp` 中及时退出循环。

> 更多关于这两种不同事件处理方法的内容，请查阅 Cocoa Event Handling Guide 中的 [Handling Mouse Dragging Operations](https://developer.apple.com/library/archive/documentation/Cocoa/Conceptual/EventOverview/HandlingMouseEvents/HandlingMouseEvents.html#//apple_ref/doc/uid/10000060i-CH6-SW18%20for%20more%20info.) 部分。

而在 `SidebarViewController` 中，我们重写 `mouseDragged` 方法来实现窗口拖动：

```swift
class SidebarViewController: NSViewController {
    override func mouseDragged(with event: NSEvent) {
        view.window?.performDrag(with: event)
    }
}
```

> 你可以在表格视图的 `mouseDown` 中直接调用窗口的 `performDrag(with:)` 方法来实现拖动而无需在 `SidebarViewController` 中进行重写。我们之所以这样做，是为了方便以后你的侧边栏要放下去其他视图时 (如搜索栏)，可以统一在一个地方进行窗口拖动。

### 双击侧边栏空白区域来放大或缩小窗口

跟上面的一节类似，我们一般在窗口标题栏双击时，会使窗口放大或缩小 (不是全屏模式)。由于我们的程序隐藏了标题栏，因此，我们可以在侧边栏中是实现这个功能。

方法很简单，在上面重写的表格视图中，但我们接收到鼠标松开事件时，我们进一步检测是否是双击事件，从而判断是否需要放大窗口：

```swift
case .some(.leftMouseUp):
    keepOn = false

    // zoom window if double clicked
    if nextEvent?.clickCount == 2 {
        window?.setIsZoomed(!window!.isZoomed)
    }

    super.mouseUp(with: nextEvent!)
```

> 取决与你的视图层级与样式，你可能同样需要重写上层的活动视图的 `mouseUp(with:)` 方法来实现拖动，从而保证有 inset 的位置也能够双击放大。

### 非活动窗口的快速拖动

当我们的窗口为非活动窗口时，如果你尝试拖动侧边栏来拖动窗口，你会发现窗口没有被拖动，这同样是一件很让用户沮丧的事情。

我们可以通过重写视图的 `acceptsFirstMouse(for:)` 方法来允许视图接收成为活动窗口时的首个事件。这里我们在滑动视图中重写这一方法：

```swift
class ScrollView: NSScrollView {
    override func acceptsFirstMouse(for event: NSEvent?) -> Bool {
        true
    }
}
```

现在，我们的窗口可以在非活动状态下进行拖动了。