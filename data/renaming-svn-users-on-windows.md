title: Renaming SVN Users on Windows
date: 2008-02-22
filename: ./tech/programming/renaming-svn-users-on-windows.txt

The instructions I gave earlier on <a 
href="http://www.mschaef.com/blog/tech/programming/renaming-svn-users.html">Renaming 
SVN Users</a> work only when the SVN repository is hosted on a machine that can run 
SVN hooks written in Unix style shell script. On a conventional Windows machine, one 
without Cygwin, MSYS, or similar, you have to switch to writing hooks in something 
like Windows batch language. 

If all you want to do is temporarily rename users, then you can just create an empty 
file named <tt>pre-revprop-change.cmd</tt> in your repository under <tt>hooks\</tt>. 
The default return code from a batch file is success, which SVN interprets as a 
<b>all</b> revision 
property changes, all the time, by anybody. If you want to implement an actual policy, 
Philibert Perusse has posted a <a 
href="http://svn.haxx.se/users/archive-2006-03/0107.shtml">template script</a> online.
