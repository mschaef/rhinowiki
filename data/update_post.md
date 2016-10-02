title: Updating Posts
date: 2006-08-28
filename: ./tech/this_blog/update_post.txt

One of the 'downsides' of the way <a
href="http://www.blosxom.com/">Blosxom</a> is implemented is that is
relies on a post file's modification date to assign a date to the
post.  This makes editing files a little tricky: editing files on a
Unix box updates the modification date and therefore promotes the post
to the top of the blog.  I don't know if there's a better way to do
this, but I've written a little script that edits a file, making sure
to restore the previous modification date.

The implementation is pretty simple: it uses <tt>mktemp</tt> to create
a temporary file and <tt>touch -r</tt> to copy the modification dates
from the post file to the temporary file and back. Be sure to modify
the <tt>#!</tt> line to point to your installation of bash, should you
decide to use this script. A nice generalization of this script would
have it prompt for a description of the update and add the text to the
post.

```bash
#!/usr/local/bin/bash

if [ $# -ne 1 ]
then
  echo
  echo "This script expects a command line argument: the
  echo "name of the post to edit."
  exit 1
fi

DATE_MARKER=`mktemp /tmp/date_marker.XXXXXX` || exit 1

touch -r $1 ${DATE_MARKER}

${EDITOR} $1

touch -r ${DATE_MARKER} $1

rm ${DATE_MARKER}
```
