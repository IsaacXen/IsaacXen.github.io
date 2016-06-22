---
layout: post
title:  "Markdown 格式测试"
date:   2016-05-27 23:46:25
categories: jekyll update
---

测试一下 Solar 主题对 Markdown 的支持程度。

###  Headers

# This is an H1

## This is an H2

### This is an H3

#### This is an H4

##### This is an H5

###### This is an H6

### Blockquotes

> This is a blockquotes
>
> > Nested blockquotes

### Lists

#### Ordered list

1. Red
2. Green
3. Blue
   1. Nested Blue

#### Un-ordered list

* Red
* Green
* Blue
  * Nested Blue
    * Nested Blue

#### Nested list

1. Ordered
   * Un-Ordered

### <del>Task List</del>

- [ ] a task list item
- [ ] **another** task list *item*
- [x] completed item

### (Fenced) Code Blocks

This is a `Code Block`

```java
This is a Code block
public static void main() {
  String testingHighLight
} 
```

### <del>Math Blocks</del>

Here is an example of *LaTeX*:

$$\mathbf{V}_1 \times \mathbf{V}_2 =  \begin{vmatrix} \mathbf{i} & \mathbf{j} & \mathbf{k} \\\frac{\partial X}{\partial u} &  \frac{\partial Y}{\partial u} & 0 \\\frac{\partial X}{\partial v} &  \frac{\partial Y}{\partial v} & 0 \\\end{vmatrix}$$

### Tables

| First Header | Second Header |
| ------------ | ------------- |
| Content Cell | Content Cell  |
| Content Cell | Content Cell  |

| Left-Aligned  | Center Aligned  | Right Aligned |
| :------------ | :-------------: | ------------: |
| col 3 is      | some wordy text |         $1600 |
| col 2 is      |    centered     |           $12 |
| zebra stripes |    are neat     |            $1 |

### Footnotes

This is a [^footnote].

[^footnote]: Here is the *text* of the **footnote**.

### Horizontal Rules

---

### Links

This is [an example](http://example.com/ "Title") inline link.

[This link](http://example.net/) has no title attribute.

This is [an example][id] reference-style link.

Then, anywhere in the document, you define your link label like this, on a line by itself:

[id]: http://example.com/	"Optional Title Here"



[Google][]

And then define the link:

[Google]: http://google.com/

### URLs

`<i@typora.io>` becomes <i@typora.io>.

### Images

![Alt text](/images/2016-05-29.png)

![Alt text](/images/2016-05-29.png "Optional title")

### Emphasis

*single asterisks*

_single underscores_

\*this text is surrounded by literal asterisks\*

### Strong

**double asterisks**

__double underscores__

### Code

```markdown
Use the `printf()` function.
```

### Strikethrough

~~Mistaken text.~~

### Underline

Underline is powered by raw HTML.

`<u>Underline</u>` becomes <u>Underline</u>.

### Emoji :happy:

😊

### <del>Inline Math</del>

To use this feature, first, please enable it in `Preference` Panel -> `Markdown` Tab. Then use `$` to wrap TeX command, for example: `$\lim_{x \to \infty} \exp(-x) = 0$` will be rendered as LaTeX command. 

To trigger inline preview for inline math: input “$”, then press `ESC` key, then input TeX command, a preview tooltip will be visible like below:

$\lim_{x \to \infty} \exp(-x) = 0$

