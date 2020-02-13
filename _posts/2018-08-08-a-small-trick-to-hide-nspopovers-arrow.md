---
layout: post
series: Cocoa Quicknote
title: A Small Trick to Hide NSPopover's Arrow
tags: [cocoa, macos, swift, nspopover, appkit]
lang: en
---

A friend of mine who works as a macOS developer asked me a strange question - can you hide the arrow of a popover?

This is strange to me because IMO the arrow give you a sence of context, indicating where the popover is pop from, and imply the relation of its content. There's no reason to hide the arrow from the first place.

Any way, back to the question. Is it possible to hide the arrow?

The anwser is **yes**, but this is not tweaking a knob in interface builder nor changing a variable programmatically. 

Here is how it works.

Say you have a scroll view, and a button on it, which present a popover relatively to the button when clicked. 

Now scroll it til the button is away from visible rect. Guess what happend? The arrow of the popover will follow the button and when the button is outside visible rect, the arrow disappear!

![Default Popover Behavior](/assets/img/2018-08-08-a-small-trick-to-hide-nspopovers-arrow-02.gif)

That is a default behvaior of popover we can make use of. The arrow of popover is always point to it's positioning view when it's possible, and hide itself when the positioning view is not visiable.

That means all we need to do is:

1. Create a different positioning view.
2. Create the popover.
3. present the popover.
4. Move positioning view off visible rect.

And now you have presented a popover with no arrow!

![Popover with no arrow](/assets/img/2018-08-08-a-small-trick-to-hide-nspopovers-arrow-01.gif)

```swift
var popover: NSPopover?
var positioningView: NSView?

@IBAction func showPopover(_ sender: NSButton) {
    positioningView = NSView()
    positioningView?.frame = sender.frame
    view.addSubview(positioningView!, positioned: .below, relativeTo: sender)

    popover = NSPopover()
    // configure popover here

    popover?.show(relativeTo: .zero, of: positioningView!, preferredEdge: .maxX)

    positioningView?.frame = NSMakeRect(0, -200, 10, 10)
}
```

## Bonus: Popover on Statusbar

This trick also works if you want to use a popover as a statusbar menu.

In your status item button's action callback method, simply add a positioning view as a subview of the status item button:

```swift
@IBAction func statusItemButtonDidPushed(_ sender: NSButton) {
    // add positioning view as a suview of sender, that is, `statusItem.button`.
    let positioningView = NSView(frame: sender.bounds)
    // set an identifier for positioning view, so we can easily remove it later.
    positioningView.identifier = NSUserInterfaceItemIdentifier(rawValue: "positioningView")
    sender.addSubview(positioningView)

    // show popover
    popover.show(relaticeTo: posotioningView.bounds, of: positioningView, preferredEdge: .maxY)
    // move positioning view away
    sender.bounds = sender.bounds.offsetBy(dx: 0, dy: sender.bounds.height)
}
```

Later, when the popover is closed, we can remove the positioning view from view hierarchy. This is often done in popover's deelgate method `popoverDidClose(_:)`:

```swift
func popoverDidClose(_ notification: Notification) {
    let positioningView = statusItem.button?.subviews.first { 
        $0.identifier == NSUserInterfaceItemIdnetifier(rawValue: "positioningView") 
    }
    positioningView?.removeFromSuperview()
}
```

You may find the gap between the statusbar and the popover is a bit large. In this case, you can also move the popover up a bit by setting its window's frame:

```swift
if let popoverWindow = popover.contentViewController?.view.window {
    popoverWindow.setFrame(popoverWindow.frame.offsetBy(dx: 0, dy: 10), display: false)
}
```