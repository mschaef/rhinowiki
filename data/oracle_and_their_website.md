title: Oracle and their website...
date: 2007-03-23
filename: ./tech/general/oracle_and_their_website.txt

My current day job involves devloping software that uses Oracle as its
back end.  I've built a local development environment on my laptop
using Oracle Express Edition, the freebie give-away version. To make a
long story short, I forgot my local database password and had to
uninstall, download, and re-install Oracle. To download Oracle, you
have to be logged into their website and of course, I had forgotten
that password too.

To save folks like me from themselves, Oracle has a password recovery
service in their website. This service works like most other similar
services: enter your e-mail address and it then resets your password
and sends the new one to your e-mail account. What their service does
not do is trim the leading and trailing spaces off of the entered
e-mail address. It just tries to look up whatever you entered in the
password database. If you happen to have a trailing space on your
address, it will not recognize it and not do the password reset. Since
the website uses a proportional font, and spaces are quite narrow,
it's easy to miss the error and you will likely be left wondering why
Oracle forgot your account. This seems perfectly in keeping with
Oracle's seeming effort to keep their site as obtuse as possible in
comparison with <a href="http://msdn.microsoft.com">Microsoft's
developer site</a>. Seriously guys, you sell a <i>platform</i>: Its
value is directly proportional to the number of developers coding for
it and the amount of code written to it. Make it as easy as possible,
and it will only help your bottom line. Microsoft understands this,
why don't you?
	
