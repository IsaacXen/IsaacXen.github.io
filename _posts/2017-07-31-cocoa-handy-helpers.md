---
title: Cocoa Handy Helpers
summary: Some useful functions and extensions for macOS in Swift.
---

Some useful functions and extensions for macOS in Swift 4.

Update at anytime.

## AutoLayout

### Add constrains cleaner

```swift
extension NSView {

    /// Adds multiple constraints on the layout of the receiving view or its subviews.
    ///
    /// - Parameters:
    ///   - format: The format specification for the constraints. The keys of views must be the string values begin with a `v` and follow by number begin from 0.
    ///   - views: Views that appear in the visual format string. Begin from v0.
    func addConstrains(withVisualFormat format: String, views: NSView...) {
        var viewDictionary = [String: NSView]()

        for (index, view) in views.enumerated() {
            let key = "v\(index)"
            viewDictionary[key] = view

            view.translatesAutoresizingMaskIntoConstraints = false
        }

        addConstraints(NSLayoutConstraint.constraints(withVisualFormat: format, options: NSLayoutFormatOptions(), metrics: nil, views: viewDictionary))
    }

    /// Adds a constraint on the layout of the receiving view or its subviews.
    ///
    /// - Parameters:
    ///   - view1：The view for the left side of the constraint.
    ///   - attribute1：The attribute of the view for the left side of the constraint.
    ///   - relation: The relationship between the left side of the constraint and the right side of the constraint.
    ///   - view2: The view for the right side of the constraint.
    ///   - attribute2: The attribute of the view for the right side of the constraint.
    ///   - constant: The constant added to the multiplied attribute value on the right side of the constraint to yield the final modified attribute.
    ///   - multiplier: The constant multiplied with the attribute on the right side of the constraint as part of getting the modified attribute.
    func addConstrain(_ view1: Any, _ attribute1: NSLayoutAttribute, _ relation: NSLayoutRelation, to view2: Any?, _ attribute2: NSLayoutAttribute, plus constant: CGFloat = 0, multiply multiplier: CGFloat = 1) {
        if let itemView = item as? NSView {
            itemView.translatesAutoresizingMaskIntoConstraints = false
        }
        addConstraint(NSLayoutConstraint(item: view1, attribute: attribute1, relatedBy: relation, toItem: view2, attribute: attribute2, multiplier: multiplier, constant: constant))
    }
}
```

## FileManager

### Check if path is a file or directory

```swift
/// Check the given path is a file or a directory.
///
/// - Parameters:
///   - path: path of file to be check
/// - Returns: true for file and false for directory, nil if not exist
func isFile(at path: String) -> Bool? {
	var isDirectory: ObjCBool = false
	if FileManager.default.fileExists(atPath: path, isDirectory: &isDirectory) {
		return isDirectory.boolValue    
	}
	return nil
}
```

---

_References_

- [swift - Check if path is a directory in Swift2? - Stack Overflow](https://stackoverflow.com/a/37225557/6692025)
- [Swift: Facebook Messenger - Auto Layout Using Code or Programmatically (Ep 1)](https://www.youtube.com/watch?v=XtEoKixIfG4)
