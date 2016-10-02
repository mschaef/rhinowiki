title: UseHR, High Resolution Displays, and the Internet
date: 2005-06-30
filename: ./tech/general/usehr_and_the_web.txt

For a few years, I used this graphic as the front matter for my
website:

<center>
  <img src="http://www.mschaef.com/pics\p_intro.png" width="494" height="70" alt="michael.schaeffer" class="borderless">
</center>

This, the logo for my website, is basically just antialiased text
rendered into a bitmap. At the time, it seemed like a good idea to
render the text as a bitmap because I didn't trust the browser to
render it for me.  Bad idea.

As it turns out, <a
href="http://msdn.microsoft.com/library/default.asp?url=/workshop/author/dhtml/overview/highdpi.asp">Internet
Explorer</a> rescales bitmaps on high resolution displays. This is a
somewhat misguided attempt to make keep bitmap sizing
consistent. Bitmaps aren't rendered at 1/1 zoom, they are rendered at
screen_dpi/96dpi. On non-96dpi screens, that results in ugly
scaling. While <a
href="http://www.nigelcoldwell.co.uk/userhr/">scaling can be
disabled</a>, that's not the ideal solution.  The ideal solution is to
do as much of the rendering as possible in the browser: which should
know more about the client's display than the server. Therefore, my
logo is now CSS formatted plain text. That means it looks the right
size on more screens, anti-aliases appropriately, uses ClearType if
it's available. The next step is going to be to switch from pixel
sizes to 'real' sizes.
