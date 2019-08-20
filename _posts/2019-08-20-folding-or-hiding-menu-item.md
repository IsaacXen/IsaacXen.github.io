---
layout: post
series: Cocoa 速记
title: 折叠或隐藏菜单中的菜单项
tags: [macos, swift, appkit, nsmenu]
lang: zh
---

在 macOS 中，你会看到系统菜单有许多有意思的设计，如程序菜单中按下 `⌥`{:.keycap} 键会出现替代菜单项，又或者在按住 `⌥`{:.keycap} 时按下 Wi-Fi 的状态栏图标会出现额外的菜单项。这是怎么实现的呢？

## 使用替代菜单项来折叠菜单项

![](/assets/img/21e5af6c-e218-446d-a533-8bb4ba92efcb.png)
*按下 (右) 与未按下 (左) option 键的 Time Machine 菜单*

在菜单中，如果某个菜单项快捷键的基础键 `keyEquivalent` 与上一个菜单项相同，但是修饰键 `keyEquivalentModifierMask` 不同，那么，这些菜单项是可以折叠在一起的。

比如说有两个菜单项 *Save* 和 *Save As...*:

```swift
// `s` with `.commnad` mask
let saveItem = NSMenuItem(title: "Save", action: #selector(save:), keyEquivalent: "s")
// `s` with `.command` and `.option` mask
let saveAsItem = NSMenuItem(title: "Save As...", action: #selector(saveAs:), keyEquivalent: "S")
```

*Save* 的快捷键为 `⌘`{:.keycap} + `S`{:.keycap}，而 *Save As...* 的快捷键为 `⌥`{:.keycap} + `⌘`{:.keycap} + `S`{:.keycap}。

现在，如果你将 `saveAsItem` 菜单项的 `isAlternate` 设置为 `true`:

```swift
saveAsItem.isAlternate = true
```

那么，打开菜单时，*Save As...* 将不会显示出来，直到你按下 `⌥`{:.keycap} 键。这时，*Save* 将被 *Save As...* 替代显示。

> 这一方法同样也适用于 `keyEquivalent` 都为空的菜单项。
> 因为这个情况的重点在于基础键相同且修饰键不同，而不是有没有基础键。
> 
> 如果你对某个菜单项设置了 `isAlternate = true`，但是在它上面又没有符合条件的菜单项，那么，这个选项不会起任何作用。

## 按住修饰键打开菜单来显隐菜单项

当你按住 `⌥`{:.keycap} 时按下 Wi-Fi 的状态栏图标会出现额外的菜单项，而松开  `⌥`{:.keycap} 以后，这些菜单项并不会消失。这种要怎么做呢？

![](/assets/img/64074c19-8c08-45fe-b758-a9ebb1b8b766.png)
*按下 (右) 与未按下 (左) option 键打开的 Volume 菜单*

一个常见的思路是使用 `isHidden` 属性来隐藏这些需要隐藏的菜单项，当菜单打开的时候，我们检测一下 `⌥`{:.keycap} 是否被按下，然后根据情况来修改这些菜单项是否需要取消隐藏。

首先是打开菜单时的回调。`NSMenu` 的代理 `NSMenuDelegate` 中有个 `menuWillOpen(_:)` 正好符合我们的需求:

```swift
optional func menuWillOpen(_ menu: NSMenu)
```

在这个方法中，我们可以通过 `NSEvent` 的 `modifierFlags` 来得到当前按下的修饰符的情况。

```swift
func menuWillOpen(_ menu: NSMenu) {
    if NSEvent.modifierFlags.contain(.option) {
        // show item
    } else {
        // hide item
    }
}
```

我们只需要在这里更新一下菜单项的显示隐藏即可。因为我们是使用 `isHidden` 属性来控制菜单项的显隐，所以，在菜单显示以后，松开 `⌥`{:.keycap} 并不会影响到这些菜单项。

## 仅在按下修饰键时显示菜单项

有一种特殊的情况是你希望在菜单打开着的前提下，仅在按下 `⌥`{:.keycap} 时显示菜单项，并且在松开 `⌥`{:.keycap} 以后立即隐藏菜单项，如 *Finder → Go* 中的 *Library* 菜单项。这明显不符合上面说的两种情况。

![](/assets/img/eb4d4bd9-e4e6-44a1-9aea-045d5d766f23.png)
*Library 仅在按下 option 键时显示*

实际上，这种情况除了使用私有方法以外别无他法 (至少以我所知)。

你将需要调用私有的 `_setRequiresModifiersToBeVisible:` 方法来设置菜单项是否需要按下修饰键才显示:

```swift
item.perform(NSSelectorFromString("_setRequiresModifiersToBeVisible:"), with: 1)
// in this case, a non-command modifier mask is required
item.keyEquivalentModifierMask = .option
```
