---
layout: post
series: Cocoa Touch 速记
title: 为 UISearchController 添加额外的按钮
tags: [ios, swift, cocoatouch, uikit, uisearchcontroller]
---

如果你在 iPad 中使用过新的 App Store，那么你应该会发现在搜索页中的搜索栏与其他搜索栏有些不同: 在你点击搜索栏后，搜索栏会收缩到中间，而左右两边出现了筛选和取消按钮。怎样才能实现这样的效果呢?

![01](/assets/img/19042801.jpg)

UIKit 并没有提供直接了当的 API 来实现这样的效果。但我们可以通过重写一个 UISearchController 子类来实现这样的效果。

> tl;dr: 你可以在这个 [Github Repo](https://github.com/IsaacXen/IXSearchController) 中查看完整代码。

## 计划

当激活搜索栏的时候，系统进行了一次从当前的视图控制器到搜索控制器的转场。我们可以重写这个转场动画，修改最终的视图位置，并且添加我们的自定义按钮。

![02](/assets/img/19042802.png)

UISearchBar 下的 UIView 里存放了搜索输入框，这里是插入我们自定义视图的比较合理的位置。

`UISearchController` 实现了 `UIViewControllerAnimatedTransitioning` 协议，我们可以通过重写协议中的 `animateTransition(using:)` 方法来自定义搜索栏收缩和添加按钮的动画。

在这个方法中，我们需要:

- **修改搜索栏父容器的高度**。搜索栏父容器的高度根据不同场景会有所变化，我们需要重现这些变化。
- **修改搜索栏的位置与大小**。在搜索栏父容器高度发生变化的时候，适当调整搜索栏的位置。
- **修改搜索栏的宽度**。这是我们在 iPad 设备上想要做的修改。
- **插入自定义视图到搜索框左右两边**。这也是我们想要做的修改。此外，在 iPad 设备上，我们将左右空隙增大，以得到更好的视觉效果。
- **插入取消按钮**。这是为了修改搜索栏宽度而需要作出的一个妥协。使用系统方法显示取消按钮会导致我们的修改被覆盖掉，因此，我们将使用一个自定义的取消按钮来模拟取消按钮。
- **显示 SearchResultController**。搜索结果控制器的视图也是在这个时候插入到视图层级中的，我们同样需要将它添加上。

## 实现

重写一个自定义的 `UISearchController` 子类，如 `CustomSearchController`。

```swift
class CustomSearchController: UISearchController { /* ... */ }
```

我们可以通过下面这些方法来得到比较关键的视图:

```swift
// UISearchBar 下的 UIView 子视图, 姑且叫做 barContainer 吧
let barContainer = searchBar.subview.first
// 搜索栏的文本框
let searchField = barContainer?.subview.first(where: { $0.isKind(of: UITextField.self) }) as? UITextField
// 搜索栏的父视图
let palette = searchBar.superview
```

如上面所说，我们会重写下面这个方法:

```swift
override func animateTransition(using transitionContext: UIViewControllerContextTransitioning) {
  transitionContext.completeTransition(true)
}
```

![01](/assets/img/19042804.gif)

### 实现搜索栏父视图高度变化

搜索栏容器的高度是通过约束控制的，我们可以获取到这个约束:

```swift
private let _paletteHeightConstraint = searchBar.superview?.constraints.first(where: {
  $0.firstItem?.isEqual(searchBar.superview!) ?? false && $0.firstAttribute == .height && $0.secondItem == nil
})
```

在 `viewDidLoad` 中，我们需要设置这个高度为上文表中相应的值:

```swift
_paletteHeightConstraint?.constant = paletteH
```

然后，在 `animateTransition(using:)` 里也更新这个高度:

```swift
override func animateTransition(using transitionContext: UIViewControllerContextTransitioning) {
  
  _paletteHeightConstraint?.constant = paletteH

  UIView.animate(withDuration: transitionDuration(using: transitionContext), delay: 0, options: [.curveEaseInOut], animations: {
    self._palette?.superview?.layoutIfNeeded()
  }) {
    transitionContext.completeTransition($0)
  }
}
```

现在，搜索栏父视图的高度已经有所改变了。

![01](/assets/img/19042805.gif)


> 这里的 `paletteH` 就是上面提到了的搜索栏父容器的高度。它会根据不同场景变化，影响这个高度的变量包括搜索栏的激活状态，导航栏的隐藏与否，以及设备与其横竖屏的状态。
>
> <details><summary markdown="span">更多详情</summary>
>
> 当搜索栏未激活时:
> 
> <table>
>   <thead>
>     <tr> <th rowspan="2">Device</th> <th colspan="3">Portrait</th>                             <th colspan="3">Landscape</th>                            </tr>
>     <tr>                             <th>PaletteH</th> <th>TextFieldH</th> <th>TextFieldY</th> <th>PaletteH</th> <th>TextFieldH</th> <th>TextFieldY</th> </tr>
>   </thead>
>   <tbody>
>     <tr> <th>Any   </th> <td>52</td> <td>36</td> <td>1</td> <td>52</td> <td>36</td> <td>1</td> </tr>
>   </tbody>
> </table>
> 
> 当搜索栏激活，且 `hidesNavigationBarDuringPresentation` 为 `ture` 时:
> 
> <table>
>   <thead>
>     <tr> <th rowspan="2">Device</th> <th colspan="3">Portrait</th>                             <th colspan="3">Landscape</th>                            </tr>
>     <tr>                             <th>PaletteH</th> <th>TextFieldH</th> <th>TextFieldY</th> <th>PaletteH</th> <th>TextFieldH</th> <th>TextFieldY</th> </tr>
>   </thead>
>   <tbody>
>     <tr> <th>SE    </th> <td>50</td> <td>36</td> <td>4</td> <td>44</td> <td>30</td> <td>7</td> </tr>
>     <tr> <th>8     </th> <td>50</td> <td>36</td> <td>4</td> <td>44</td> <td>30</td> <td>7</td> </tr>
>     <tr> <th>8 Plus</th> <td>50</td> <td>36</td> <td>4</td> <td>50</td> <td>36</td> <td>4</td> </tr>
>     <tr> <th>XS    </th> <td>55</td> <td>36</td> <td>4</td> <td>44</td> <td>30</td> <td>7</td> </tr>
>     <tr> <th>XR    </th> <td>55</td> <td>36</td> <td>5</td> <td>50</td> <td>36</td> <td>4</td> </tr>
>     <tr> <th>XS Max</th> <td>55</td> <td>36</td> <td>4</td> <td>50</td> <td>36</td> <td>4</td> </tr>
>     <tr> <th>iPad  </th> <td>50</td> <td>36</td> <td>7</td> <td>44</td> <td>30</td> <td>7</td> </tr>
>   </tbody>
> </table>
> 
> 当搜索栏激活，且 `hidesNavigationBarDuringPresentation` 为 `false` 时:
> 
> <table>
>   <thead>
>     <tr> <th rowspan="2">Device</th> <th colspan="3">Portrait</th>                             <th colspan="3">Landscape</th>                            </tr>
>     <tr>                             <th>PaletteH</th> <th>TextFieldH</th> <th>TextFieldY</th> <th>PaletteH</th> <th>TextFieldH</th> <th>TextFieldY</th> </tr>
>   </thead>
>   <tbody>
>     <tr> <th>SE    </th> <td>52</td> <td>36</td> <td>1</td> <td>46</td> <td>30</td> <td>1</td> </tr>
>     <tr> <th>8     </th> <td>52</td> <td>36</td> <td>1</td> <td>46</td> <td>30</td> <td>1</td> </tr>
>     <tr> <th>8 Plus</th> <td>52</td> <td>36</td> <td>1</td> <td>52</td> <td>36</td> <td>1</td> </tr>
>     <tr> <th>XS    </th> <td>52</td> <td>36</td> <td>1</td> <td>46</td> <td>30</td> <td>1</td> </tr>
>     <tr> <th>XR    </th> <td>52</td> <td>36</td> <td>1</td> <td>52</td> <td>36</td> <td>1</td> </tr>
>     <tr> <th>XS Max</th> <td>52</td> <td>36</td> <td>1</td> <td>52</td> <td>36</td> <td>1</td> </tr>
>     <tr> <th>iPad  </th> <td>52</td> <td>36</td> <td>1</td> <td>52</td> <td>36</td> <td>1</td> </tr>
>   </tbody>
> </table>
> 
> 其中，Palette 指搜索栏的父视图，TextField 指搜索栏中的输入框。
> 
> 这里可以编写一个函数来根据情况返回特定的数值，这里就不给出代码了。
> 
> </details>

### 实现搜索栏布局

首先在 `viewDidLoad` 中禁用掉搜索框的自动约束转换:

```swift
searchField.translatesAutoresizingMaskIntoConstraints = false
```

然后，我们可以添加左右两侧的按钮容器了:

```swift
barContainer.addSubview(leftBarItemsStack)
barContainer.addSubview(rightBarItemsStack)
```

这里使用 Stack View 来作为左右两边按钮的容器。

现在，我们需要配置 3 套约束:

- 基础约束
- 激活时约束
- 非激活时约束

基础约束是一直生效的约束，它在 `viewDidLoad` 中激活，并且在转场过程中不会有所变化。

```swift
// We will change the constant of this two later in `animateTransition(using:)`
let _topConstraint = searchField.topAnchor.constraint(equalTo: barContainer.topAnchor, constant: fieldTop)
let _bottomConstraint = searchField.bottomAnchor.constraint(equalTo: barContainer.bottomAnchor, constant: fieldBottom).with(priority: .defaultHigh)

var _baseConstraints = [
  _topConstraint!,
  _bottomConstraint!,
  searchField.leadingAnchor.constraint(equalTo: barContainer.safeAreaLayoutGuide.leadingAnchor, constant: 20).with(priority: .defaultHigh),
  searchField.trailingAnchor.constraint(equalTo: barContainer.safeAreaLayoutGuide.trailingAnchor, constant: -20).with(priority: .defaultHigh),
  // align stack view
  leftBarItemsStack.centerYAnchor.constraint(equalTo: searchField.centerYAnchor),
  rightBarItemsStack.centerYAnchor.constraint(equalTo: searchField.centerYAnchor)
]
```

> `with(priority:)` 是修改约束优先级的扩展方法。使用了这些方法的约束是需要修改优先级的。如设置 `_bottomConstraint` 的优先级为 `defaultHigh` 可以防止滑动隐藏搜索栏时造成约束错误。
> 
> 这里 `_topConstraint` 与 `_bottomConstraint` 的 `fieldTop` 与 `fieldBottom` 指的是上表中的 `TextFieldY` 以及 `PaletteH - TextFieldH - TextFieldY`。

激活时约束是在搜索栏激活的时候才激活的约束:

```swift
var _presentedConstraints = [
  leftBarItemsStack.leadingAnchor.constraint(equalTo: barContainer.safeAreaLayoutGuide.leadingAnchor, constant: spacing + 20),
  rightBarItemsStack.trailingAnchor.constraint(equalTo: barContainer.safeAreaLayoutGuide.trailingAnchor, constant: -(spacing + 20)),
  searchField.leadingAnchor.constraint(greaterThanOrEqualTo: leftBarItemsStack.trailingAnchor, constant: spacing + 16),
  searchField.trailingAnchor.constraint(lessThanOrEqualTo: rightBarItemsStack.leadingAnchor, constant: -(spacing + 16)),
]
```

这些约束保证将 stack view 显示出来，同时搜索栏留出空间给 stack view。

> `spacing` 是在 stack view 左右要增加的空白。

对于 iPad，我们可以添加这些约束来实现搜索栏居中，宽度缩小:

```swift
if UIDevice.current.userInterfaceIdiom == .pad, let width = maxSearchBarWidthWhenActive {
  _presentedConstraints.append(searchField.widthAnchor.constraint(lessThanOrEqualToConstant: width))
  _presentedConstraints.append(searchField.centerXAnchor.constraint(equalTo: barContainer.centerXAnchor).with(priority: .defaultHigh))
}
```

非激活时约束是在搜索栏非激活的时候才激活的约束:

```swift
var _dismissedConstraints = [
  leftBarItemsStack.trailingAnchor.constraint(equalTo: barContainer.leadingAnchor, constant: -20),
  rightBarItemsStack.leadingAnchor.constraint(equalTo: barContainer.trailingAnchor, constant: 20)
]
```

这些约束保证非激活状态时，stack view 不会显示在屏幕上。

在 `viewDidLoad` 中，我们事先激活基础约束和非激活约束:

```swift
NSLayoutConstraint.activate(_baseConstraints)
NSLayoutConstraint.activate(_dismissedConstraints)
```

每当转场发生时，我们要更新 `_topConstraint` 与 `_bottomConstraint` 的值，并且根据搜索栏激活状态启用适当的约束:

```swift
override func animateTransition(using transitionContext: UIViewControllerContextTransitioning) {
  
  // ...

  // update constant
  _topConstraint?.constant = fieldTop
  _bottomConstraint?.constant = fieldBottom

  // toggle constraints
  if isActive {
    NSLayoutConstraint.deactivate(_dismissedConstraints)
    NSLayoutConstraint.activate(_presentedConstraints)
  } else {
    NSLayoutConstraint.deactivate(_presentedConstraints)
    NSLayoutConstraint.activate(_dismissedConstraints)
  }

  // animate changes
  UIView.animate(withDuration: transitionDuration(using: transitionContext), delay: 0, options: [.curveEaseInOut], animations: {
    // ...
    self.barContainer?.layoutIfNeeded() // remember to layout
  }) {
    transitionContext.completeTransition($0)
  }
}
```

![01](/assets/img/19042806.gif)

### 修复首次转场视图错位的问题

现在，第一次激活搜索栏的时候，视图会错位。

当 `hidesNavigationBarDuringPresentation` 为 `true` 的时候，首次激活搜索框前，以及激活后的第一次转场，使用的不是我们的 SearchController。这会造成首次激活搜索框的时候视图布局和动画会出现问题，而这似乎是因为苹果在这里用的是一个占位的搜索框。目前我还没有找到直接修改这个占位搜索框的方法，但是，我们可以在 `viewDidAppare(animate:)` 中激活一次搜索框，随即取消激活，当然是在关闭动画的前提下。

通过把最开始两次转场的时长改为 0.001 来快速跳过动画:

```swift
var skipFirstTwoTransition: Bool = false
private var _firstEver: Bool = true

let duration = skipFirstTwoTransition && _firstEver ? 0.001 : transitionDuration(using: transitionContext)

UIView.animate(withDuration: duration, delay: 0, options: [.curveEaseInOut], animations: {
  // ...
}) {
  // ...
  if self.skipFirstTwoTransition && self._firstEver && from.isKind(of: IXSearchController.self) {
      self._firstEver = false
  }
}
```

在使用的时候，将 `skipFirstTwoTransition` 设置为 `true` 表示我们需要跳过前两次转场，然后在视图显示后手动激活反激活一次搜索栏:

```swift
class ViewController: UITableViewController {
  override func viewDidLoad() {
    // ...
    searchController.skipFirstTwoTransition = true
  }

  override func viewDidAppear(_ animated: Bool) {
    searchController.isActive = true
    searchController.isActive = false
  }
}
```

![01](/assets/img/19042807.gif)

> 如果你有更好的办法，欢迎在 [Github Repo](https://github.com/IsaacXen/IXSearchController) 中发起 Pull Request。

### 插入取消按钮

我们编写一个方法，如果开启了自动插入取消按钮的功能，那么，如果右 stack view 中没有 取消按钮，我们就插入到末尾。如果有，那我们就把它移动到末尾。否着，我们把它移除。

```swift
private func updateCancelButtonInsertation() {
  if autoInsertCancelButton {
    if rightBarItemsStack.arrangedSubviews.contains(_cancelButton) {
      // check and move cancel button to last
      if !(rightBarItemsStack.arrangedSubviews.last?.isEqual(_cancelButton) ?? true) {
        rightBarItemsStack.removeArrangedSubview(_cancelButton)
        rightBarItemsStack.insertArrangedSubview(_cancelButton, at: rightBarItemsStack.arrangedSubviews.count)
      }
    } else {
      // insert cancel button
      rightBarItemsStack.insertArrangedSubview(_cancelButton, at: rightBarItemsStack.arrangedSubviews.count)
    }
  } else {
    // remove cancel button if needed
    if rightBarItemsStack.arrangedSubviews.contains(_cancelButton) {
      rightBarItemsStack.removeArrangedSubview(_cancelButton)
      _cancelButton.removeFromSuperview()
    }
  }
}
```

在每次搜索栏要被激活时，我们根据情况插入或移动取消按钮的位置:

```swift
override func animateTransition(using transitionContext: UIViewControllerContextTransitioning) {
  // ...
  if isActive {
    // ...
    updateCancelButtonInsertation() // insert cancel button
  } else { /* ... */ }
  // ...
}
```

![01](/assets/img/19042808.gif)

取消按钮只是一个普通的按钮，它被按下的时候，我们要手动反激活搜索栏，并告知代理这一事件:

```swift
@objc private func _cancelButtonDown(_ sender: UIButton) {
  isActive = false
  searchBar.delegate?.searchBarCancelButtonClicked?(searchBar)
}
```

### 插入 Search Result Controller

我们还需要插入 Search Result Controller 到视图层级中：

```swift
override func animateTransition(using transitionContext: UIViewControllerContextTransitioning) {
  let from = transitionContext.viewController(forKey: .from)!
  let to = transitionContext.viewController(forKey: .to)!

  if isActive {
    // ...
    
    // add search controller's view, where search result controller's view is presented.
    transitionContext.containerView.addSubview(to.view)
    to.view.translatesAutoresizingMaskIntoConstraints = false

    NSLayoutConstraint.activate([
      to.view.topAnchor.constraint(equalTo: transitionContext.containerView.topAnchor),
      to.view.leadingAnchor.constraint(equalTo: transitionContext.containerView.leadingAnchor),
      to.view.trailingAnchor.constraint(equalTo: transitionContext.containerView.trailingAnchor),
      to.view.bottomAnchor.constraint(equalTo: transitionContext.containerView.bottomAnchor)
    ])
            
    to.view.setNeedsLayout()
  } else {
    // ...

    // remove search controller's view
    from.view.removeFromSuperview()
  }
}
```

![01](/assets/img/19042809.gif)

### 解决横竖屏转换时的布局错位

在进行横竖屏转换的时候，视图会出现布局错乱的问题，我们需要手动触发布局:

```swift
override func viewWillTransition(to size: CGSize, with coordinator: UIViewControllerTransitionCoordinator) {
  super.viewWillTransition(to: size, with: coordinator)
        
  coordinator.animateAlongsideTransition(in: coordinator.containerView, animation: { _ in
    self.barContainer?.setNeedsLayout()
    self._palette?.superview?.layoutIfNeeded()
  })
}
```

![01](/assets/img/19042810.gif)

## 总结

到这里，我们就完成了对 UISearchController 子类的实现。

![01](/assets/img/19042811.gif)

如果你对这感兴趣，你可以在 Github 中查看已经封装好的 [IXSearchController](https://github.com/IsaacXen/IXSearchController)。欢迎大家 star，提出 issue，甚至发起 pull request。
