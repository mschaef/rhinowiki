title: A Better Workflow
date: 2009-09-12
filename: ./tech/this_blog/better_workflow.txt

It took long enough, but finally, I've taken the time to set up
a better workflow for this blog:

* The master copy of the blog contents is no longer on the server. It's
  now on one of my personal machines.
  
* <s>I'm managing site history using <a href="http://www.git-scm.com/"><tt>git</tt>
  </a>.</s> This was a nice idea, but <tt>git</tt> and 
  <a href="http://www.blosxom.com/"><tt>blosxom</tt></a> have a fundamental difference
  of opinion on the importance of file datestamps. <tt>blosxom</tt> relies on datestamps
  to assign dates to posts and <tt>git</tt> deliberately updates datestamps to work with
  build systems. There are ways to reconcile the two, but it's not worth the time right now.
  
* Uploads to the server are done with
  <a href="http://www.samba.org/rsync/"><tt>rsync</tt></a> invoked through
  a makefile. (ssh's public key authentication makes this blazingly fast and easy.)

Maybe now, I'll finally get around to writing a little more. <i>(Or, I could
investigate incorporating <a href="http://daringfireball.net/projects/markdown/">
Markdown</a>, or the <a href="http://baselinecss.com/">Baseline CSS Framework</a>,
or....)</i>
