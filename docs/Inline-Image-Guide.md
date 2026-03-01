# Inline Image Guide for Content Editors

## Overview

Strapi's built-in Blocks editor does not support inserting images inside rich text fields. To work around this, we use a simple text convention: you type a special tag in a paragraph, and the website automatically displays it as an image.

This works in **any rich text field** across the site: activity descriptions, project descriptions, member bios, project entry descriptions, etc.

---

## Basic Format

```
[IMAGE: image-url]
```

Type this on its **own line** (its own paragraph) in the Strapi Blocks editor.

### Where to find the image URL

1. Go to **Media Library** in Strapi
2. Click on the image you want to use
3. Copy the URL from the image details panel
   - It will look like: `https://helpful-wealth-0a46a9eabb.media.strapiapp.com/filename.png`

### Simple example

```
[IMAGE: https://helpful-wealth-0a46a9eabb.media.strapiapp.com/my-photo.png]
```

This displays the image at **medium size**, **centered** on the page.

---

## Full Format (with options)

```
[IMAGE: image-url | alt text | size | alignment]
```

| Parameter   | Required? | Description                          | Default  |
|-------------|-----------|--------------------------------------|----------|
| image-url   | Yes       | The full URL of the image            | -        |
| alt text    | No        | Description for accessibility        | (empty)  |
| size        | No        | How wide the image appears           | medium   |
| alignment   | No        | Where the image sits on the page     | center   |

### Size options

| Value    | Width        | Best for                        |
|----------|--------------|---------------------------------|
| `small`  | ~320px       | Logos, icons, small illustrations |
| `medium` | ~512px       | Standard photos, diagrams        |
| `large`  | ~672px       | Wide photos, banners             |
| `full`   | 100% width   | Full-width banners, hero images  |

### Alignment options

| Value    | Effect                          |
|----------|---------------------------------|
| `left`   | Image aligned to the left       |
| `center` | Image centered (default)        |
| `right`  | Image aligned to the right      |

---

## Examples

### Image with alt text only (medium, centered)

```
[IMAGE: https://helpful-wealth-0a46a9eabb.media.strapiapp.com/photo.png | Workshop participants]
```

### Small logo, right-aligned

```
[IMAGE: https://helpful-wealth-0a46a9eabb.media.strapiapp.com/logo.png | Project logo | small | right]
```

### Full-width banner, centered

```
[IMAGE: https://helpful-wealth-0a46a9eabb.media.strapiapp.com/banner.png | Event banner | full | center]
```

### Large photo, left-aligned

```
[IMAGE: https://helpful-wealth-0a46a9eabb.media.strapiapp.com/team.jpg | Team photo | large | left]
```

---

## Important Rules

1. **Own paragraph**: The `[IMAGE: ...]` tag must be the **only text** in its paragraph. Do not mix it with other text on the same line.

2. **No formatting**: Do not apply bold, italic, or any other formatting to the tag text. Type it as plain text.

3. **Square brackets required**: The tag starts with `[` and ends with `]`. Do not forget them.

4. **Pipe separator**: Use the `|` character (pipe) to separate the parameters. You can find it on your keyboard:
   - **Mac**: `Option + 7` or `Shift + \`
   - **Windows**: `AltGr + \` or `Shift + \`

5. **Spaces around pipes**: Spaces before and after `|` are optional but recommended for readability.

6. **Case insensitive**: `[IMAGE:`, `[image:`, `[Image:]` all work the same way.

---

## Quick Reference

```
Simplest:
[IMAGE: url]

With alt text:
[IMAGE: url | description]

With size:
[IMAGE: url | description | small]

Full control:
[IMAGE: url | description | large | right]
```

**Sizes**: `small` | `medium` | `large` | `full`
**Alignments**: `left` | `center` | `right`
