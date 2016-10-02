title: Better Text for GDI Applications
date: 2005-05-17
filename: ./tech/general/vctext.txt

This is <a href="http://msdn.microsoft.com/library/default.asp?url=/library/en-us/gdi/fontext_1wmq.asp">well
documented on MSDN</a>, but it's still pretty cool.

I've never been happy with the text quality of the vCalc display: it's
jagged and at a font size that doesn't rasterize well on the displays
I have access to. Well, as it turns out, this is relatively easy to
fix. The LOGFONT structure that GDI uses to select fonts has a field,
lfQuality, that is used to select the quality of the text
rendering. Back in olden days, this field was used to do things like
disallow scaling of bitmap fonts (if you don't know what that is, be
thankful: it was awful). These days, it's used to turn on Antialiasing
and Cleartype (on winXP). Thus, this one line of code:...

```c
lf.lfQuality = CLEARTYPE_QUALITY;
```

...transformed this...

<img src="http://www.mschaef.com/vctext_before.jpg">

...into this.

<img src="http://www.mschaef.com/vctext_after.jpg">

There's also a setting for anti-aliasing:

```c
lf.lfQuality = ANTIALIAS_QUALITY;
```

Anti-aliasing (in Windows) dates back to the Windows 95 Plus pack, so
this setting should be much more widely supported. However, it's also
much less powerful: it doesn't do any of the sub-pixel stuff and it is
enabled far less often. In my experimentation, non-bold fonts had to
be pretty big before anti-aliasing was used at all.

The other caveat is that this doesn't automatically buy you decent
formatting of the text you display. That is, if you're still computing
text positioning on per-pixel increments, you'll still get mediocre
layout.  vCalc does this, but it also has very minimal text layout
requirements for now.
