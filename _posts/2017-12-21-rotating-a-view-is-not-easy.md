---
layout: post
series: Cocoa Quicknote
title: Rotating a View Is Simple Not Easy
tags: [cocoa, macos, swift, nsview, appkit]
---

So I was asked to do a easy feature recently, provide two button to rotate a image view 90 degree clockwise or counterclockwise with animation. How hard could it be?

NSView provide a handy variable called `frameCenterRotation`, which define the rotation angle of the view around the underlying layer’s anchorPoint.

This is also an animatable property, so all we need is to set `frameCenterRotation` using `animator()`:

```swift
imageView.animator().frameCenterRotation += 90
```

Easy piece of cake.

![Weird Rotate Animation](/assets/img/2017-12-21-rotating-a-view-is-not-easy-01.gif)

## Wait, what?

Let's slow it down for a little bit:

![Weird Rotate Animation in Slow-Mo](/assets/img/2017-12-21-rotating-a-view-is-not-easy-02.gif)

It looks like the layer's anchorPoint is also animated from `0` to `0.5`, which should be `0.5` by default as suggested in [this document](https://developer.apple.com/documentation/quartzcore/calayer/1410817-anchorpoint):

> ... The default value of this property is (0.5, 0.5), which represents the center of the layer’s bounds rectangle.

Even if you change the anchorPoint manually to `0.5`:

```swift
let layer = imageView.layer
print(layer.anchorPoint) // out: (0, 0)

layer.anchorPoint = CGPoint(x: 0.5, y: 0.5)
print(layer.anchorPoint) // out: (0.5, 0.5)

imageView.animator().frameCenterRotation += 90

print(layer.anchorPoint) // out: (0, 0)
```
It changes it back to `0`.

This lead us to a conclusion:

> The Cake Is a Lie

The best guess is that when calling `frameCenterRotation`, `NSView` first move the anchorPoint to the center, then it do the rotation, and move anchorPoint back to where it was.

## The Workaround

Calling `frameCenterRotation` is a death end, now we need to find a way to rotate it on our own.

Luckily, we can do this by setting layer's transform property:

```swift
let rotation = CATransform3DMakeRotation(n * CGFloat.pi / 2, 0, 0, 1) // `n` is a `CGFloat` value of `1`
imageView.animator().layer?.transform = rotation
n += 1
```

![Rotate but without animation](/assets/img/2017-12-21-rotating-a-view-is-not-easy-03.gif)

It rotate! But not about its center, and there's no animation. We still need to change the anchorPoint to center:

```swift
layer.anchorPoint = CGPoint(x: 0.5, y: 0.5)
```

![Rotate about center...but not center](/assets/img/2017-12-21-rotating-a-view-is-not-easy-04.gif)

Now it do rotate about layer's center, but it jumps to bottom left, the origin point of its frame. To fix this, we need to also change its position:

```swift
layer.position = CGPoint(x: layer.frame.midX, y: layer.frame.midY)
```

![Rotate about center](/assets/img/2017-12-21-rotating-a-view-is-not-easy-05.gif)

What about the animation? We already use `animator()` to animate the property changes?

That is because, by default, [AppKit disables implicit animations for its layer-backed views](https://developer.apple.com/library/content/documentation/Cocoa/Conceptual/CoreAnimation_guide/CreatingBasicAnimations/CreatingBasicAnimations.html#//apple_ref/doc/uid/TP40004514-CH3-SW18). Since we are animating layer properties directly, we need to programmatically reenable implicit animations in current context:

```swift
NSAnimationContext.current.allowsImplicitAnimation = true
```

![A prefect rotation](/assets/img/2017-12-21-rotating-a-view-is-not-easy-06.gif)

Now that's what I called a rotation!

## Complete Code

```swift
var n: CGFloat = 1

func rotate(_ sender: NSButton) {
    if let layer = imageView.layer, let animatorLayer = imageView.animator().layer {
        layer.position = CGPoint(x: layer.frame.midX, y: layer.frame.midY)
        layer.anchorPoint = CGPoint(x: 0.5, y: 0.5)

        NSAnimationContext.beginGrouping()
        NSAnimationContext.current.allowsImplicitAnimation = true
        animatorLayer.transform = CATransform3DMakeRotation(n * CGFloat.pi / 2, 0, 0, 1)
        NSAnimationContext.endGrouping()

        n += 1
    }
}
```
