---
title: A Small Trick to Hide NSPopover's Arrow
summary: Just when you thought it's impossible.
---

No, this is not tweaking a knob in interface builder nor changing a variable programmatically. But this is still quite simple.

Here is how it works.

Say you have a scroll view, and a button on it, which present a popover relatively to the button when clicked. Now scroll it til the button is away from visible rect. Guess what happend? The arrow of the popover will follow the button and when the button is outside visible rect, the arrow disappear!

![Default Popover Behavior]({{ site.baseurl }}/img/posts_img/2018-08-08-a-small-trick-to-hide-nspopovers-arrow-02.gif)

That is a default behvaior of popover we can make use of. The arrow of popover is always point to it's positioning view when it's possible, and hide itself when the positioning view is not visiable.

That means all we need to do is:

1. Create a different positioning view that have a save frame with the button.
2. Create the popover.
3. present the popover.
4. Move positioning view off visible rect.

And now you have presented a popover with no arrow!

![Popover with no arrow]({{ site.baseurl }}/img/posts_img/2018-08-08-a-small-trick-to-hide-nspopovers-arrow-01.gif)

Here is how you can do this in swift:

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
