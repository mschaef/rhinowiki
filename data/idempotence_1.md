title: Programming Well: Embrace Idempotence, Part 1
date: 2005-02-22
filename: ./tech/programming/idempotence/idempotence_1.txt

There's a good <a href="http://dictionary.reference.com/search?q=idempotent">
definition of the word idempotent</a> over on Dictinoary.com. In a nutshell, the
word is used to describe mathematical functions that satisfy the relationship
f(x)=f(f(x)): functions for which repeated applications produce the same result
as the first. For functions that satisfy this condition, you can rest assured
that you can apply the function as many times as you like, get the expected
result, and not screw anything up if you apply it more times than you 
absolutely need. This turns out to be a useful concept for people developing
software systems.

One of the most common examples of this is in C-style include files. It's common
practice to write code like this, to guard against multiple inclusions:


```c
#ifndef __HEADER_FILE_GUARD
#define __HEADER_FILE_GUARD

// ... declarations go here...

#endif __HEADER_FILE_GUARD
```

This idiomatic C code protects the include file against multiple
inclusions.  Include files with this style of guard can be included as
many times as you like with no ill effect.

The benefit to this is that it basically changes the meaning of the
code <tt>#include &lt;foo.h&gt</tt> from <i>"Include these
declarations"</i> to <i>"Ensure that these declarations have been
made"</i>. That's a much safer kind of statement to make since it
delgates the whole issue of multiple inclusions to a simple piece of
automated logic.

Of course, this is pretty commonplace. More is to come...
