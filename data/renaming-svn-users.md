title: Renaming historical users (svn:author's) in SVN repositories
date: 2008-02-11
filename: ./tech/programming/renaming-svn-users.txt


I've been keeping track of the vCalc source code in an SVN repository
since May of 2005. While I'm the only person who has ever committed
code into the repository, I've developed vCalc on three or four
machines, with different usernames on each machine. Since SVN records
usernames with each commit, these historical usernames show up in each
<a href="http://svnbook.red-bean.com/en/1.0/re15.html"><tt>svn
log</tt></a> or <a
href="http://svnbook.red-bean.com/en/1.0/re02.html"><tt>svn
blame</tt></a>. <tt>svn blame</tt> is particularly bad because it
displays a code listing with the username prepended to each line in a
fixed width gutter. With some usernames longer than others, usernames
that are very long can exceed the width of the gutter and push the
code over to the right.  Fortunately, changing historical usernames
isn't that hard, if you have administrator rights on your SVN
repository.

SVN stores the name of a revision's committer in a <a
href="http://svnbook.red-bean.com/en/1.4/svn.advanced.props.html">revision
property</a> named <tt>svn:author</tt>. If you're not familar with the
term, a revision property is a blob of out of band data that SVN
attaches to the revision. In addition to the author of a commit,
they're also used to store the commit log message, and, via SVN's <a
href="http://svnbook.red-bean.com/en/1.0/re23.html"><tt>propset</tt></a>
and <a
href="http://svnbook.red-bean.com/en/1.0/re21.html"><tt>propget</tt></a>
commands, user-provided custom metadata for the revision. Changing the
name of a user associated with a commit basically amounts to using
<tt>propset</tt> to update the <tt>svn:author</tt> property for a
revision. The command to do this is structured like so:

<code>
svn propset svn:author --revprop -r<i>rev-number</i> <i>new-username</i> <i>repository-URL</i>
</code>

If this works, you are all set, but what is more likely to happen
is the following error:

<code>
svn: Repository has not been enabled to accept revision propchanges;
ask the administrator to create a pre-revprop-change hook
</code>

By default, revision property changes are disabled. This makes
sense if you are at all interested in using your source code
control system to satisfy an auditing requirement. Changing the
author of a commit would be a great way for a developer to cover
their tracks, if they were interested in doing something
underhanded. Also, unlike most other aspects of a project managed
in SVN, <i>revision properties have no change tracking</i>: They
are the change tracking mechanism for everything else.  Because
of the security risks, enabling changes to revision properties
requires establishment of a guard hook: an external procedure
that is consulted whenever someone requests that a revision
property be changed. Any policy decisions about who can change
what revision property when are implemented in the hook
procedure.

Hooks in SVN are stored in the <tt>hooks/</tt> directory under
the repository toplevel. Conveniently, SVN provides a sample
implementation on the hook we need to implement in the shell script
<tt>pre-revprop-change.tmpl</tt>, but the sample implementation
also has strict defaults about what can be changed, allowing only
the log message to be set:

```bash
if [ "$ACTION" = "M" -a "$PROPNAME" = "svn:log" ]; then exit 0; fi

echo "Changing revision properties other than svn:log is prohibited" > &2
exit 1
```

The sample script can be enabled by renaming it to
<tt>pre-revprop-change</tt>. It can be made considerably more lax
by adding an <tt>exit 0</tt> before the lines I list above. At
this point, the property update command should work, although if
you're at all interested in the security of your repository, it
is best to restore whatever revision property policy was in place
as soon as possible.

