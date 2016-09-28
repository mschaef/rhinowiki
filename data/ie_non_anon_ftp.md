title: Using Internet Explorer as a non-Anonymous FTP client
date: 2005-07-07
filename: ./tech/tips/ie_non_anon_ftp.txt

This is pretty <a href="http://www.cs.rutgers.edu/~watrous/user-pass-url.html">well
documented</a> online, but I can never seem to find it when I need it. So, I'm
putting it here too. 

Internet Explorer defaults to anonymous FTP, when sometimes you need to log in
with an explict username and password.  One of the lesser known features of URL's
is that they allow login information to be specified as part of a web address.

<code>ftp://<i>username</i>:<i>password</i>@hostname/</code>

The <code>:<i>password</i></code> part is optional, but sometimes
necessary. As the Rutgers site points out, there are security issues
involved with this, particularly on public terminals. That said, FTP
(RFC 959) sends passwords as <a
href="http://www.ayukov.com/essays/pkfa.html">unencrypted text</a>
anyway, so I wouldn't be using my most secure passwords to log into an
FTP site.

Also, Microsoft have a 
<a href="http://support.microsoft.com/default.aspx?scid=kb;en-us;Q135975">Knowledge
Base Article</a> that describes this in more detail, including a way to log in
from a menu command, if you have the right settings enabled.
